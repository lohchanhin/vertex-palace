# Real-Repository Validation for 0.3.0

## Claim boundary

This is a pre-publication product gate, not an Agent-performance benchmark. It
checks whether the packed `vertex-palace@0.3.0` candidate can index pinned real
repositories and retrieve the known implementation and verification files for
issue-style tasks. It does not claim lower end-to-end tokens or wall time than
Control.

## Protocol

- Pack the current repository into an npm tarball and install that tarball in a
  clean temporary prefix.
- Fetch exact commits rather than moving branches.
- Run the same issue-style task twice per repository with a 6,000-token ceiling.
- Require identical execution boundaries across both runs.
- Require the known implementation in Primary and the focused test in Primary
  or Support.
- Require both target recall and strict target precision to equal 1.000. Any
  unexpected boundary file fails the release gate.
- Require no ancestor or descendant overlap between selected route files and
  Excluded paths. A contradictory execution boundary fails the release gate.
- Fail if the context exceeds its budget or tracked files in the cloned project
  change.
- Preserve route files and timing in machine-readable evidence for audit, while
  keeping timing outside the performance claim.

The pinned repositories are:

| Repository | Language | Commit | Known implementation | Known verification |
| --- | --- | --- | --- | --- |
| `colinhacks/zod` | TypeScript | `912f0f51b0ced654d0069741e7160834dca742ee` | `packages/zod/src/v4/core/schemas.ts` | `packages/zod/src/v4/classic/tests/discriminated-unions.test.ts` |
| `psf/requests` | Python | `f361ead047be5cb873174218582f7d8b9fcd9f49` | `src/requests/sessions.py` | `tests/test_requests.py` |

## Recorded result

The checked evidence was regenerated from the pinned release source
`e901c1739c5aa907bc44ebcbd25bbdd7abd75e7a`. The clean packed candidate had
SHA-1 `04602918f8e661a57c8286fb7b6d344baf9fb3aa` and integrity
`sha512-muQvR5KxELoxhFKCUfnASJW58g9xdWp3+u6UJxtzAtiCpz8nh2GWDSm6UNmVIMeFt+qY7IdQ/s5yWrCcwgPRvg==`.

| Repository | Indexed files | Mode | Route confidence | Pack tokens | Target recall | Strict target precision | Extra files | Deterministic |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Zod | 581 | `full-palace` | 0.87 | 1,886 | 1.000 | 1.000 | 0 | Yes, 2/2 |
| Requests | 123 | `full-palace` | 0.72 | 1,574 | 1.000 | 1.000 | 0 | Yes, 2/2 |

Both cloned worktrees remained clean, and all four repetitions reported an
empty selected-versus-Excluded overlap set. Trial elapsed time is retained in the
[machine-readable evidence](./evidence/real-repository-validation-0.3.0.json)
for diagnostics, but is not treated as a performance result because this gate
has no Control arm and the first run includes cold indexing.

Run the gate after building:

```bash
pnpm test:real-repositories
```

To write the checked evidence artifact:

```bash
node scripts/verify-real-repositories.cjs --out docs/research/evidence/real-repository-validation-0.3.0.json
```

## Preflight findings and fixes

The first candidate produced small payloads but omitted both known
implementation files. Zod routed tests and benchmarks; Requests routed tests
while excluding `src/requests`. Investigation found five concrete causes:

1. `fails` did not classify as a bugfix.
2. Substring matching read `grade` inside `upgrades` as evaluation intent.
3. Test-to-source edges used filenames but not symbols.
4. Route seeds consumed nearly the entire route before relationship expansion.
5. Python fallback symbols had unqualified method names and fixed eight-line
   ranges.

The first correction added lexical normalization, bounded searchable symbol
terms, symbol-level test relations, runtime-extension import resolution,
structured Python class/method ranges, relationship capacity, and a
`verificationChangeRisk` signal. It restored 1.000 recall, but each route still
contained four extra files, leaving strict precision at 0.333.

The second investigation found that route capacity was still treated like a
quota, symbol anchors inherited broad file-level relations, relation scores did
not sufficiently account for the destination's own lexical relevance, weak
imports competed with focused test evidence, and explicit v3/v4 paths were
treated as desirable diversity. The latest correction uses an implementation
symbol anchor, evidence-strength thresholds, destination relevance,
verification-first relations, and explicit version coherence. The route limit
is now a ceiling for focused routes rather than a target count.

## Honest interpretation

Both known targets are retrieved on both repositories, repeated boundaries are
deterministic, no unexpected route file remains, and no selected file falls
under an Excluded directory in these two cases. The
strict gate reports precision alongside recall and fails if either falls below
1.000. It proves packaging, cross-language indexing, and exact target retrieval
for these two pinned tasks only. It does not establish a general routing or
Agent-performance advantage.

## Public registry revalidation

After `vertex-palace@0.3.0` was published, the same protocol was rerun against
the tarball downloaded directly from the public npm registry rather than a
workspace pack. The downloaded seven-file artifact matched SHA-1
`9a04440d7e95c4d34e68e1b7e2cd3f6ecd62e83e` and the published SHA-512
integrity, then reported CLI version `0.3.0` after a clean install.

Both pinned repositories again produced identical boundaries in 2/2
repetitions: one implementation file and one focused test, target recall 1.000,
strict target precision 1.000, no selected/Excluded overlap, and clean tracked
worktrees. The [public-package machine evidence](./evidence/real-repository-validation-0.3.0-public.json)
is the artifact used by the Control-first v3 freeze gate. It supersedes the
candidate artifact only for release provenance; the original candidate record
remains unchanged as research history.

## Internal route self-evaluation

The earlier candidate was evaluated against a broad 25-file implementation
task and matched only 5 changed files: 20% changed-file coverage, 50% route
focus, predicted confidence 0.71, and an overconfidence error of 0.51. That
negative result remains part of the research history.

The focused-routing revision was then evaluated against its actual six changed
files. Before breadth vocabulary was corrected, it matched 1/6 files at
confidence 0.42. After recognizing routing quality, validation, MCP, and
distribution as separate task surfaces, a 10-file route matched 4/6 files:
67% changed-file coverage, 40% route focus, predicted confidence 0.35, and an
underconfidence error of 0.32. It still missed the regression test and generated
MCP bundle. This is not part of the two-repository gate; it identifies
cross-surface allocation and generated-artifact awareness as the next routing
research targets.

---

# 0.3.0 真实仓库验证（简体中文）

## 结论边界

这是一项发布前产品门槛，不是 AI Agent 性能基准。它验证本地打包并干净安装的
`vertex-palace@0.3.0`，能否在固定 commit 的真实 TypeScript 与 Python 仓库中，
针对接近真实 issue 的任务找到已知实现文件和验证文件。它不宣称相较 Control
已经降低端到端 Token 或执行时间。

## 验证方法

- 从当前源码生成 npm tarball，并安装到全新的临时目录。
- 使用固定 commit，不跟随会移动的分支。
- 每个仓库使用同一任务重复两次，context 上限为 6,000 tokens。
- 两次运行的执行边界必须完全一致。
- 已知实现必须位于 Primary；对应测试必须位于 Primary 或 Support。
- 目标召回率与严格目标精度都必须等于 1.000；只要出现额外边界文件就判定失败。
- 已选路线与 Excluded 路径之间不得存在祖先或后代重叠；只要执行边界自相矛盾就判定失败。
- 超出预算或修改真实仓库的 tracked 文件时立即失败。
- 路由文件与时间会保留在机器可读证据中供审计，但时间不属于本次性能结论。

## 实测结果

本次证据由固定的发布源码 `e901c1739c5aa907bc44ebcbd25bbdd7abd75e7a`
重新生成；干净安装候选 npm tarball 的 SHA-1 为
`04602918f8e661a57c8286fb7b6d344baf9fb3aa`，integrity 为
`sha512-muQvR5KxELoxhFKCUfnASJW58g9xdWp3+u6UJxtzAtiCpz8nh2GWDSm6UNmVIMeFt+qY7IdQ/s5yWrCcwgPRvg==`。

| 仓库 | 索引文件 | 模式 | 路由置信度 | Pack tokens | 目标召回率 | 严格目标精度 | 额外文件 | 边界稳定性 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Zod | 581 | `full-palace` | 0.87 | 1,886 | 1.000 | 1.000 | 0 | 是，2/2 |
| Requests | 123 | `full-palace` | 0.72 | 1,574 | 1.000 | 1.000 | 0 | 是，2/2 |

两个克隆仓库的 tracked worktree 都保持干净，四次重复的已选路线与 Excluded 路径重叠集均为空。每次执行时间保留在
[机器可读证据](./evidence/real-repository-validation-0.3.0.json)中供诊断，
但由于本门槛没有 Control 组，而且第一次运行包含冷索引，因此不能把它解释为性能结果。

## 预检发现

第一版候选包虽然 payload 很小，却同时漏掉 Zod 和 Requests 的真正实现文件。
修复过程发现：任务分类漏认 `fails`、`upgrades` 被误读为 `grade`、测试与实现只按
文件名关联、种子占满路线、Python 方法范围固定只有 8 行，以及明确要求修改测试
时仍可能错误进入 bypass。

第一阶段修正加入词形归一化、实现体检索词、符号级测试关系、Python 类与方法范围、
关系扩展预留容量，以及 `verificationChangeRisk`。它把目标召回率恢复到 1.000，
但每个仓库仍多出 4 个文件，严格目标精度只有 0.333。

第二阶段发现 route limit 仍被当成必须填满的名额、符号锚点继承了整个大文件的关系、
关系分数没有充分考虑目标文件自身的词义相关度、弱 import 与聚焦测试竞争，以及 v3/v4
被错误当成有益多样性。最新修正改用实现符号锚点、证据强度门槛、目标相关度、测试关系
优先和明确版本一致性。最终两个固定仓库都只返回实现与对应测试，召回率与严格精度均为
1.000。这个结果仍只能证明这两个固定案例，不能扩大解释成普遍性能优势。

## npm 公开包复验

`vertex-palace@0.3.0` 发布后，同一协议改为直接从公共 npm registry 下载 tarball，
不再打包当前工作区。下载到的 7 文件 artifact 的 SHA-1 为
`9a04440d7e95c4d34e68e1b7e2cd3f6ecd62e83e`，SHA-512 integrity 与 registry 一致；
干净安装后 CLI 回报 `0.3.0`。

两个固定仓库再次各完成 2/2 次边界一致复验：路线都只有一个实现文件与一个聚焦测试，
目标召回率 1.000、严格目标精度 1.000、已选路线与 Excluded 无重叠，tracked worktree
保持干净。[公开包机器证据](./evidence/real-repository-validation-0.3.0-public.json)
将用于 Control-first v3 冻结闸门；旧候选证据继续原样保留为研究历史。

## 内部路由自评

早期候选版针对 25 文件宽范围研发任务，只命中 5 个文件：改动覆盖率 20%、路线聚焦度
50%、预测置信度 0.71，过度自信误差 0.51。这个负面结果继续保留。

本次精准路由修正又用实际 6 个改动文件做自评。补齐宽任务语义前只命中 1/6，置信度
0.42；识别 routing quality、validation、MCP 与 distribution 等独立表面后，10 文件路线
命中 4/6，覆盖率 67%、聚焦度 40%、置信度降为 0.35，转为保守但仍漏掉回归测试与生成后的
MCP bundle。下一阶段重点因此是跨表面配额与生成物识别，同时不能为了提高覆盖率重新塞入无关文件。
