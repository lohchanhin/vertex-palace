# Local Blind Routing Round 17 Pool-Freeze Result (0.4 Alpha)

## Result

Round 17 stopped during URL-and-HEAD-only repository-pool construction. The
12th planned repository, `https://github.com/serde-rs/itoa.git`, returned
`Repository not found`. No canonical Round 17 pool or HEAD evidence was written.

This is a protocol input failure, not a Vertex Palace performance result.

## Preserved Boundary

- The frozen 32-repository plan was not edited.
- No substitute repository was inserted after the failure.
- Eleven HEAD queries completed in memory before the 12th failed.
- No commit history, subject, diff, candidate task, or oracle was inspected.
- Palace calls on candidate tasks remained 0.
- Target selection and static validation never started.
- A v5 Agent A/B study remains unauthorized.

The failed URL and all 11 preceding attempted repository identities must be
excluded from the next round. The remaining 20 Round 17 repositories were never
queried and may be reused under a new plan, supplemented with fresh repositories
before any new HEAD query.

## Next Step

Round 18 will preserve the same final design and absolute product gate while
replacing only the failed pre-pool protocol instance. It must still provide
eight fallback repositories per language family, select two targets per family,
and reject ambiguity conservatively.
