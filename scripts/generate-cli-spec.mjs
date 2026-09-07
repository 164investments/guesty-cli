import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";
import { listOperations, operationSchemas, requestMatchesEndpoint } from "./api-reference.mjs";

const ROOT = process.cwd();
const COMMANDS_DIR = join(ROOT, "src", "commands");
const OUTPUT_FILE = join(ROOT, "guesty-cli-spec.json");
const PACKAGE_FILE = join(ROOT, "package.json");
const OPTIONAL_REFERENCE_FILE = join(ROOT, "api-spec.json");
const OPTIONAL_SCHEMAS_FILE = join(ROOT, "schemas.json");
const OPENAPI_FILE = join(ROOT, "openapi-spec.json");
const EXISTING_CONTRACT_FILE = join(ROOT, "guesty-cli-spec.json");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function listCommandFiles() {
  const host = ts.sys;
  return host.readDirectory(COMMANDS_DIR, [".ts"], undefined, ["**/*.ts"]).sort();
}

function getLiteralValue(node, seen = new Set()) {
  if (!node) return null;
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return getLiteralValue(node.expression, seen);
  if (ts.isIdentifier(node) && !seen.has(node.text)) {
    let initializer;
    const visit = (child) => {
      if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) && child.name.text === node.text) initializer = child.initializer;
      ts.forEachChild(child, visit);
    };
    visit(node.getSourceFile());
    if (initializer) return getLiteralValue(initializer, new Set([...seen, node.text]));
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => getLiteralValue(element));
  }
  return null;
}

function getNodeText(node, sourceFile) {
  return node.getText(sourceFile).trim();
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

function templateToPath(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      value += "{param}" + span.literal.text;
    }
    return value;
  }
  return null;
}

function parseSyntax(commandSyntax) {
  const parts = commandSyntax.trim().split(/\s+/).filter(Boolean);
  const name = parts[0] ?? "";
  const args = [];
  for (const token of parts.slice(1)) {
    const required = token.startsWith("<") && token.endsWith(">");
    const optional = token.startsWith("[") && token.endsWith("]");
    if (!required && !optional) continue;
    const rawName = token.slice(1, -1);
    const variadic = rawName.endsWith("...");
    args.push({
      name: variadic ? rawName.slice(0, -3) : rawName,
      required,
      variadic,
    });
  }
  return { name, args };
}

function lineForNode(node, sourceFile) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function unwrapChain(node) {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const base = unwrapChain(node.expression.expression);
    if (!base) return null;
    return {
      root: base.root,
      newArgs: base.newArgs,
      segments: [
        ...base.segments,
        {
          kind: "call",
          name: node.expression.name.text,
          args: [...node.arguments],
          node,
        },
      ],
    };
  }

  if (ts.isPropertyAccessExpression(node)) {
    const base = unwrapChain(node.expression);
    if (!base) return null;
    return {
      root: base.root,
      newArgs: base.newArgs,
      segments: [
        ...base.segments,
        {
          kind: "property",
          name: node.name.text,
          node,
        },
      ],
    };
  }

  if (ts.isIdentifier(node)) {
    return { root: node.text, newArgs: null, segments: [] };
  }

  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && ["Command", "Option"].includes(node.expression.text)) {
    return {
      root: node.expression.text,
      newArgs: [...(node.arguments ?? [])],
      segments: [],
    };
  }

  return null;
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

function loadSchemas() {
  if (existsSync(OPENAPI_FILE)) {
    const schema = readJson(OPENAPI_FILE);
    const operations = new Map(listOperations(schema).map((entry) =>
      [`${entry.method} ${normalizePath(entry.path)}`, entry]
    ));
    const schemas = new Map();
    const covered = new Set();
    for (const entries of Object.values(readJson(OPTIONAL_REFERENCE_FILE))) {
      for (const entry of entries) {
        const key = `${entry.method} ${normalizePath(entry.path)}`;
        const operation = operations.get(key);
        if (!operation) throw new Error(`Catalog endpoint missing from OpenAPI: ${entry.method} ${entry.path}`);
        covered.add(key);
        schemas.set(entry.slug, operationSchemas(schema, operation.pathItem, operation.operation));
      }
    }
    if (covered.size !== operations.size) throw new Error("The endpoint catalog is missing current OpenAPI operations. Run npm run refresh:api-spec.");
    return schemas;
  }
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

function parseReference() {
  if (!existsSync(OPTIONAL_REFERENCE_FILE)) {
    return { byKey: new Map(), byGroup: new Map(), totalEndpoints: 0, file: null, schemas: new Map() };
  }

  const raw = readJson(OPTIONAL_REFERENCE_FILE);
  const schemas = loadSchemas();
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
    file: relative(ROOT, OPTIONAL_REFERENCE_FILE),
    schemas,
  };
}

function parseRootCommand(sourceFilePath) {
  const sourceText = readFileSync(sourceFilePath, "utf8");
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let rootCommand = null;

  function visit(node) {
    if (rootCommand) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const chain = unwrapChain(node.initializer);
      if (!chain || chain.root !== "Command") {
        ts.forEachChild(node, visit);
        return;
      }

      const nameSegment = chain.segments.find((segment) => segment.name === "name");
      const commandName = getLiteralValue(chain.newArgs?.[0] ?? nameSegment?.args[0]);
      if (typeof commandName !== "string") {
        ts.forEachChild(node, visit);
        return;
      }

      const aliasSegment = chain.segments.find((segment) => segment.kind === "call" && segment.name === "alias");
      const descriptionSegment = chain.segments.find((segment) => segment.kind === "call" && segment.name === "description");

      rootCommand = {
        variableName: node.name.text,
        name: commandName,
        alias: aliasSegment ? getLiteralValue(aliasSegment.args[0]) : null,
        description: descriptionSegment ? getLiteralValue(descriptionSegment.args[0]) : null,
        sourceFile: relative(ROOT, sourceFilePath),
        line: lineForNode(node, sourceFile),
        initializerChain: chain,
      };
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { rootCommand, sourceFile };
}

function collectParamsFromObjectLiteral(node, sourceFile) {
  const params = [];
  for (const prop of node.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : getNodeText(prop.name, sourceFile);
      const source = getNodeText(prop.initializer, sourceFile);
      const cliOptionMatch = source.match(/opts\.([A-Za-z0-9_]+)/);
      params.push({
        name: key,
        source,
        cliOption: cliOptionMatch?.[1] ?? null,
      });
    } else if (ts.isShorthandPropertyAssignment(prop)) {
      params.push({
        name: prop.name.text,
        source: prop.name.text,
        cliOption: null,
      });
    } else if (ts.isSpreadAssignment(prop)) {
      params.push({
        name: "...spread",
        source: getNodeText(prop.expression, sourceFile),
        cliOption: null,
      });
    }
  }
  return params;
}

function collectParamAssignments(actionNode, sourceFile) {
  const params = new Map();

  function addParam(name, sourceExpression) {
    if (!params.has(name)) {
      const cliOptionMatch = sourceExpression.match(/opts\.([A-Za-z0-9_]+)/);
      params.set(name, {
        name,
        source: sourceExpression,
        cliOption: cliOptionMatch?.[1] ?? null,
      });
    }
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "params" && node.initializer) {
      if (ts.isObjectLiteralExpression(node.initializer)) {
        for (const param of collectParamsFromObjectLiteral(node.initializer, sourceFile)) {
          addParam(param.name, param.source);
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      ts.isIdentifier(node.left.expression) &&
      node.left.expression.text === "params"
    ) {
      addParam(node.left.name.text, getNodeText(node.right, sourceFile));
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isElementAccessExpression(node.left) && ts.isIdentifier(node.left.expression) &&
        node.left.expression.text === "params") {
      const name = getLiteralValue(node.left.argumentExpression);
      if (typeof name === "string") addParam(name, getNodeText(node.right, sourceFile));
    }

    ts.forEachChild(node, visit);
  }

  visit(actionNode);
  return [...params.values()];
}

function extractRequestDetails(actionNode, sourceFile, reference) {
  const collectedParams = collectParamAssignments(actionNode, sourceFile);
  const requests = [];

  function matchReference(method, path, queryParams) {
    if (!path) return null;
    const matches = [...reference.byKey.values()].flat().filter((endpoint) =>
      requestMatchesEndpoint({ method, path, queryParams }, endpoint));
    return matches.map((match) => {
      const entry = {
        group: match.group,
        title: match.title,
        slug: match.slug,
        docsUrl: match.slug ? `https://open-api-docs.guesty.com/reference/${match.slug}` : null,
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

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const helperName = ts.isIdentifier(node.expression) ? node.expression.text : null;
      if (helperName === "guestyFetch" || helperName === "paginateAll") {
        const path = templateToPath(node.arguments[0]);
        let method = "GET";
        let responseType = "auto";
        let params = collectedParams;
        let paginated = helperName === "paginateAll";
        let resultsKey = helperName === "paginateAll" ? getLiteralValue(node.arguments[2]) : null;

        if (helperName === "guestyFetch" && node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])) {
          for (const property of node.arguments[1].properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
              ? property.name.text
              : null;
            if (!propertyName) continue;

            if (propertyName === "method") {
              const literalMethod = getLiteralValue(property.initializer);
              if (typeof literalMethod === "string") method = literalMethod;
            }

            if (propertyName === "responseType") {
              const literalResponseType = getLiteralValue(property.initializer);
              if (typeof literalResponseType === "string") responseType = literalResponseType;
            }

            if (propertyName === "params") {
              if (ts.isObjectLiteralExpression(property.initializer)) {
                params = collectParamsFromObjectLiteral(property.initializer, sourceFile);
              } else if (ts.isIdentifier(property.initializer) && property.initializer.text === "params") {
                params = collectedParams;
              } else {
                params = [
                  {
                    name: "*dynamic*",
                    source: getNodeText(property.initializer, sourceFile),
                    cliOption: null,
                  },
                ];
              }
            }
          }
        }

        requests.push({
          helper: helperName,
          method,
          path,
          dynamicPath: path === null,
          paginated,
          resultsKey,
          responseType,
          queryParams: params,
          line: lineForNode(node, sourceFile),
          reference: matchReference(method, path, params),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(actionNode);
  return requests;
}

function parseOptionSegment(segment, sourceFile) {
  if (segment.name === "addOption") {
    const option = unwrapChain(segment.args[0]);
    if (!option || option.root !== "Option") throw new Error("Cannot inspect addOption; use an inline new Option.");
    const defaultSegment = option.segments.find((item) => item.name === "default");
    const choicesSegment = option.segments.find((item) => item.name === "choices");
    const mandatorySegment = option.segments.find((item) => item.name === "makeOptionMandatory");
    return {
      flags: getLiteralValue(option.newArgs?.[0]),
      description: getLiteralValue(option.newArgs?.[1]),
      required: !!mandatorySegment && getLiteralValue(mandatorySegment.args[0]) !== false,
      defaultValue: defaultSegment ? getLiteralValue(defaultSegment.args[0]) : null,
      ...(choicesSegment ? { choices: getLiteralValue(choicesSegment.args[0]) } : {}),
      line: lineForNode(segment.node, sourceFile),
    };
  }
  const flags = getLiteralValue(segment.args[0]);
  const description = getLiteralValue(segment.args[1]);
  const trailingArgs = segment.args.slice(2).map((arg) => getLiteralValue(arg)).filter((value) => value !== null);
  const defaultValue = trailingArgs.length > 0 ? trailingArgs[trailingArgs.length - 1] : null;
  return {
    flags,
    description,
    required: segment.name === "requiredOption",
    defaultValue,
    line: lineForNode(segment.node, sourceFile),
  };
}

function parseArgumentSegment(segment, sourceFile) {
  return {
    syntax: getLiteralValue(segment.args[0]),
    description: getLiteralValue(segment.args[1]),
    defaultValue: getLiteralValue(segment.args[2]),
    line: lineForNode(segment.node, sourceFile),
  };
}

function buildOperation(chain, sourceFile, rootCommand, reference) {
  const commandSegment = chain.segments.find((segment) => segment.kind === "call" && segment.name === "command");
  const descriptionSegment = chain.segments.find((segment) => segment.kind === "call" && segment.name === "description");
  const optionSegments = chain.segments.filter(
    (segment) => segment.kind === "call" && ["option", "requiredOption", "addOption"].includes(segment.name)
  );
  const argumentSegments = chain.segments.filter(
    (segment) => segment.kind === "call" && segment.name === "argument"
  );
  const actionSegment = chain.segments.find((segment) => segment.kind === "call" && segment.name === "action");

  if (!actionSegment || !actionSegment.args[0] || !(ts.isArrowFunction(actionSegment.args[0]) || ts.isFunctionExpression(actionSegment.args[0]))) {
    return null;
  }

  const actionNode = actionSegment.args[0];
  const actionText = getNodeText(actionNode, sourceFile);
  const syntax = commandSegment ? getLiteralValue(commandSegment.args[0]) : rootCommand.name;
  if (typeof syntax !== "string") throw new Error(`Cannot inspect dynamic command syntax in ${sourceFile.fileName}:${lineForNode(actionNode, sourceFile)}. Declare the command inline.`);
  const parsedSyntax = parseSyntax(syntax);
  const rootAction = !commandSegment;
  const fullCommand = rootAction
    ? `guesty ${rootCommand.name}`
    : `guesty ${rootCommand.name === "guesty" ? "" : `${rootCommand.name} `}${syntax}`;

  const options = optionSegments.map((segment) => parseOptionSegment(segment, sourceFile));
  const jsonStdin = actionText.includes("JSON.parse(await readStdin())") || actionText.includes("readObject(") ||
    (actionText.includes("await readStdin()") && actionText.includes("jsonObject("));
  return {
    id: fullCommand,
    rootAction,
    name: rootAction ? rootCommand.name : parsedSyntax.name,
    syntax,
    fullCommand,
    description: descriptionSegment ? getLiteralValue(descriptionSegment.args[0]) : null,
    aliases: chain.segments.filter((segment) => segment.name === "alias").map((segment) => getLiteralValue(segment.args[0])),
    arguments: rootAction
      ? argumentSegments.map((segment) => parseArgumentSegment(segment, sourceFile))
      : parsedSyntax.args,
    options,
    inputCapabilities: {
      supportsDataOption: options.some((option) => String(option.flags ?? "").includes("--data ")),
      supportsTextOption: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--text ")),
      supportsDataFileOption: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--data-file ")),
      supportsStdinFlag: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--stdin")),
      readsJsonFromStdin: jsonStdin,
      readsTextFromStdin: actionText.includes("await readStdin()") && !jsonStdin,
      writesToOutputFile: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--output ")),
    },
    requests: extractRequestDetails(actionNode, sourceFile, reference),
    sourceFile: relative(ROOT, sourceFile.fileName),
    line: lineForNode(actionSegment.node, sourceFile),
  };
}

function collectOperations(sourceFile, rootCommand, reference) {
  const operations = [];

  if (rootCommand.initializerChain?.segments.some((segment) => segment.kind === "call" && segment.name === "action")) {
    const rootOperation = buildOperation(rootCommand.initializerChain, sourceFile, rootCommand, reference);
    if (rootOperation) operations.push(rootOperation);
  }

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "action") {
      const chain = unwrapChain(node);
      if (chain && chain.root === rootCommand.variableName) {
        const operation = buildOperation(chain, sourceFile, rootCommand, reference);
        if (operation) operations.push(operation);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return operations.sort((a, b) => a.line - b.line);
}

function summarizeCoverage(operations, reference) {
  const implementedKeys = new Set();
  const implementedReferences = new Set();
  for (const operation of operations) {
    for (const request of operation.requests) {
      if (!request.path) continue;
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

function main() {
  const packageJson = readJson(PACKAGE_FILE);
  const reference = parseReference();
  const commandFiles = [...listCommandFiles(), join(ROOT, "src", "cli.ts")];
  const commands = [];
  const allOperations = [];

  for (const file of commandFiles) {
    const { rootCommand, sourceFile } = parseRootCommand(file);
    if (!rootCommand) continue;

    const operations = collectOperations(sourceFile, rootCommand, reference);
    if (rootCommand.name === "guesty") {
      for (const operation of operations) commands.push({
        name: operation.name, alias: null, description: operation.description,
        sourceFile: rootCommand.sourceFile, line: operation.line, operations: [operation],
      });
    } else commands.push({
      name: rootCommand.name,
      alias: rootCommand.alias,
      description: rootCommand.description,
      sourceFile: rootCommand.sourceFile,
      line: rootCommand.line,
      operations,
    });
    allOperations.push(...operations);
  }

  commands.sort((a, b) => a.name.localeCompare(b.name));
  allOperations.sort((a, b) => a.fullCommand.localeCompare(b.fullCommand));

  const spec = {
    contractName: "guesty-cli-spec",
    contractVersion: 1,
    generatedAt: new Date().toISOString(),
    cliVersion: packageJson.version,
    generatedFrom: {
      packageFile: relative(ROOT, PACKAGE_FILE),
      commandFiles: commandFiles.map((file) => relative(ROOT, file)),
      optionalReferenceFile: reference.file,
    },
    usageNotes: [
      "This file is the machine-readable contract for the Guesty CLI in this repository.",
      "Named operations describe the CLI syntax, accepted options, and the Guesty endpoint calls made by each command.",
      "The raw command remains the escape hatch for endpoints or payload shapes that are not wrapped by a named command.",
      "If api-spec.json is present when this file is generated, request entries include the matched Guesty reference group and title.",
    ],
    ...(existsSync(OPENAPI_FILE) ? {
      openapiSource: { file: "openapi-spec.json", ...readJson(OPENAPI_FILE)["x-cli-source"] },
      components: readJson(OPENAPI_FILE).components ?? {},
    } : {}),
    commands,
    operations: allOperations,
    referenceCoverage: summarizeCoverage(allOperations, reference),
  };

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  if (process.argv.includes("--check")) {
    const existing = readJson(OUTPUT_FILE);
    const expected = { ...spec, generatedAt: existing.generatedAt };
    if (JSON.stringify(existing) !== JSON.stringify(expected)) {
      throw new Error("guesty-cli-spec.json is out of date. Run npm run generate:cli-spec.");
    }
    process.stdout.write("CLI contract matches source and current OpenAPI.\n");
    return;
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(spec, null, 2) + "\n");
  process.stdout.write(`Wrote ${relative(ROOT, OUTPUT_FILE)}\n`);
}

main();
