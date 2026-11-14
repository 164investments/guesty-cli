// The scenarios the Node fixtures (test/fixtures/*-runtime.mjs) played inside
// the Node CLI, replayed for the Rust binary: the same environment, the same
// private files, the same replies to each request, and a trace of the same
// shape, built from the mock's requests, the binary's trace and file snapshots.
import { now, runCli } from "./cli.mjs";

const pick = (replies, index) => replies[Math.min(index, replies.length - 1)];

/** A UTF-8 request body as a string; anything else as undefined (see `bodyBase64`). */
function textBody(body) {
  if (!body.length) return undefined;
  const text = body.toString("utf8");
  return Buffer.from(text, "utf8").equals(body) ? text : undefined;
}

/** `{ ...env }` where null removes a variable. */
function applyEnv(target, changes = {}) {
  for (const [key, value] of Object.entries(changes)) target[key] = value;
  return target;
}

// ─── test/fixtures/mock-runtime.mjs (auth tests) ─────────────────────────────

export const fakeServiceKey = `gts_${"F".repeat(43)}`;

export async function runAuthScenario(t, args, scenario = {}) {
  const env = {
    GUESTY_CLIENT_ID: "fake-client-id-must-not-be-used",
    GUESTY_CLIENT_SECRET: "fake-client-secret-must-not-be-used",
    SUPABASE_URL: "https://cache.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fake-cache-key-must-not-be-printed",
  };
  if (scenario.noConfig) applyEnv(env, { SUPABASE_URL: null, SUPABASE_SERVICE_ROLE_KEY: null });
  if (scenario.team) {
    applyEnv(env, { GUESTY_TOKEN_SERVICE_URL: "https://team-cache.invalid", GUESTY_TOKEN_SERVICE_KEY: fakeServiceKey });
    applyEnv(env, scenario.teamEnv);
  }
  const token = scenario.diskError ? { dir: true }
    : scenario.diskRaw !== undefined ? scenario.diskRaw
    : JSON.stringify(scenario.disk ?? { token: null });
  let sharedIndex = 0, teamIndex = 0, apiIndex = 0;
  const result = await runCli(t, {
    args,
    stdin: scenario.stdin,
    env,
    home: {
      ".guesty-cli/.env": "",
      ".guesty-cli/token.json": token,
      ".guesty-cli/update-check.json": JSON.stringify({ lastCheck: now, latestVersion: "0.0.0" }),
    },
    handle(request) {
      const url = new URL(request.url);
      const teamRequest = url.pathname === "/v1/token";
      if (url.hostname === "team-cache.invalid" && url.pathname === "/v1/teams") return { status: 201, json: scenario.teamCreate ?? {} };
      if (teamRequest && ["team-cache.invalid", "127.0.0.1"].includes(url.hostname)) {
        if (request.method !== "POST" || scenario.teamError) return { throw: true };
        if (scenario.teamRaw !== undefined) return { raw: scenario.teamRaw, headers: { "content-type": "text/plain;charset=UTF-8" } };
        const replies = scenario.teamReplies ?? [{ status: scenario.teamStatus ?? 200, body: scenario.teamBody ?? {} }];
        const reply = pick(replies, teamIndex++);
        return { status: reply.status, json: reply.body };
      }
      if (url.hostname === "cache.invalid" && url.pathname === "/rest/v1/guesty_tokens") {
        if (request.method !== "GET" || scenario.sharedError) return { throw: true };
        if (scenario.sharedRaw !== undefined) return { raw: scenario.sharedRaw, headers: { "content-type": "text/plain;charset=UTF-8" } };
        const replies = scenario.sharedReplies ?? [scenario.shared ?? []];
        return { status: scenario.sharedStatus ?? 200, json: pick(replies, sharedIndex++) };
      }
      if (url.hostname === "open-api.guesty.com" && url.pathname === "/v1/listings") {
        const status = pick(scenario.apiStatuses ?? [200], apiIndex++);
        return { status, json: status === 200 ? { results: [] } : { error: "fake-secret-in-auth-error" } };
      }
      return { throw: true };
    },
  });
  const trace = {
    requests: result.requests.map((request) => {
      const url = new URL(request.url);
      const teamRequest = url.pathname === "/v1/token";
      return {
        url: request.url,
        method: request.method,
        authorization: url.hostname === "open-api.guesty.com" || teamRequest ? request.headers.authorization : undefined,
        body: teamRequest ? JSON.parse(request.body.toString("utf8")) : undefined,
        timeout: typeof request.timeoutMs === "number",
      };
    }),
    writes: result.writes.map(({ path }) => path),
    tokenReads: result.tokenReads,
  };
  return { ...result, trace };
}

// ─── test/fixtures/isolated-runtime.mjs (client, io, booking engine, update) ─

const isolatedToken = (type, value) => ({ token_type: type, access_token: value, expires_at: now + 36_000_000 });

export async function runIsolatedScenario(t, { args = [], scenario = {}, stdin, tty } = {}) {
  const env = {
    SUPABASE_URL: "https://cache.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fake-isolated-cache-key",
    GUESTY_CLIENT_ID: "fake-unused-client-id",
    GUESTY_CLIENT_SECRET: "fake-unused-client-secret",
    // The fixture made the installed version 1.0.0 unless the scenario named one.
    GUESTY_TEST_VERSION: scenario.localVersion ?? "1.0.0",
  };
  if (scenario.noConfig) applyEnv(env, { SUPABASE_URL: null, SUPABASE_SERVICE_ROLE_KEY: null });
  applyEnv(env, scenario.env);

  const home = {
    ".guesty-cli/.env": scenario.envFiles?.home ?? "",
    ".guesty-cli/token.json": JSON.stringify({ token: scenario.noDisk ? null : isolatedToken("openapi", "fake-isolated-openapi-token") }),
  };
  if (scenario.checkData !== undefined) {
    home[".guesty-cli/update-check.json"] = typeof scenario.checkData === "string" ? scenario.checkData : JSON.stringify(scenario.checkData);
  }
  const cwd = { ".env": scenario.envFiles?.cwd };
  // --data-file and --output paths become files in the run's working directory.
  if (scenario.inputPath) cwd["input.bin"] = Buffer.from(scenario.inputBase64, "base64");
  const mappedArgs = args.map((arg) => arg === scenario.outputPath ? "output.bin" : arg === scenario.inputPath ? "input.bin" : arg);

  // Self-update runs from an installed package: <global npm root>/guesty-cli/dist/bin.js,
  // or (globalMismatch) a separate package while the global root holds another copy.
  const selfUpdate = args[0] === "update";
  const packageFiles = {};
  if (scenario.envFiles?.script !== undefined) packageFiles[".env"] = scenario.envFiles.script;
  if (selfUpdate) {
    packageFiles["package.json"] = JSON.stringify({ name: "guesty-cli", version: scenario.localVersion ?? "1.0.0" });
    if (scenario.sourceCheckout !== false) packageFiles[".git"] = { dir: true };
  }

  let apiIndex = 0, bookingIndex = 0, sharedIndex = 0, beapiIndex = 0;
  const result = await runCli(t, {
    args: mappedArgs,
    stdin,
    tty,
    env,
    home,
    cwd,
    packageFiles: Object.keys(packageFiles).length ? packageFiles : undefined,
    global: selfUpdate && !scenario.globalMismatch,
    otherGlobal: selfUpdate && scenario.globalMismatch,
    npm: { installFails: scenario.installFails, installedVersion: scenario.installedVersion, installedMissingEntry: scenario.installedMissingEntry },
    fastTimers: scenario.fastTimers,
    handle(request) {
      const url = new URL(request.url);
      const tokens = url.hostname === "cache.invalid" && url.pathname === "/rest/v1/guesty_tokens" && request.method === "GET";
      if (url.hostname === "open-api.guesty.com" && url.pathname.startsWith("/v1/") && !/oauth/i.test(url.pathname)) {
        if (scenario.paginationCount !== undefined) {
          const skip = Number(url.searchParams.get("skip"));
          const limit = Number(url.searchParams.get("limit"));
          const results = Array.from({ length: Math.min(limit, Math.max(0, scenario.paginationCount - skip)) }, (_, index) => ({ _id: String(skip + index) }));
          return { json: { results, count: scenario.paginationCount, skip, limit } };
        }
        return pick(scenario.responses ?? [{ json: { results: [] } }], apiIndex++);
      }
      if (url.hostname === "booking.guesty.com" && url.pathname.startsWith("/api/") && !/oauth/i.test(url.pathname)) {
        return pick(scenario.bookingResponses ?? [{ json: { ok: true } }], bookingIndex++);
      }
      if (tokens && url.searchParams.get("token_type") === "eq.beapi") {
        return { json: pick(scenario.beapiSharedReplies ?? [[isolatedToken("beapi", "fake-isolated-beapi-token")]], beapiIndex++) };
      }
      if (url.href === "https://api.github.com/repos/164investments/guesty-cli/releases/latest") {
        return scenario.github ?? { status: 404, json: {} };
      }
      if (tokens && url.searchParams.get("token_type") === "eq.openapi") {
        return { json: pick(scenario.sharedReplies ?? [[isolatedToken("openapi", "fake-isolated-openapi-token")]], sharedIndex++) };
      }
      return { throw: true };
    },
  });
  const trace = {
    requests: result.requests.map((request) => ({
      url: request.url,
      at: request.at,
      method: request.method,
      headers: request.headers,
      body: textBody(request.body),
      bodyBase64: request.body.length && textBody(request.body) === undefined ? request.body.toString("base64") : undefined,
      timeout: typeof request.timeoutMs === "number",
    })),
    waits: result.waits,
    writes: result.writes,
    commands: result.commands,
    tokenReads: result.tokenReads,
    beapiCacheReads: result.requests.filter(({ url }) => new URL(url).hostname === "cache.invalid" && new URL(url).searchParams.get("token_type") === "eq.beapi").length,
    timeouts: result.timeouts,
  };
  return { ...result, trace };
}

// ─── test/fixtures/api-command-runtime.mjs (api-commands tests) ──────────────

export async function runApiContractScenario(t, args) {
  const result = await runCli(t, {
    args,
    env: { SUPABASE_URL: null, SUPABASE_SERVICE_ROLE_KEY: null, GUESTY_CLIENT_ID: null, GUESTY_CLIENT_SECRET: null },
    home: {
      ".guesty-cli/.env": "",
      ".guesty-cli/token.json": JSON.stringify({ token: { access_token: "fake-openapi-token", token_type: "openapi", expires_at: now + 3_600_000 } }),
      ".guesty-cli/update-check.json": JSON.stringify({ lastCheck: now, latestVersion: "0.0.0" }),
    },
    handle(request) {
      const url = new URL(request.url);
      if (url.hostname !== "open-api.guesty.com" || !url.pathname.startsWith("/v1/") || /oauth/i.test(url.pathname)) return { throw: true };
      return { json: { ok: true } };
    },
  });
  const trace = {
    requests: result.requests.map((request) => ({
      url: request.url,
      method: request.method,
      body: !request.body.length ? undefined : request.multipart ? "binary" : textBody(request.body) ?? "binary",
      // Was the content-type the CLI passed to fetch (null: fetch set the boundary).
      // On the wire, the boundary must match the body, which `multipart` proves.
      ...(request.multipart ? { multipart: request.multipart, contentType: request.headers["content-type"].split(";")[0] } : {}),
    })),
    writes: result.writes.map(({ path }) => path),
    tokenReads: result.tokenReads,
  };
  return { ...result, trace };
}

// ─── test/fixtures/reservation-runtime.mjs (calendar, reservations) ──────────

export async function runReservationScenario(t, args, { replies, stdin = "" } = {}) {
  let replyIndex = 0;
  let sharedIndex = 0;
  const shared = [[{ token_type: "openapi", access_token: "fake-resource-token", expires_at: 1_800_003_600_000 }]];
  const resources = [];
  const result = await runCli(t, {
    args,
    stdin,
    env: {
      GUESTY_CLIENT_ID: "fake-client-id-must-not-be-used",
      GUESTY_CLIENT_SECRET: "fake-client-secret-must-not-be-used",
      SUPABASE_URL: "https://cache.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "fake-cache-key-must-not-be-printed",
    },
    home: {
      ".guesty-cli/.env": "",
      ".guesty-cli/token.json": JSON.stringify({ token: null }),
      ".guesty-cli/update-check.json": JSON.stringify({ lastCheck: now, latestVersion: "0.0.0" }),
    },
    handle(request) {
      const url = new URL(request.url);
      if (url.hostname === "cache.invalid" && url.pathname === "/rest/v1/guesty_tokens") {
        if (request.method !== "GET") return { throw: true };
        return { json: pick(shared, sharedIndex++) };
      }
      if (url.origin !== "https://open-api.guesty.com" || !url.pathname.startsWith("/v1/") || /oauth/i.test(url.pathname)) return { throw: true };
      resources.push({
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: request.body.length ? JSON.parse(request.body.toString("utf8")) : null,
        contentType: request.headers["content-type"] ?? null,
      });
      const reply = (replies ?? [{ body: { ok: true } }])[replyIndex++];
      if (!reply) return { throw: true };
      return { status: reply.status ?? 200, json: reply.body ?? {} };
    },
  });
  const auth = {
    requests: result.requests.filter(({ url }) => new URL(url).hostname !== "open-api.guesty.com").map(({ url, method }) => ({ url, method })),
    writes: result.writes.map(({ path }) => path),
    tokenReads: result.tokenReads,
  };
  return { ...result, auth, requests: resources };
}
