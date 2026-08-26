import path from "node:path";
import { Node, Project, SyntaxKind, type ObjectLiteralExpression, type SourceFile } from "ts-morph";
import type { ParsedEvidenceFact, ParsedFile, ParsedSymbol } from "@vertex-palace/shared";
import { extractSearchTerms } from "../utils/lexical-tokens";
import { normalizeRelativePath } from "../utils/path-utils";

export function parseTsJs(sourcePath: string, content: string, language: string): ParsedFile {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, jsx: 4 } });
  const sourceFile = project.createSourceFile(sourcePath, content, { overwrite: true });
  const imports = [...new Set([
    ...sourceFile.getImportDeclarations().map((item) => item.getModuleSpecifierValue()),
    ...extractCommonJsImports(sourceFile)
  ])];
  const exports = [
    ...sourceFile.getExportDeclarations().map((item) => item.getModuleSpecifierValue() ?? item.getText().slice(0, 120)),
    ...sourceFile.getExportAssignments().map((item) => item.getText().slice(0, 120))
  ];

  const symbols: ParsedSymbol[] = [];

  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName();
    if (!name) continue;
    symbols.push(makeSymbol(name, "function", fn));
  }

  for (const variable of sourceFile.getVariableDeclarations()) {
    if (!variable.getFirstAncestorByKind(SyntaxKind.SourceFile)) continue;
    const initializer = variable.getInitializer();
    if (!initializer) continue;
    if (
      initializer.getKind() === SyntaxKind.ArrowFunction ||
      initializer.getKind() === SyntaxKind.FunctionExpression ||
      initializer.getKind() === SyntaxKind.CallExpression ||
      /^[A-Z]/.test(variable.getName())
    ) {
      symbols.push(makeSymbol(variable.getName(), "const", variable));
    }
  }

  for (const variable of sourceFile.getVariableDeclarations()) {
    const initializer = variable.getInitializer();
    if (!initializer || !Node.isObjectLiteralExpression(initializer)) continue;
    for (const property of initializer.getProperties()) {
      if (Node.isMethodDeclaration(property)) {
        symbols.push(makeSymbol(`${variable.getName()}.${cleanPropertyName(property.getName())}`, "method", property));
        continue;
      }
      if (!Node.isPropertyAssignment(property)) continue;
      const value = property.getInitializer();
      if (!value || (!Node.isFunctionExpression(value) && !Node.isArrowFunction(value))) continue;
      symbols.push(makeSymbol(`${variable.getName()}.${cleanPropertyName(property.getName())}`, "method", property));
    }
  }

  for (const cls of sourceFile.getClasses()) {
    const className = cls.getName();
    if (!className) continue;
    symbols.push(makeSymbol(className, "class", cls));
    for (const method of cls.getMethods()) {
      symbols.push(makeSymbol(`${className}.${method.getName()}`, "method", method));
    }
  }

  for (const iface of sourceFile.getInterfaces()) {
    symbols.push(makeSymbol(iface.getName(), "interface", iface));
  }

  for (const alias of sourceFile.getTypeAliases()) {
    symbols.push(makeSymbol(alias.getName(), "type", alias));
  }

  const testCases = extractTestCases(sourceFile);
  const facts = testCases.map((testCase) => makeTestCaseFact(testCase.expression, testCase.title, testCase.call));

  const generatedArtifacts = extractTsupArtifacts(sourceFile);
  const testCaseTerms = extractTestCaseTerms(testCases);

  return {
    sourcePath,
    language,
    imports,
    exports,
    symbols: dedupeSymbols(symbols),
    ...(facts.length ? { facts } : {}),
    ...(generatedArtifacts.length ? { generatedArtifacts } : {}),
    summarySeed: [
      imports.length ? `Imports: ${imports.join(", ")}` : "",
      symbols.length ? `Symbols: ${symbols.map((s) => s.name).join(", ")}` : "",
      testCaseTerms ? `Test cases: ${testCaseTerms}` : ""
    ]
      .filter(Boolean)
      .join(". ")
  };
}

type ParsedTestCase = {
  expression: string;
  title: string;
  call: Node;
};

function extractTestCases(sourceFile: SourceFile): ParsedTestCase[] {
  return sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).flatMap((call) => {
    const expression = call.getExpression().getText().replace(/\s+/g, "");
    if (!isTestCaseCall(expression)) return [];
    const title = literalString(call.getArguments()[0]);
    return title ? [{ expression, title, call }] : [];
  });
}

function extractTestCaseTerms(testCases: ParsedTestCase[]): string {
  return extractSearchTerms([...new Set(testCases.map((testCase) => testCase.title))].join(" "), 240);
}

function extractCommonJsImports(sourceFile: SourceFile): string[] {
  return sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).flatMap((call) => {
    if (call.getExpression().getText() !== "require") return [];
    const modulePath = literalString(call.getArguments()[0]);
    return modulePath ? [modulePath] : [];
  });
}

function isTestCaseCall(expression: string): boolean {
  return /^(?:test|it|describe|suite|specify|context)(?:$|\.|[A-Z_])/.test(expression)
    || /(?:^|\.)(?:test|it|describe|suite|specify|context)(?:$|\.)/.test(expression);
}

function extractTsupArtifacts(sourceFile: SourceFile): NonNullable<ParsedFile["generatedArtifacts"]> {
  const importsTsup = sourceFile.getImportDeclarations().some((item) => item.getModuleSpecifierValue() === "tsup");
  if (!importsTsup) return [];

  const artifacts: NonNullable<ParsedFile["generatedArtifacts"]> = [];
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getText() !== "defineConfig") continue;
    const config = call.getArguments()[0];
    if (!config || !Node.isObjectLiteralExpression(config)) continue;
    const outDir = propertyString(config, "outDir");
    if (!outDir) continue;
    const extension = outputExtension(config);
    for (const entry of entryPoints(config)) {
      artifacts.push({
        inputPath: normalizeRelativePath(entry.inputPath),
        outputPath: normalizeRelativePath(path.posix.join(outDir, `${entry.outputName}${extension}`)),
        tool: "tsup"
      });
    }
  }
  return [...new Map(artifacts.map((artifact) => [`${artifact.inputPath}:${artifact.outputPath}`, artifact])).values()];
}

function entryPoints(config: ObjectLiteralExpression): Array<{ inputPath: string; outputName: string }> {
  const entryProperty = config.getProperty("entry");
  if (!entryProperty || !Node.isPropertyAssignment(entryProperty)) return [];
  const initializer = entryProperty.getInitializer();
  if (!initializer) return [];

  if (Node.isObjectLiteralExpression(initializer)) {
    return initializer.getProperties().flatMap((property) => {
      if (!Node.isPropertyAssignment(property)) return [];
      const inputPath = literalString(property.getInitializer());
      if (!inputPath) return [];
      return [{ inputPath, outputName: property.getName().replace(/^['"]|['"]$/g, "") }];
    });
  }

  const inputs = Node.isArrayLiteralExpression(initializer)
    ? initializer.getElements().map(literalString).filter((value): value is string => Boolean(value))
    : [literalString(initializer)].filter((value): value is string => Boolean(value));
  return inputs.map((inputPath) => ({
    inputPath,
    outputName: path.posix.basename(inputPath).replace(/\.[^.]+$/, "")
  }));
}

function propertyString(config: ObjectLiteralExpression, name: string): string | undefined {
  const property = config.getProperty(name);
  return property && Node.isPropertyAssignment(property)
    ? literalString(property.getInitializer())
    : undefined;
}

function outputExtension(config: ObjectLiteralExpression): string {
  const property = config.getProperty("outExtension");
  if (!property) return ".js";
  return property
    .getDescendantsOfKind(SyntaxKind.StringLiteral)
    .map((literal) => literal.getLiteralValue())
    .find((value) => /^\.[cm]?js$/i.test(value)) ?? ".js";
}

function literalString(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralValue();
  return undefined;
}

function cleanPropertyName(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

function makeSymbol(name: string, kind: ParsedSymbol["kind"], node: Node): ParsedSymbol {
  const startLine = node.getStartLineNumber();
  const endLine = node.getEndLineNumber();
  return {
    name,
    kind,
    startLine,
    endLine,
    signature: signatureFor(node),
    searchText: [exactIdentifierReferences(node), extractSearchTerms(node.getText())]
      .filter(Boolean)
      .join(" ")
  };
}

function exactIdentifierReferences(node: Node): string {
  return [...new Set(
    node.getDescendantsOfKind(SyntaxKind.Identifier)
      .map((identifier) => identifier.getText())
      .filter((identifier) => identifier.length > 1)
  )].slice(0, 80).join(" ");
}

function makeTestCaseFact(expression: string, title: string, node: Node): ParsedEvidenceFact {
  const suite = /(?:^|\.)(?:describe|suite|context)(?:$|\.|[A-Z_])/.test(expression);
  return {
    name: title,
    kind: suite ? "test-suite" : "test-case",
    role: "verification",
    startLine: node.getStartLineNumber(),
    endLine: node.getEndLineNumber(),
    searchText: extractSearchTerms(`${title} ${node.getText()}`, 80),
    confidence: 1
  };
}

function signatureFor(node: Node): string {
  const text = node.getText().replace(/\s+/g, " ").trim();
  const brace = text.indexOf("{");
  const semicolon = text.indexOf(";");
  const cut =
    brace >= 0 && semicolon >= 0 ? Math.min(brace, semicolon) : brace >= 0 ? brace : semicolon >= 0 ? semicolon + 1 : text.length;
  return text.slice(0, Math.min(cut, 240)).trim();
}

function dedupeSymbols(symbols: ParsedSymbol[]): ParsedSymbol[] {
  const seen = new Set<string>();
  return symbols.filter((symbol) => {
    const key = `${symbol.name}:${symbol.startLine}:${symbol.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
