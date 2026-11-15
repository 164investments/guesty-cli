// Writes guesty-cli-spec.json, the CLI's machine-readable contract: every
// command and option (from the binary: `guesty __contract`), the Guesty
// requests each command makes, and the matching Guesty reference entries and
// schemas (from api-spec.json / openapi-spec.json and the Booking Engine
// equivalents, which the nightly docs watch refreshes).
//
// The Node CLI's generator read requests out of its TypeScript source. The
// Rust port keeps that request metadata (helper, method, path, query
// parameters, pagination, input capabilities) per command in
// scripts/cli-contract-requests.json; a new command needs an entry there.
//
//   node scripts/generate-cli-spec.mjs           # rewrite the file
//   node scripts/generate-cli-spec.mjs --check   # fail if it is out of date
// GUESTY_CLI_BIN picks the binary (default target/debug/guesty).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { BOOKING_ENGINE_API, listOperations, OPEN_API, operationSchemas, requestMatchesEndpoint } from "./api-reference.mjs";

const ROOT = process.cwd();
const OUTPUT_FILE = join(ROOT, "guesty-cli-spec.json");
const PACKAGE_FILE = join(ROOT, "package.json");
const REQUESTS_FILE = join(ROOT, "scripts", "cli-contract-requests.json");
const OPTIONAL_REFERENCE_FILE = join(ROOT, "api-spec.json");
const OPTIONAL_SCHEMAS_FILE = join(ROOT, "schemas.json");
const OPENAPI_FILE = join(ROOT, "openapi-spec.json");
const EXISTING_CONTRACT_FILE = join(ROOT, "guesty-cli-spec.json");
const BOOKING_ENGINE_REFERENCE_FILE = join(ROOT, "booking-engine-api-spec.json");
const BOOKING_ENGINE_OPENAPI_FILE = join(ROOT, "booking-engine-openapi-spec.json");
const OPEN_API_DOCS_URL = "https://open-api-docs.guesty.com/reference";
const BOOKING_ENGINE_DOCS_URL = "https://booking-api-docs.guesty.com/reference";
const BINARY = process.env.GUESTY_CLI_BIN ?? join(ROOT, "target", "debug", "guesty");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizePath(path) {
  let normalized = "";
  for (let i = 0; i < path.length; i += 1) {
    if (path[i] === "{") {
      while (i < path.length && path[i] !== "}") i += 1;
      normalized += "{param}";
    } else {
      normalized += path[i];
    }
  }
  return normalized;
}

function loadExistingContractSchemas() {
  if (!existsSync(EXISTING_CONTRACT_FILE)) return new Map();

  try {
    const contract = readJson(EXISTING_CONTRACT_FILE);
    const fallbackSchemas = new Map();
    for (const operation of contract.operations ?? []) {
      for (const request of operation.requests ?? []) {
        for (const reference of request.reference ?? []) {
          if (!reference.slug) continue;
          const schema = {};
          if (reference.parameters) schema.parameters = reference.parameters;
          if (reference.requestBody) schema.requestBody = reference.requestBody;
          if (reference.responses) schema.responses = reference.responses;
          if (Object.keys(schema).length > 0) {
            fallbackSchemas.set(reference.slug, schema);
          }
        }
      }
    }
    return fallbackSchemas;
  } catch {
    return new Map();
  }
}

function loadCatalogSchemas(catalogFile, openapiFile, api, refreshCommand) {
  const schema = readJson(openapiFile);
  const operations = new Map(listOperations(schema, api).map((entry) =>
    [`${entry.method} ${normalizePath(entry.path)}`, entry]
  ));
  const schemas = new Map();
  const covered = new Set();
  for (const entries of Object.values(readJson(catalogFile))) {
    for (const entry of entries) {
      const key = `${entry.method} ${normalizePath(entry.path)}`;
      const operation = operations.get(key);
      if (!operation) throw new Error(`Catalog endpoint missing from ${relative(ROOT, openapiFile)}: ${entry.method} ${entry.path}`);
      covered.add(key);
      schemas.set(entry.slug, operationSchemas(schema, operation.pathItem, operation.operation));
    }
  }
  if (covered.size !== operations.size) throw new Error(`The ${api.label} endpoint catalog is missing current OpenAPI operations. Run ${refreshCommand}.`);
  return schemas;
}

function loadSchemas() {
  if (existsSync(OPENAPI_FILE)) return loadCatalogSchemas(OPTIONAL_REFERENCE_FILE, OPENAPI_FILE, OPEN_API, "npm run refresh:api-spec");
  const schemas = loadExistingContractSchemas();
  if (!existsSync(OPTIONAL_SCHEMAS_FILE)) return schemas;

  try {
    const raw = readJson(OPTIONAL_SCHEMAS_FILE);
    for (const [slug, schema] of Object.entries(raw)) {
      schemas.set(slug, schema);
    }
    return schemas;
  } catch {
    return schemas;
  }
}

function parseReference(catalogFile = OPTIONAL_REFERENCE_FILE, loadReferenceSchemas = loadSchemas, docsUrl = OPEN_API_DOCS_URL) {
  if (!existsSync(catalogFile)) {
    return { byKey: new Map(), byGroup: new Map(), totalEndpoints: 0, file: null, schemas: new Map(), docsUrl };
  }

  const raw = readJson(catalogFile);
  const schemas = loadReferenceSchemas();
  const byKey = new Map();
  const byGroup = new Map();
  let totalEndpoints = 0;

  for (const [group, entries] of Object.entries(raw)) {
    const groupEntries = [];
    for (const entry of entries) {
      const key = `${entry.method} ${normalizePath(entry.path)}`;
      const record = {
        group,
        method: entry.method,
        path: entry.path,
        normalizedPath: normalizePath(entry.path),
        title: entry.title ?? null,
        slug: entry.slug ?? null,
      };
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(record);
      groupEntries.push(record);
      totalEndpoints += 1;
    }
    byGroup.set(group, groupEntries);
  }

  return {
    byKey,
    byGroup,
    totalEndpoints,
    file: relative(ROOT, catalogFile),
    schemas,
    docsUrl,
  };
}

function parseBookingEngineReference() {
  return parseReference(
    BOOKING_ENGINE_REFERENCE_FILE,
    () => loadCatalogSchemas(BOOKING_ENGINE_REFERENCE_FILE, BOOKING_ENGINE_OPENAPI_FILE, BOOKING_ENGINE_API, "npm run refresh:booking-engine-spec"),
    BOOKING_ENGINE_DOCS_URL,
  );
}

function summarizeCoverage(operations, reference, api) {
  const implementedKeys = new Set();
  const implementedReferences = new Set();
  for (const operation of operations) {
    for (const request of operation.requests) {
      if (!request.path || request.api !== api) continue;
      implementedKeys.add(`${request.method} ${normalizePath(request.path)}`);
      for (const entry of request.reference ?? []) implementedReferences.add(entry.slug);
    }
  }

  const coveredGroups = [];
  for (const [group, endpoints] of reference.byGroup.entries()) {
    const covered = new Set();
    for (const endpoint of endpoints) {
      if (implementedReferences.has(endpoint.slug)) {
        covered.add(endpoint.slug);
      }
    }
    coveredGroups.push({
      group,
      implementedEndpoints: covered.size,
      referenceEndpoints: endpoints.length,
    });
  }

  coveredGroups.sort((a, b) => b.implementedEndpoints - a.implementedEndpoints || b.referenceEndpoints - a.referenceEndpoints);

  const missingImplementedEndpoints = [];
  for (const [group, endpoints] of reference.byGroup.entries()) {
    for (const endpoint of endpoints) {
      if (!implementedReferences.has(endpoint.slug)) {
        missingImplementedEndpoints.push({
          group,
          method: endpoint.method,
          path: endpoint.path,
          title: endpoint.title,
          slug: endpoint.slug,
        });
      }
    }
  }

  return {
    referenceFile: reference.file,
    implementedUniqueEndpoints: implementedKeys.size,
    implementedReferenceEndpoints: implementedReferences.size,
    referenceEndpoints: reference.totalEndpoints,
    implementedGroups: coveredGroups.filter((group) => group.implementedEndpoints > 0).length,
    referenceGroups: coveredGroups.length,
    missingImplementedEndpoints,
    groups: coveredGroups,
  };
}

function matchReference(reference, method, path, queryParams) {
  if (!path) return null;
  const matches = [...reference.byKey.values()].flat().filter((endpoint) =>
    requestMatchesEndpoint({ method, path, queryParams }, endpoint));
  return matches.map((match) => {
    const entry = {
      group: match.group,
      title: match.title,
      slug: match.slug,
      docsUrl: match.slug ? `${reference.docsUrl}/${match.slug}` : null,
    };
    if (match.slug) {
      const schema = reference.schemas.get(match.slug);
      if (schema) {
        if (schema.parameters) entry.parameters = schema.parameters;
        if (schema.requestBody) entry.requestBody = schema.requestBody;
        if (schema.responses) entry.responses = schema.responses;
        entry.deprecated = schema.deprecated === true;
      }
    }
    return entry;
  });
}
function option(dumped) {
  return {
    flags: dumped.flags,
    description: dumped.description,
    required: dumped.required,
    defaultValue: dumped.defaultValue ?? null,
    ...(dumped.choices ? { choices: dumped.choices } : {}),
    line: dumped.line,
  };
}

// One operation (a command with an action), shaped as the Node generator wrote it.
function buildOperation(command, group, requestsById, references) {
  const rootAction = group === null || command.name === group.name;
  const syntax = rootAction ? command.name : command.syntax;
  const fullCommand = rootAction ? `guesty ${command.name}` : `guesty ${group.name === "guesty" ? "" : `${group.name} `}${syntax}`;
  const metadata = requestsById[fullCommand];
  if (!metadata) {
    throw new Error(`${fullCommand} has no entry in scripts/cli-contract-requests.json. Add its inputCapabilities and requests.`);
  }
  return {
    id: fullCommand,
    rootAction,
    name: command.name,
    syntax,
    fullCommand,
    description: command.description,
    aliases: command.aliases,
    arguments: rootAction
      ? command.arguments.filter((a) => !a.inline).map((a) => ({ syntax: a.syntax, description: a.description, defaultValue: null, line: command.line }))
      : command.arguments.filter((a) => a.inline).map((a) => ({ name: a.name, required: a.required, variadic: a.variadic })),
    options: command.options.map(option),
    inputCapabilities: metadata.inputCapabilities,
    requests: metadata.requests.map((request) => ({
      ...request,
      line: command.line,
      reference: matchReference(request.api === "booking-engine" ? references.bookingEngine : references.openApi, request.method, request.path, request.queryParams),
    })),
    sourceFile: command.sourceFile,
    line: command.line,
  };
}

function main() {
  const packageJson = readJson(PACKAGE_FILE);
  const reference = parseReference();
  const bookingEngineReference = parseBookingEngineReference();
  const references = { openApi: reference, bookingEngine: bookingEngineReference };
  const requestsById = readJson(REQUESTS_FILE);
  const program = JSON.parse(execFileSync(BINARY, ["__contract"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  const commands = [];
  const allOperations = [];
  const used = new Set();

  for (const top of program.commands.filter((command) => !command.hidden)) {
    const operations = [];
    if (top.commands.length === 0 || top.hasAction) {
      // A command defined at the top level: its own operation, rooted at its
      // own file (or, for update, at the program).
      if (top.hasAction) operations.push(buildOperation(top, top.sourceFile === program.sourceFile ? program : null, requestsById, references));
    }
    for (const sub of top.commands.filter((command) => command.hasAction && !command.hidden)) {
      operations.push(buildOperation(sub, top, requestsById, references));
    }
    for (const operation of operations) used.add(operation.id);
    if (top.sourceFile === program.sourceFile) {
      for (const operation of operations) commands.push({
        name: operation.name, alias: null, description: operation.description,
        sourceFile: top.sourceFile, line: operation.line, operations: [operation],
      });
    } else {
      commands.push({
        name: top.name,
        alias: top.aliases[0] ?? null,
        description: top.description,
        sourceFile: top.sourceFile,
        line: top.line,
        operations,
      });
    }
    allOperations.push(...operations);
  }
  const unused = Object.keys(requestsById).filter((id) => !used.has(id));
  if (unused.length) throw new Error(`scripts/cli-contract-requests.json lists commands the CLI doesn't have: ${unused.join(", ")}`);

  commands.sort((a, b) => a.name.localeCompare(b.name));
  allOperations.sort((a, b) => a.fullCommand.localeCompare(b.fullCommand));

  const spec = {
    contractName: "guesty-cli-spec",
    contractVersion: 1,
    generatedAt: new Date().toISOString(),
    cliVersion: packageJson.version,
    generatedFrom: {
      packageFile: relative(ROOT, PACKAGE_FILE),
      commandTree: "guesty __contract",
      requestsFile: relative(ROOT, REQUESTS_FILE),
      optionalReferenceFile: reference.file,
      bookingEngineReferenceFile: bookingEngineReference.file,
    },
    usageNotes: [
      "This file is the machine-readable contract for the Guesty CLI in this repository.",
      "Named operations describe the CLI syntax, accepted options, and the Guesty endpoint calls made by each command.",
      "Each request names its API: open-api (open-api.guesty.com, cached openapi token) or booking-engine (booking.guesty.com, cached beapi token).",
      "The raw command remains the escape hatch for Open API endpoints or payload shapes that are not wrapped by a named command.",
      "If api-spec.json or booking-engine-api-spec.json is present when this file is generated, request entries include the matched Guesty reference group and title.",
      "Schema references in Open API request entries resolve against components; in Booking Engine request entries, against bookingEngineComponents.",
    ],
    ...(existsSync(OPENAPI_FILE) ? {
      openapiSource: { file: "openapi-spec.json", ...readJson(OPENAPI_FILE)["x-cli-source"] },
      components: readJson(OPENAPI_FILE).components ?? {},
    } : {}),
    ...(existsSync(BOOKING_ENGINE_OPENAPI_FILE) ? {
      bookingEngineOpenapiSource: { file: "booking-engine-openapi-spec.json", ...readJson(BOOKING_ENGINE_OPENAPI_FILE)["x-cli-source"] },
      bookingEngineComponents: readJson(BOOKING_ENGINE_OPENAPI_FILE).components ?? {},
    } : {}),
    commands,
    operations: allOperations,
    referenceCoverage: summarizeCoverage(allOperations, reference, "open-api"),
    bookingEngineReferenceCoverage: summarizeCoverage(allOperations, bookingEngineReference, "booking-engine"),
  };

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  if (process.argv.includes("--check")) {
    const existing = readJson(OUTPUT_FILE);
    const expected = { ...spec, generatedAt: existing.generatedAt };
    if (JSON.stringify(existing) !== JSON.stringify(expected)) {
      throw new Error("guesty-cli-spec.json is out of date. Run npm run generate:cli-spec.");
    }
    process.stdout.write("CLI contract matches the CLI and current OpenAPI.\n");
    return;
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(spec, null, 2) + "\n");
  process.stdout.write(`Wrote ${relative(ROOT, OUTPUT_FILE)}\n`);
}

main();
