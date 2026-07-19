# Provenance-Aware Routing Research for 0.3.0

## Claim boundary

This report evaluates Vertex Palace routing, packaging, memory telemetry, and
context contracts. It does **not** establish that a complete Codex Agent run is
faster, uses fewer reported tokens, makes fewer tool calls, or succeeds more
often than Control. Repository-token and pack-token values below are static
scanner estimates, not Agent billing or end-to-end prompt totals.

Final product source: `2d167f81d688160649a8768c863b4e5fe188d1a6`

Benchmark source: `lohchanhin/benchmarks-demo` at
`2e4d3ac6e2a689fa617ba1e52cb9d672f95d4c09`

Machine evidence: [provenance-routing-0.3.0.json](./evidence/provenance-routing-0.3.0.json)

Supporting evidence:

- [release-candidate-0.3.0.json](./evidence/release-candidate-0.3.0.json)
- [real-repository-validation-0.3.0.json](./evidence/real-repository-validation-0.3.0.json)

The public npm `latest` version remained `0.2.3` while this research candidate
identified itself as `0.3.0`. No npm publication or Git release tag was created.

## What changed

The index now records package entry points, workspace-package imports, local
co-consumers, and declared tsup input-to-output provenance. Generated CLI and
MCP bundles remain routable as lightweight nodes, but their bundled source is
excluded from repository-token estimates.

Route expansion now balances high-weight `changed_with`, `configures`, and
`depends_on` relations across anchors. Broad tasks may reserve several source
or test concepts, while focused routes keep stricter limits. Classification and
surface selection distinguish implementation terms from publication actions
and machine-evidence maintenance.

The final follow-up also separates low-signal words such as `input`, `output`,
`value`, and `option` from discriminative bug symptoms. A bugfix implementation
that coherently matches several specific symptoms receives a bounded bonus.
Focused routes admit a second strong implementation seed at 75% of the leading
score, preserving true single-file bypass while avoiding false bypass when a
second implementation file is materially relevant.

## Final fixed-oracle results

| Evaluation | Matched | Route files | Coverage | Focus | Confidence | Static pack |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Real benchmark evidence sync | 9/9 | 9 | 1.00 | 1.00 | 0.35 | 2,657 |
| Product self-evaluation, default limit 10 | 9/17 | 10 | 0.53 | 0.90 | 0.35 | 5,505 |
| Product self-evaluation, expanded limit 18 | 13/17 | 18 | 0.76 | 0.72 | 0.35 | 5,815 |
| Documentation/evidence closeout | 3/5 | 6 | 0.60 | 0.50 | 0.65 | 4,910 |

The benchmark task crossed a study generator, focused test, frozen plan,
English and Simplified Chinese protocols, both READMEs, preflight notes, and
machine evidence. The final built CLI selected exactly all nine oracle files.
Its static estimate was 1,023,371 repository tokens versus 2,657 packed tokens.
That result proves route focus for this oracle only.

The product self-evaluation is intentionally retained as a negative result.
At the default ten-file capacity it missed eight changed files. At eighteen
files it still missed both structured parsers, `analyze-task.ts`, and the
indexer regression test, while adding five route-only integration files. A
larger route improved recall but reduced focus; capacity alone is not the next
solution.

The final documentation self-evaluation found the new narrative report, the
real-repository report, and its JSON, but missed the new provenance JSON and
the refreshed release-candidate JSON. It selected an older multi-surface
report, its evidence, and the root README instead. This establishes a separate
multi-evidence role-allocation problem: one evidence slot is insufficient when
the task explicitly refreshes several named evidence artifacts.

## Real-repository gate

Pinned clean clones were evaluated twice each from a clean tarball install:

| Repository | Language | Expected route | Trials | Recall | Precision |
| --- | --- | --- | ---: | ---: | ---: |
| Zod `912f0f5` | TypeScript | v4 core discriminated union + focused v4 test | 2 | 1.00 | 1.00 |
| Requests `f361ead` | Python | redirect-auth method + focused regression test | 2 | 1.00 | 1.00 |

Both runs produced deterministic Primary/Support boundaries and left tracked
worktrees clean. Zod packed about 1,886 estimated tokens; Requests packed about
1,574. These are routing and packaging checks, not Agent A/B outcomes.

## Failures retained as evidence

1. Initial provenance tests failed because workspace imports were unresolved
   and the machine-evidence surface was absent; 73 unrelated tests passed.
2. Declared generated output was initially invisible because the scanner
   correctly ignored plugin bundles. The fix added virtual provenance nodes
   instead of removing the ignore rule.
3. Counting the 9 MB generated bundle temporarily inflated the repository
   estimate from about 150,000 to about 5,000,000 tokens. Generated artifacts
   are now reported and skipped explicitly.
4. Product self-evaluations progressed through 6/11 and 9/13, then regressed to
   3/16 when implementation work containing the word `evaluation` was
   misclassified. Action-aware classification fixed that regression.
5. The final built CLI still reached only 9/17 at its default limit and 13/17
   at an expanded limit. This remains open.
6. A Chinese task asking for an English and Simplified Chinese research report
   excluded `docs/`. `研究报告`, `测试`, and explicit `补齐机器证据` maintenance
   language now receive documentation, test, and evidence intent without
   turning English implementation phrases into artifact requests.
7. The first post-provenance real-repository run failed Zod: a four-match
   semantic cap made the legacy v3 implementation narrowly outrank the correct
   v4 codec path. The new discriminative scoring restored v4.
8. A stronger fixture then failed, and the first scoring repair caused two
   full-suite regressions: 0.50 evaluation coverage and a false bypass. The
   final focused-seed threshold restored the second implementation file while
   preserving all four true small-local bypass trials.

## Verification

- Workspace build passed.
- TypeScript no-emit check passed.
- 86/86 workspace tests passed: 82 core, 2 MCP, and 2 CLI.
- MCP smoke passed with all 10 tools.
- Clean tarball install reported `vertex-palace@0.3.0` with seven package files.
- Four of four large-repository small-local trials selected a 200-byte bypass
  payload targeting `src/format-currency.mjs`.
- Relevant memory delivered 1/1 item; dense memory delivered 3/50 and reported
  all 47 exclusions inside the 5,000-token ceiling.
- Zod and Requests real-repository gates passed twice each.

## Interpretation and next direction

The strongest current evidence is that Vertex Palace can provide compact,
auditable, deterministic routes, preserve selected historical context, and
avoid generated-bundle accounting errors. It is not yet evidence that Vertex
Palace outperforms plain Codex end to end.

The next research order is:

1. Replace broad-route capacity growth with hierarchical intent groups and
   explicit parser/indexer/test companions.
2. Calibrate confidence against route capacity and observed coverage; a fixed
   0.35 cap is conservative but not informative enough.
3. Pin `2d167f8` in the Control-first v3 benchmark while preserving
   `frozen: false` and zero Agent outcomes.
4. Run sequential, randomized Control / Adaptive / Full Palace Agent trials,
   using cumulative reported tokens as the primary efficiency outcome.
5. Add a truly memory-dependent scenario that can produce a discordant
   correctness or scope outcome, rather than a task solvable from public code.
6. Publish npm 0.3.0 only after those gates and a user-present 2FA verification.

---

# 0.3.0 Provenance 路由研究（简体中文）

## 结论边界

这轮研究已经证明的，是 Vertex Palace 能建立更完整的依赖与生成物关系、输出较小且
可审计的路线、记录记忆纳入与排除原因，并通过真实仓库与干净安装验证。它**还没有
证明**完整 Codex Agent 一定更快、更省 reported tokens、更少工具调用，或比纯 Codex
拥有更高成功率。文中的仓库 Token 与 pack Token 都是静态估算，不是端到端消耗。

最终产品源码为 `2d167f81d688160649a8768c863b4e5fe188d1a6`；npm `latest`
仍为 `0.2.3`，研究候选版本是 `0.3.0`，本轮没有发布 npm 或建立正式 tag。

## 最新结果

- 真实 benchmark 双语证据同步任务：`9/9`，coverage `1.00`，focus `1.00`，
  静态上下文约由 `1,023,371` 降到 `2,657`。
- 产品自身 17 文件广域改造：默认 10 步只命中 `9/17`，coverage `0.53`；
  放宽到 18 步后命中 `13/17`，coverage `0.76`、focus `0.72`。
- 最终文档与证据同步自评只命中 `3/5`，coverage `0.60`、focus `0.50`；
  它漏掉新的 provenance JSON 与 release-candidate JSON，却带入旧的 multi-surface 资料。
- Zod 与 Requests 各运行两次，目标 recall/precision 都为 `1.00`，路线边界一致。
- build、类型检查、MCP smoke、干净 tarball 安装与 86/86 测试全部通过。
- 4/4 small-local 任务真正选择 bypass，每次只返回约 200 bytes。
- 高密度记忆场景检索 50 条、纳入 3 条、明确排除 47 条，仍在 5,000 Token 上限内。

## 客观判断

Vertex Palace 对“跨代码、测试、计划、双语文档、机器证据”的固定任务已经有明显帮助；
但对自身这种 17 文件广域重构，路线仍会漏 parser、任务分析与 indexer 测试。把路线从
10 个文件扩大到 18 个虽然提高召回，却引入 5 个非 oracle 文件，因此不能把“多塞文件”
当成解决方案。

这轮也保留了所有失败：生成 bundle 一度让估算膨胀到约 500 万 Token；中文研究报告
任务一度排除 docs；真实 Zod 一度误选 v3；第一次修正后又造成评估覆盖率下降和假 bypass。
这些问题都经过回归测试与真实仓库重新验证后才关闭。

## 后续方向

下一步先改进广域任务的分层召回与置信度校准，再把最终源码固定进 Control-first v3。
其中要单独处理“同一任务明确更新多份机器证据”的角色容量，不能继续只保留一个 evidence。
之后按顺序、随机化地运行 Control / Adaptive / Full Palace Agent 对照，以累计 reported
tokens 为主要效率指标，并设计真正依赖历史决策、可能产生 Control 失败而 Adaptive 成功的
memory-dependent 场景。没有完成这些证据前，不应宣称 Vertex Palace 已经实现端到端加速，
也不应发布 npm 0.3.0。
