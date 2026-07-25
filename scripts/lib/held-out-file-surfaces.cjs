const path = require("node:path");

const allowedAuxiliaryExtensions = [
  ".cfg",
  ".conf",
  ".ini",
  ".json",
  ".md",
  ".mdx",
  ".rst",
  ".toml",
  ".txt",
  ".yaml",
  ".yml"
];
const allowedAuxiliaryBasenames = new Set([".flake8", "go.mod"]);

function classifyFileSurfaces(changedFiles, primaryExtensions, maximumAuxiliaryFiles) {
  if (changedFiles.some(isExcludedPath)) return rejected("contains-excluded-path");

  const auxiliaryFiles = changedFiles.filter(isAllowedAuxiliaryPath);
  if (auxiliaryFiles.length > maximumAuxiliaryFiles) {
    return rejected("too-many-auxiliary-files");
  }

  const extensionSet = new Set(primaryExtensions.map((extension) => extension.toLowerCase()));
  const auxiliarySet = new Set(auxiliaryFiles);
  const primarySourceFiles = changedFiles.filter(
    (file) => !auxiliarySet.has(file)
      && extensionSet.has(path.posix.extname(file).toLowerCase())
  );
  if (primarySourceFiles.length + auxiliaryFiles.length !== changedFiles.length) {
    return rejected("contains-unsupported-extension");
  }

  const testFiles = primarySourceFiles.filter(isFocusedTestPath);
  const implementationFiles = primarySourceFiles.filter((file) => !isFocusedTestPath(file));
  if (!testFiles.length || !implementationFiles.length) {
    return rejected("missing-implementation-or-test");
  }

  return {
    eligible: true,
    reason: null,
    primarySourceFiles,
    implementationFiles,
    testFiles,
    auxiliaryFiles
  };
}

function isFocusedTestPath(sourcePath) {
  const normalized = sourcePath.toLowerCase();
  return /(^|\/)(?:test|tests|spec|specs|__tests__)(\/|$)/.test(normalized)
    || /(?:^|\/)(?:test_[^/]+|[^/]+_(?:test|spec))\.[^/]+$/.test(normalized)
    || /(?:^|\/)[^/]*(?:test|tests|spec)\.[^/]+$/.test(normalized);
}

function isExcludedPath(sourcePath) {
  const normalized = sourcePath.toLowerCase();
  return /(^|\/)(?:bench|benches|benchmark|benchmarks|build|coverage|dist|examples?|fixtures?|generated|node_modules|snapshots?|vendor)(\/|$)/.test(normalized)
    || /(?:^|\/)license(?:\.|$)/.test(normalized)
    || /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock|cargo\.lock|go\.sum)$/.test(normalized)
    || /\.snap$/.test(normalized);
}

function isAllowedAuxiliaryPath(sourcePath) {
  const normalized = sourcePath.toLowerCase();
  const basename = path.posix.basename(normalized);
  if (allowedAuxiliaryBasenames.has(basename)) return true;
  return allowedAuxiliaryExtensions.includes(path.posix.extname(normalized));
}

function rejected(reason) {
  return {
    eligible: false,
    reason,
    primarySourceFiles: [],
    implementationFiles: [],
    testFiles: [],
    auxiliaryFiles: []
  };
}

module.exports = {
  allowedAuxiliaryExtensions,
  classifyFileSurfaces
};
