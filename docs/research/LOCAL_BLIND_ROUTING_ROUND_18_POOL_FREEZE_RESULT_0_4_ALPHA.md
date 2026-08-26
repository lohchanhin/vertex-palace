# Local Blind Routing Round 18 Pool-Freeze Result (0.4 Alpha)

## Result

Round 18 stopped during URL-and-HEAD-only pool construction. The fourth planned
repository, `https://github.com/serde-rs/ryu.git`, returned `Repository not
found`. The create-only failure recorder preserved three successful HEADs and
the exact failing diagnostic. No canonical pool was written.

This is a protocol input result, not a Vertex Palace performance result.

## Preserved Boundary

- The frozen plan and order were not edited after the query.
- No substitute repository was inserted.
- Three successful HEADs and the failed fourth identity are now recursively
  excluded from later rounds.
- No history, subject, diff, task, semantic review, or oracle was inspected.
- Candidate-task Palace calls remained 0.
- Target selection, static validation, and v5 Agent A/B were not authorized.

## Protocol Learning

Two consecutive invalid legacy repository URLs show that aborting a whole round
on one unreachable URL is unnecessarily brittle. Reachability is infrastructure
metadata, not a product outcome. The next protocol will freeze a larger ordered
URL roster, query HEAD only, record every result, mechanically skip only URLs
that definitively do not exist, and select the first fixed number of reachable
repositories per language family. Transient network exhaustion will still abort
the round rather than silently changing membership.
