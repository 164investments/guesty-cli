// Rebuild openapi-spec.json and api-spec.json from Guesty's public
// documentation site. The site publishes no complete OpenAPI download, so this
// reads the reference navigation, then each reference page's Markdown copy,
// one request at a time. It contacts only the documentation site.
import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  assertOperationCount, buildReference, diffOperations, listReferencePages,
  mergeReferenceSchemas, readDocumentationIndex, readReferenceMarkdown,
} from "./api-reference.mjs";

export const DOCS_BASE_URL = "https://open-api-docs.guesty.com";
export const DOCS_INDEX_URL = `${DOCS_BASE_URL}/reference`;
const USER_AGENT = "guesty-cli documentation-refresh (+https://github.com/164investments/guesty-cli)";
const NOT_UPDATED = "no reference files were updated";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function retryAfterMs(header, now) {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

// Sequential client for the documentation site. Requests start at least
// intervalMs apart. A 429 waits for Retry-After (or backs off from 30 seconds)
// and permanently widens the interval; 5xx, network errors and unexpected
// content back off from 5 seconds. Anything else fails at once.
export function createDocsClient({
  fetch = globalThis.fetch, sleep = wait, now = Date.now, log = () => {},
  intervalMs = 2_000, maxIntervalMs = 10_000, maxAttempts = 5, maxRetryDelayMs = 300_000,
  deadline = Infinity, timeoutMs = 30_000,
} = {}) {
  const stats = { requests: 0, retries: 0, throttled: 0, intervalMs };
  let nextAt = 0;
  async function get(url, contentType) {
    for (let attempt = 1; ; attempt += 1) {
      const delay = nextAt - now();
      if (delay > 0) await sleep(delay);
      if (now() > deadline) throw new Error(`The documentation refresh ran past its time limit before ${url}; ${NOT_UPDATED}.`);
      nextAt = now() + stats.intervalMs;
      stats.requests += 1;
      let response;
      let problem;
      try {
        response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: contentType },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        problem = error.message;
      }
      if (response?.ok && response.redirected && new URL(response.url).pathname === "/404") {
        await response.body?.cancel();
        throw new Error(`${url} redirected to the documentation site's 404 page; ${NOT_UPDATED}.`);
      }
      if (response?.ok && (response.headers.get("content-type") ?? "").includes(contentType)) {
        return { url: response.url, text: await response.text() };
      }
      if (response) {
        problem = response.ok ? `unexpected ${response.headers.get("content-type") ?? "untyped"} content` : `HTTP ${response.status}`;
        await response.body?.cancel();
      }
      const retryable = !response || response.ok || response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= maxAttempts) {
        throw new Error(`${url} failed with ${problem} after ${attempt} attempt${attempt === 1 ? "" : "s"}; ${NOT_UPDATED}.`);
      }
      let backoff;
      if (response?.status === 429) {
        stats.throttled += 1;
        stats.intervalMs = Math.min(maxIntervalMs, Math.ceil(stats.intervalMs * 1.5));
        backoff = retryAfterMs(response.headers.get("retry-after"), now()) ?? 30_000 * 2 ** (attempt - 1);
      } else {
        backoff = 5_000 * 2 ** (attempt - 1);
      }
      if (backoff > maxRetryDelayMs || now() + backoff > deadline) {
        throw new Error(`${url} failed with ${problem}, and waiting ${Math.ceil(backoff / 1000)} seconds is more than this refresh allows; ${NOT_UPDATED}.`);
      }
      stats.retries += 1;
      log(`${url}: ${problem}; retrying in ${Math.ceil(backoff / 1000)}s (attempt ${attempt + 1} of ${maxAttempts}).`);
      nextAt = Math.max(nextAt, now() + backoff);
    }
  }
  return { get, stats };
}

async function readJsonIfPresent(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// Finish every fetch and validation before replacing either artifact, then
// rename both into place so a failure never publishes a partial inventory.
async function writeArtifacts(root, artifacts) {
  const staged = [];
  try {
    for (const [name, data] of artifacts) {
      const target = join(root, name);
      const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
      staged.push({ target, temporary });
      await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
    }
    for (const { target, temporary } of staged) await rename(temporary, target);
  } finally {
    for (const { temporary } of staged) await rm(temporary, { force: true });
  }
}

export async function refreshApiSpec({
  root, fetch, sleep, now = Date.now, log = () => {}, warn = log,
  intervalMs, maxAttempts, maxRuntimeMs = 25 * 60_000, minimumRatio = 0.9, allowShrink = false,
}) {
  const startedAt = now();
  const client = createDocsClient({ fetch, sleep, now, log: warn, intervalMs, maxAttempts, deadline: startedAt + maxRuntimeMs });
  const previousSchema = await readJsonIfPresent(join(root, "openapi-spec.json"));
  const previousCatalog = (await readJsonIfPresent(join(root, "api-spec.json"))) ?? {};
  const previousCount = diffOperations(previousSchema, null).previous;
  const minimum = allowShrink ? 0 : minimumRatio;

  const index = readDocumentationIndex((await client.get(DOCS_INDEX_URL, "text/html")).text);
  const references = listReferencePages(index.sidebar);
  assertOperationCount(references.length, previousCount, minimum, "reference pages");
  log(`Found ${references.length} reference pages; reading one every ${client.stats.intervalMs / 1000}s.`);

  const pages = [];
  for (const reference of references) {
    const { text } = await client.get(`${DOCS_BASE_URL}/reference/${encodeURIComponent(reference.slug)}.md`, "text/markdown");
    pages.push({ slug: reference.slug, method: reference.api_method, schema: readReferenceMarkdown(text, reference.slug) });
    if (pages.length % 50 === 0) log(`Read ${pages.length}/${references.length} reference pages.`);
  }

  const { schema, operationSlugs } = mergeReferenceSchemas(pages);
  schema["x-cli-source"] = {
    url: DOCS_INDEX_URL,
    updatedAt: index.apiDefinitions?.[0]?.updated_at ?? index.gitVersion?.updated_at ?? index.document?.updated_at ?? null,
  };
  const catalog = buildReference({ document: { api: { schema } }, sidebar: index.sidebar, operationSlugs }, previousCatalog);
  const changes = diffOperations(previousSchema, schema);
  assertOperationCount(changes.current, previousCount, minimum);
  await writeArtifacts(root, [["openapi-spec.json", schema], ["api-spec.json", catalog]]);
  return { ...changes, pages: references.length, source: schema["x-cli-source"], ...client.stats, elapsedMs: now() - startedAt };
}
