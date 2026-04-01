import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const COMMANDS_DIR = join(ROOT, "src", "commands");
const OUTPUT_FILE = join(ROOT, "guesty-cli-spec.json");
const PACKAGE_FILE = join(ROOT, "package.json");
const OPTIONAL_REFERENCE_FILE = join(ROOT, "api-spec.json");
const OPTIONAL_SCHEMAS_FILE = join(ROOT, "schemas.json");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function listCommandFiles() {
  const host = ts.sys;
  return host.readDirectory(COMMANDS_DIR, [".ts"], undefined, ["**/*.ts"]).sort();
}

function getLiteralValue(node) {
  if (!node) return null;
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

  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Command") {
    return {
      root: "Command",
      newArgs: [...(node.arguments ?? [])],
      segments: [],
    };
  }

  return null;
}

function loadSchemas() {
  if (!existsSync(OPTIONAL_SCHEMAS_FILE)) return new Map();
  try {
    const raw = readJson(OPTIONAL_SCHEMAS_FILE);
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
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

      const commandName = getLiteralValue(chain.newArgs?.[0]);
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

    ts.forEachChild(node, visit);
  }

  visit(actionNode);
  return [...params.values()];
}

function extractRequestDetails(actionNode, sourceFile, reference) {
  const collectedParams = collectParamAssignments(actionNode, sourceFile);
  const requests = [];

  function matchReference(method, path) {
    if (!path) return null;
    const matches = reference.byKey.get(`${method} ${normalizePath(path)}`) ?? [];
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
          reference: matchReference(method, path),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(actionNode);
  return requests;
}

function parseOptionSegment(segment, sourceFile) {
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
    (segment) => segment.kind === "call" && (segment.name === "option" || segment.name === "requiredOption")
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
  const parsedSyntax = parseSyntax(syntax);
  const rootAction = !commandSegment;
  const fullCommand = rootAction
    ? `guesty ${rootCommand.name}`
    : `guesty ${rootCommand.name} ${syntax}`;

  return {
    id: fullCommand,
    rootAction,
    name: rootAction ? rootCommand.name : parsedSyntax.name,
    syntax,
    fullCommand,
    description: descriptionSegment ? getLiteralValue(descriptionSegment.args[0]) : null,
    arguments: rootAction
      ? argumentSegments.map((segment) => parseArgumentSegment(segment, sourceFile))
      : parsedSyntax.args,
    options: optionSegments.map((segment) => parseOptionSegment(segment, sourceFile)),
    inputCapabilities: {
      supportsDataOption: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--data ")),
      supportsTextOption: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--text ")),
      supportsDataFileOption: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--data-file ")),
      supportsStdinFlag: optionSegments.some((segment) => String(getLiteralValue(segment.args[0]) ?? "").includes("--stdin")),
      readsJsonFromStdin: actionText.includes("JSON.parse(await readStdin())"),
      readsTextFromStdin: actionText.includes("await readStdin()") && !actionText.includes("JSON.parse(await readStdin())"),
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
  for (const operation of operations) {
    for (const request of operation.requests) {
      if (!request.path) continue;
      implementedKeys.add(`${request.method} ${normalizePath(request.path)}`);
    }
  }

  const coveredGroups = [];
  for (const [group, endpoints] of reference.byGroup.entries()) {
    const covered = new Set();
    for (const endpoint of endpoints) {
      if (implementedKeys.has(`${endpoint.method} ${endpoint.normalizedPath}`)) {
        covered.add(`${endpoint.method} ${endpoint.normalizedPath}`);
      }
    }
    coveredGroups.push({
      group,
      implementedEndpoints: covered.size,
      referenceEndpoints: endpoints.length,
    });
  }

  coveredGroups.sort((a, b) => b.implementedEndpoints - a.implementedEndpoints || b.referenceEndpoints - a.referenceEndpoints);

  return {
    referenceFile: reference.file,
    implementedUniqueEndpoints: implementedKeys.size,
    referenceEndpoints: reference.totalEndpoints,
    implementedGroups: coveredGroups.filter((group) => group.implementedEndpoints > 0).length,
    referenceGroups: coveredGroups.length,
    missingImplementedEndpoints: [],
    groups: coveredGroups,
  };
}

function main() {
  const packageJson = readJson(PACKAGE_FILE);
  const reference = parseReference();
  const commandFiles = listCommandFiles();
  const commands = [];
  const allOperations = [];

  for (const file of commandFiles) {
    const { rootCommand, sourceFile } = parseRootCommand(file);
    if (!rootCommand) continue;

    const operations = collectOperations(sourceFile, rootCommand, reference);
    commands.push({
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
    commands,
    operations: allOperations,
    referenceCoverage: summarizeCoverage(allOperations, reference),
  };

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(spec, null, 2) + "\n");
  process.stdout.write(`Wrote ${relative(ROOT, OUTPUT_FILE)}\n`);
}

main();
