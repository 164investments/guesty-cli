-- Guesty CLI team token cache
--
-- Run this once in the SQL editor of a Supabase project your team owns. A
-- dedicated project is best. Running it again is safe and applies upgrades.
--
-- What it sets up:
--   * A scheduled job that requests a Guesty token only when the cached one is
--     within an hour of expiring, so the whole team uses about one token a day
--     instead of one per person. Guesty allows five per rolling 24 hours.
--   * A cap on token requests per rolling 24 hours (default 3) and a pause
--     after a failed request, so a broken setup cannot lock the account out.
--   * Personal access keys. Each member reads the shared token through
--     public.guesty_cli_token with the project's publishable key and their own
--     access key; they never see the Guesty credentials.
--
-- After running it, store the Guesty credentials in Vault (Integrations ->
-- Vault in the dashboard) under these names, then follow the README:
--   guesty_openapi_client_id, guesty_openapi_client_secret
--   guesty_beapi_client_id, guesty_beapi_client_secret   (booking engine, optional)
--
-- Admin commands:
--   select * from guesty_cli.status;                      -- token and request health
--   select guesty_cli.refresh_due_tokens();               -- request any due token now
--   select guesty_cli.create_access_key('Alex');          -- prints a new member key once
--   select guesty_cli.revoke_access_key('Alex');
--   select guesty_cli.refresh_token('openapi', true);     -- replace a token Guesty rejected
--   update guesty_cli.settings set max_requests_per_day = 4;

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;
create extension if not exists supabase_vault with schema vault;

create schema if not exists guesty_cli;
revoke all on schema guesty_cli from public, anon, authenticated;

create table if not exists guesty_cli.token_endpoints (
  token_type text primary key check (token_type in ('openapi', 'beapi')),
  token_url text not null,
  scope text not null
);

insert into guesty_cli.token_endpoints (token_type, token_url, scope) values
  ('openapi', 'https://open-api.guesty.com/oauth2/token', 'open-api'),
  ('beapi', 'https://booking.guesty.com/oauth2/token', 'booking_engine:api')
on conflict (token_type) do nothing;

create table if not exists guesty_cli.settings (
  id boolean primary key default true check (id),
  -- Request a replacement once the cached token has less than this left.
  refresh_before interval not null default '1 hour',
  -- Every request counts, including failures: a timed-out request may still
  -- have used one of Guesty's five daily tokens.
  max_requests_per_day integer not null default 3 check (max_requests_per_day between 1 and 5),
  retry_after_failure interval not null default '30 minutes',
  retry_after_rate_limit interval not null default '2 hours'
);

insert into guesty_cli.settings default values on conflict (id) do nothing;

create table if not exists guesty_cli.tokens (
  id bigint generated always as identity primary key,
  token_type text not null references guesty_cli.token_endpoints (token_type),
  access_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists tokens_type_expiry_idx on guesty_cli.tokens (token_type, expires_at desc);

create table if not exists guesty_cli.token_requests (
  id bigint generated always as identity primary key,
  token_type text not null references guesty_cli.token_endpoints (token_type),
  requested_at timestamptz not null default clock_timestamp(),
  succeeded boolean not null default false,
  http_status integer,
  detail text
);

create index if not exists token_requests_type_time_idx on guesty_cli.token_requests (token_type, requested_at desc);

create table if not exists guesty_cli.access_keys (
  id bigint generated always as identity primary key,
  label text not null,
  key_sha256 text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists access_keys_active_label_idx on guesty_cli.access_keys (label) where revoked_at is null;

alter table guesty_cli.token_endpoints enable row level security;
alter table guesty_cli.settings enable row level security;
alter table guesty_cli.tokens enable row level security;
alter table guesty_cli.token_requests enable row level security;
alter table guesty_cli.access_keys enable row level security;
revoke all on all tables in schema guesty_cli from public, anon, authenticated;

create or replace function guesty_cli.vault_secret(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  -- Trailing whitespace from a pasted credential would fail every request.
  select nullif(btrim(decrypted_secret, E' \t\r\n'), '')
  from vault.decrypted_secrets
  where name = p_name
  order by updated_at desc
  limit 1;
$$;

create or replace function guesty_cli.refresh_token(p_token_type text, p_force boolean default false)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_settings guesty_cli.settings;
  v_endpoint guesty_cli.token_endpoints;
  v_client_id text;
  v_client_secret text;
  v_recent integer;
  v_last guesty_cli.token_requests;
  v_pause interval;
  v_request_id bigint;
  v_started_at timestamptz;
  v_response extensions.http_response;
  v_access_token text;
  v_expires_in double precision;
begin
  -- The cron job and an admin may run this at the same time; only one may
  -- decide whether to request a token.
  perform pg_advisory_xact_lock(hashtext('guesty_cli.refresh_token'), hashtext(p_token_type));

  select * into v_endpoint from guesty_cli.token_endpoints where token_type = p_token_type;
  if not found then
    return format('unknown token type %L; use openapi or beapi', p_token_type);
  end if;
  select * into strict v_settings from guesty_cli.settings;

  if not p_force and exists (
    select 1 from guesty_cli.tokens
    where token_type = p_token_type and expires_at > now() + v_settings.refresh_before
  ) then
    return 'fresh';
  end if;

  v_client_id := guesty_cli.vault_secret(format('guesty_%s_client_id', p_token_type));
  v_client_secret := guesty_cli.vault_secret(format('guesty_%s_client_secret', p_token_type));
  if v_client_id is null or v_client_secret is null then
    return format('not configured: add guesty_%1$s_client_id and guesty_%1$s_client_secret to Vault', p_token_type);
  end if;

  select count(*) into v_recent
  from guesty_cli.token_requests
  where token_type = p_token_type and requested_at > now() - interval '24 hours';
  if v_recent >= v_settings.max_requests_per_day then
    return format('limit reached: %s token requests in the last 24 hours (max_requests_per_day is %s)',
      v_recent, v_settings.max_requests_per_day);
  end if;

  select * into v_last
  from guesty_cli.token_requests
  where token_type = p_token_type
  order by requested_at desc
  limit 1;
  if found and not v_last.succeeded then
    v_pause := case when v_last.http_status = 429
      then v_settings.retry_after_rate_limit
      else v_settings.retry_after_failure end;
    if v_last.requested_at > now() - v_pause then
      return format('waiting: the last token request failed at %s', v_last.requested_at);
    end if;
  end if;

  -- This row must commit even when the request fails, because the limit and
  -- the pause depend on it. Nothing after this point may raise.
  v_started_at := clock_timestamp();
  insert into guesty_cli.token_requests (token_type, requested_at)
  values (p_token_type, v_started_at)
  returning id into v_request_id;

  begin
    -- The default five-second timeout can abandon a request Guesty completes.
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '20000');
    v_response := extensions.http((
      'POST',
      v_endpoint.token_url,
      array[extensions.http_header('Accept', 'application/json')],
      'application/x-www-form-urlencoded',
      'grant_type=client_credentials'
        || '&scope=' || extensions.urlencode(v_endpoint.scope::varchar)
        || '&client_id=' || extensions.urlencode(v_client_id::varchar)
        || '&client_secret=' || extensions.urlencode(v_client_secret::varchar)
    )::extensions.http_request);
    perform extensions.http_reset_curlopt();
  exception when others then
    perform extensions.http_reset_curlopt();
    update guesty_cli.token_requests
    set detail = left('request failed: ' || replace(sqlerrm, v_client_secret, '[redacted]'), 300)
    where id = v_request_id;
    return 'request failed; see guesty_cli.token_requests';
  end;

  if v_response.status <> 200 then
    update guesty_cli.token_requests
    set http_status = v_response.status, detail = 'Guesty did not issue a token'
    where id = v_request_id;
    return format('Guesty returned HTTP %s', v_response.status);
  end if;

  begin
    v_access_token := v_response.content::jsonb ->> 'access_token';
    v_expires_in := (v_response.content::jsonb ->> 'expires_in')::double precision;
  exception when others then
    v_access_token := null;
  end;
  if v_access_token is null or v_access_token !~ '^\S+$' or v_expires_in is null or v_expires_in <= 0 then
    update guesty_cli.token_requests
    set http_status = 200, detail = 'Guesty returned an unexpected token response'
    where id = v_request_id;
    return 'unexpected token response; see guesty_cli.token_requests';
  end if;

  -- Expiry counts from before the request, so it is never later than Guesty's.
  insert into guesty_cli.tokens (token_type, access_token, expires_at)
  values (p_token_type, v_access_token, v_started_at + make_interval(secs => v_expires_in));
  update guesty_cli.token_requests set succeeded = true, http_status = 200 where id = v_request_id;
  delete from guesty_cli.tokens where token_type = p_token_type and expires_at < now() - interval '1 day';
  return 'refreshed';
end;
$$;

create or replace function guesty_cli.refresh_due_tokens()
returns table (token_type text, outcome text)
language plpgsql
set search_path = ''
as $$
declare
  v_type text;
begin
  for v_type in
    select e.token_type from guesty_cli.token_endpoints e
    where guesty_cli.vault_secret(format('guesty_%s_client_id', e.token_type)) is not null
      and guesty_cli.vault_secret(format('guesty_%s_client_secret', e.token_type)) is not null
    order by e.token_type desc
  loop
    token_type := v_type;
    outcome := guesty_cli.refresh_token(v_type);
    return next;
  end loop;
end;
$$;

create or replace function guesty_cli.create_access_key(p_label text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
  v_key text;
begin
  if v_label = '' then
    raise exception 'Give the access key a label, such as the team member''s name.';
  end if;
  if exists (select 1 from guesty_cli.access_keys where label = v_label and revoked_at is null) then
    raise exception 'An active access key named % already exists. Revoke it first with guesty_cli.revoke_access_key.', v_label;
  end if;
  -- Two random UUIDs give 244 random bits.
  v_key := 'gtc_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into guesty_cli.access_keys (label, key_sha256)
  values (v_label, encode(sha256(convert_to(v_key, 'UTF8')), 'hex'));
  return v_key;
end;
$$;

create or replace function guesty_cli.revoke_access_key(p_label text)
returns integer
language sql
set search_path = ''
as $$
  with revoked as (
    update guesty_cli.access_keys set revoked_at = now()
    where label = btrim(p_label) and revoked_at is null
    returning 1
  )
  select count(*)::integer from revoked;
$$;

create or replace view guesty_cli.status as
select
  e.token_type,
  guesty_cli.vault_secret(format('guesty_%s_client_id', e.token_type)) is not null
    and guesty_cli.vault_secret(format('guesty_%s_client_secret', e.token_type)) is not null as configured,
  (select max(t.expires_at) from guesty_cli.tokens t where t.token_type = e.token_type) as token_expires_at,
  (select count(*) from guesty_cli.token_requests r
    where r.token_type = e.token_type and r.requested_at > now() - interval '24 hours') as requests_last_24h,
  last.requested_at as last_request_at,
  last.succeeded as last_request_succeeded,
  last.http_status as last_request_http_status,
  last.detail as last_request_detail
from guesty_cli.token_endpoints e
left join lateral (
  select r.* from guesty_cli.token_requests r
  where r.token_type = e.token_type
  order by r.requested_at desc
  limit 1
) last on true;

revoke all on all functions in schema guesty_cli from public, anon, authenticated;
revoke all on guesty_cli.status from public, anon, authenticated;

-- The only function the CLI calls. It runs as its owner so members never get
-- access to the guesty_cli schema itself.
create or replace function public.guesty_cli_token(p_access_key text, p_token_type text default 'openapi')
returns table (token_type text, access_token text, expires_at bigint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key_id bigint;
begin
  update guesty_cli.access_keys k
  set last_used_at = now()
  where k.key_sha256 = encode(sha256(convert_to(coalesce(p_access_key, ''), 'UTF8')), 'hex')
    and k.revoked_at is null
  returning k.id into v_key_id;
  if v_key_id is null then
    raise exception 'The Guesty team cache access key is missing, wrong, or revoked.'
      using errcode = '28000';
  end if;

  return query
  select t.token_type, t.access_token, (extract(epoch from t.expires_at) * 1000)::bigint
  from guesty_cli.tokens t
  where t.token_type = p_token_type and t.expires_at > now()
  order by t.expires_at desc
  limit 1;
end;
$$;

revoke all on function public.guesty_cli_token(text, text) from public;
grant execute on function public.guesty_cli_token(text, text) to anon, authenticated;

select cron.schedule('guesty-cli-refresh-tokens', '*/10 * * * *', 'select guesty_cli.refresh_due_tokens()');
