import type { ParsedFile, ParsedHeading } from "@vertex-palace/shared";

export function parseMarkdown(sourcePath: string, content: string): ParsedFile {
  const headings: ParsedHeading[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      headings.push({
        depth: match[1].length,
        text: match[2],
        line: index + 1
      });
    }
  });

  return {
    sourcePath,
    language: "markdown",
    imports: [],
    exports: [],
    headings,
    symbols: headings.map((heading) => ({
      name: heading.text,
      kind: "const",
      startLine: heading.line,
      endLine: heading.line,
      signature: `${"#".repeat(heading.depth)} ${heading.text}`
    })),
    summarySeed: headings.length
      ? `Markdown headings: ${headings
          .slice(0, 16)
          .map((heading) => heading.text)
          .join(", ")}`
      : content.replace(/\s+/g, " ").trim().slice(0, 500)
  };
}
