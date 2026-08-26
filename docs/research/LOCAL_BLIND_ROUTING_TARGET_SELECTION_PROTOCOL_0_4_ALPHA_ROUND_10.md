# Local Blind Routing Target Selection Protocol (0.4 Alpha, Round 10)

## Status and Claim Boundary

This protocol was locally frozen before inspecting any Round 10 repository
history, commit subject, diff, task, or Vertex Palace output. Only repository
URLs and HEAD object IDs obtained with `git ls-remote <url> HEAD` were observed.

The competition result freeze currently forbids committing or pushing product
or research changes. Therefore the English and Simplified Chinese protocols,
repository pool, selector, support classifiers, candidate CLI, and baseline CLI
are locked by SHA-256 in a local freeze manifest instead of a Git commit. The
selector rechecks every digest and writes a create-only result.

This makes the round useful for internal product decisions, but it is **not a
public preregistration** and cannot support an external generalization claim.
After the competition freeze ends, any publishable confirmation must use a new
repository pool and a committed protocol before selection.

## Fresh Freeze

Round 10 begins after the disclosed Round 9 repair chain was preserved. None of
the sixteen Round 10 repository histories, commit subjects, diffs, tasks, or
oracles were opened while those repairs were developed. The selector already
uses complete shallow-history fetches, per-repository inspection-error capture,
and create-only failure preservation before this first attempt is frozen.

## Research Question

Before paying for another end-to-end Agent experiment, does the repaired local
0.4 candidate recover implementation, focused-test, and bounded auxiliary
evidence for unseen real-repository tasks while keeping routes focused, modes
safe, and delivered context bounded?

The priority order is fixed:

1. task-type correctness;
2. changed-file and causal-surface coverage;
3. route focus and precision;
4. calibrated confidence and safe mode selection;
5. delivered payload;
6. static command time.

A smaller payload is not a benefit when required evidence is missing.

## Frozen Products

The local freeze manifest binds:

- baseline commit `67c0a2ce8754cece3773d5fd16b89dae4e3af0c1`;
- the offline-rebuilt baseline `dist/palace.cjs` digest;
- the current locally built candidate `dist/palace.cjs` digest;
- the candidate source-tree digest and generated MCP bundle digest;
- this protocol, its Chinese counterpart, the repository pool, selector,
  task classifier, and file-surface classifier.

Any digest mismatch aborts selection or validation. Product code may not be
changed after this freeze until the first Round 10 result is preserved.

## Complete Repository Exclusion

The exclusion set is derived recursively from the frozen Round 9 pool:

- every repository excluded before Round 9; and
- all sixteen Round 9 primary and fallback repositories, whether inspected or
  not.

The expected union contains 113 unique repository URLs. Round 10 contains sixteen
new URLs, four per language family. Organization or ecosystem overlap remains a
limitation and will be reported.

## Binding Repository Order

Round 10 selects eight targets, exactly two each from JavaScript/TypeScript,
Python, Go, and Rust. The pool is interleaved by family. The first two eligible
repositories in each family win; later repositories in that family remain
uninspected after its quota is full.

## Mechanical Task Selection

For each inspected repository, the newest eligible commit among at most 300
non-merge commits wins. Eligibility is unchanged from Round 9:

1. exactly one parent is available;
2. the unedited first non-empty subject is 20 to 180 characters and receives a
   task type from the frozen behavioral-subject classifier;
3. the diff modifies 2 to 8 files and every status is `M`;
4. at least one implementation file and one focused-test file use the frozen
   primary-language extensions;
5. at most two existing documentation or configuration files may be included;
6. generated output, locks, vendor code, fixtures, snapshots, examples,
   benchmarks, build output, coverage, and distributions are excluded;
7. total changed lines are 2 to 400; and
8. every oracle file exists at the parent and selected commit.

The parent commit is the route state. The selected commit is ground truth. The
unedited subject is the task. Every eligible modified file is part of the
changed-file oracle. The selector contains no Palace invocation path.

## Environment and Preservation

- Fetch depth: 400 commits, with complete objects for that shallow history and
  no lazy promisor fetch during inspection.
- Materialization attempts: at most 3 with a 5-second delay.
- A setup failure advances only to the next frozen repository in that family.
- Selection is sequential.
- The manifest is create-only and preserves failures.
- No selected task may be sent to either Palace condition until the paired
  validation protocol and validator are locally hash-frozen.

Selection output:

`docs/research/evidence/local-blind-routing-target-manifest-0.4-alpha-round-10.json`

## Next Gate

Selection alone is not a product result. The paired static validator will use
identical repositories and tasks for baseline and candidate, two determinism
repetitions, a 6,000-token context ceiling, and balanced AB/BA condition order.
Only an absolute static evidence pass may advance to a separately frozen
end-to-end Agent protocol. Static routing cannot establish Agent correctness,
reported Token savings, fewer tool calls, or lower wall time.
