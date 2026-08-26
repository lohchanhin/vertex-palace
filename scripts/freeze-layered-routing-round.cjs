const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const round = Number(valueAfter("--round"));
assert.ok(round === 22 || round === 23, "--round must be 22 or 23");

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const manifestPath = path.join(
    projectRoot,
    "docs",
    "research",
    "evidence",
    `layered-routing-targets-round-${round}.json`
  );
  const runnerPath = path.join(projectRoot, "scripts", "run-layered-routing-round.cjs");
  const outputPath = path.join(
    projectRoot,
    "docs",
    "research",
    "evidence",
    `layered-routing-freeze-round-${round}.json`
  );
  const [manifestSource, runnerSource] = await Promise.all([
    readFile(manifestPath, "utf8"),
    readFile(runnerPath, "utf8")
  ]);
  const manifest = JSON.parse(manifestSource);
  assert.equal(manifest.targets.length, 12);
  assert.equal(manifest.candidate, "0.4.0-alpha.2");
  assert.equal(manifest.baseline, "0.3.0");
  assert.deepEqual(
    countBy(manifest.targets, "stratum"),
    { local: 3, reference: 3, "high-connectivity": 3, control: 3 }
  );
  assert.deepEqual(
    countBy(manifest.targets, "language"),
    { typescript: 3, python: 3, go: 3, rust: 3 }
  );
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), `vertex-palace-freeze-${round}-`));
  try {
    const candidate = pack(projectRoot, temporaryRoot);
    const baseline = pack("vertex-palace@0.3.0", temporaryRoot);
    assert.equal(candidate.version, manifest.candidate);
    assert.equal(baseline.version, manifest.baseline);
    const freeze = {
      schemaVersion: 1,
      studyId: manifest.studyId,
      round,
      frozenAt: new Date().toISOString(),
      sourceCommit: run("git", ["rev-parse", "HEAD"], projectRoot).stdout.trim(),
      claimBoundary: "Hash freeze created before either condition was run on any selected target. Target tasks, truth layers, gates, runner, and product packages may not change after this point.",
      products: {
        candidate: {
          package: `vertex-palace@${candidate.version}`,
          integrity: candidate.integrity,
          shasum: candidate.shasum
        },
        baseline: {
          package: `vertex-palace@${baseline.version}`,
          integrity: baseline.integrity,
          shasum: baseline.shasum
        }
      },
      artifacts: {
        manifestPath: path.relative(projectRoot, manifestPath).replaceAll("\\", "/"),
        manifestSha256: sha256(manifestSource),
        runnerPath: path.relative(projectRoot, runnerPath).replaceAll("\\", "/"),
        runnerSha256: sha256(runnerSource),
        resolvedReferenceMetadataSha256: sha256(JSON.stringify(
          manifest.targets.filter((target) => target.metadata).map((target) => ({
            id: target.id,
            number: target.referenceNumber,
            metadata: target.metadata
          }))
        ))
      },
      gates: {
        referenceGrounding: 1,
        controlAbstention: 1,
        routableCoreClosure: 1,
        macroCoreCoverage: 0.9,
        macroRouteFocus: 0.7,
        perTargetCoverage: 0.5,
        perTargetFocus: 0.4,
        declaredAuxiliaryCoverage: 1,
        commonNonInferiorityMargin: -0.05,
        contextTokenCeiling: 6000
      }
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(freeze, null, 2)}\n`, "utf8");
    process.stdout.write(`${outputPath}\n`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function pack(spec, destination) {
  const result = run(
    "npm",
    ["pack", spec, "--json", "--ignore-scripts", "--pack-destination", destination],
    projectRoot
  );
  const parsed = JSON.parse(result.stdout);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

function countBy(values, key) {
  return Object.fromEntries([...new Set(values.map((value) => value[key]))].map(
    (name) => [name, values.filter((value) => value[key] === name).length]
  ));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}
