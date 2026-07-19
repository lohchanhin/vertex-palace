import path from "node:path";
import { Node, Project, SyntaxKind, type ObjectLiteralExpression, type SourceFile } from "ts-morph";
import type { ParsedFile, ParsedSymbol } from "@vertex-palace/shared";
import { extractSearchTerms } from "../utils/lexical-tokens";
import { normalizeRelativePath } from "../utils/path-utils";

export function parseTsJs(sourcePath: string, content: string, language: string): ParsedFile {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, jsx: 4 } });
  const sourceFile = project.createSourceFile(sourcePath, content, { overwrite: true });
  const imports = sourceFile.getImportDeclarations().map((item) => item.getModuleSpecifierValue());
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

  const generatedArtifacts = extractTsupArtifacts(sourceFile);

  return {
    sourcePath,
    language,
    imports,
    exports,
    symbols: dedupeSymbols(symbols),
    ...(generatedArtifacts.length ? { generatedArtifacts } : {}),
    summarySeed: [imports.length ? `Imports: ${imports.join(", ")}` : "", symbols.length ? `Symbols: ${symbols.map((s) => s.name).join(", ")}` : ""]
      .filter(Boolean)
      .join(". ")
  };
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

function makeSymbol(name: string, kind: ParsedSymbol["kind"], node: Node): ParsedSymbol {
  const startLine = node.getStartLineNumber();
  const endLine = node.getEndLineNumber();
  return {
    name,
    kind,
    startLine,
    endLine,
    signature: signatureFor(node),
    searchText: extractSearchTerms(node.getText())
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
