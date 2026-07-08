import { Project, SyntaxKind, type Node } from "ts-morph";
import type { ParsedFile, ParsedSymbol } from "@context-palace/shared";

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

  return {
    sourcePath,
    language,
    imports,
    exports,
    symbols: dedupeSymbols(symbols),
    summarySeed: [imports.length ? `Imports: ${imports.join(", ")}` : "", symbols.length ? `Symbols: ${symbols.map((s) => s.name).join(", ")}` : ""]
      .filter(Boolean)
      .join(". ")
  };
}

function makeSymbol(name: string, kind: ParsedSymbol["kind"], node: Node): ParsedSymbol {
  const startLine = node.getStartLineNumber();
  const endLine = node.getEndLineNumber();
  return {
    name,
    kind,
    startLine,
    endLine,
    signature: signatureFor(node)
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
