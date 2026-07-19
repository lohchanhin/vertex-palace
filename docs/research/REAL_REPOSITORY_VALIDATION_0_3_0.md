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
- Fail if the context exceeds its budget or tracked files in the cloned project
  change.
- Report extra routed files instead of hiding them.

The pinned repositories are:

| Repository | Language | Commit | Known implementation | Known verification |
| --- | --- | --- | --- | --- |
| `colinhacks/zod` | TypeScript | `912f0f51b0ced654d0069741e7160834dca742ee` | `packages/zod/src/v4/core/schemas.ts` | `packages/zod/src/v4/classic/tests/discriminated-unions.test.ts` |
| `psf/requests` | Python | `f361ead047be5cb873174218582f7d8b9fcd9f49` | `src/requests/sessions.py` | `tests/test_requests.py` |

## Recorded result

The checked evidence was generated from product commit
`c835860d0d63f4c3ddd83b01c5cbb182b216bc9e`. Its cross-platform
[GitHub Actions run](https://github.com/lohchanhin/vertex-palace/actions/runs/29696299788)
passed, and the packed candidate had SHA-1
`20a351363316ff5227ffe5cc5bfc75a281c7ad74`.

| Repository | Indexed files | Mode | Route confidence | Pack tokens | Target recall | Strict target precision | Extra files | Deterministic |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Zod | 581 | `full-palace` | 0.85 | 2,700 | 1.000 | 0.333 | 4 | Yes, 2/2 |
| Requests | 123 | `full-palace` | 0.77 | 2,597 | 1.000 | 0.333 | 4 | Yes, 2/2 |

Both cloned worktrees remained clean. Trial elapsed time is retained in the
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

The corrected candidate adds lexical normalization, bounded searchable symbol
terms, symbol-level test relations, runtime-extension import resolution,
structured Python class/method ranges, relationship capacity, and a
`verificationChangeRisk` signal that prevents bypass when a task explicitly
requests test changes.

## Honest interpretation

Both known targets are now retrieved on both repositories and repeated
boundaries are deterministic. The route still includes extra context, so target
precision is reported alongside 100% target recall. This gate proves packaging,
cross-language indexing, and target retrieval for these two fixed cases only.
It does not establish a general performance advantage.

## Internal route self-evaluation

The same candidate was evaluated against its own broad implementation task.
The task changed 25 files across parsers, indexing, routing, tests,
distribution, and documentation. A 10-file route matched only 5 changed files:
20% changed-file coverage, 50% route focus, predicted confidence 0.71, and an
overconfidence error of 0.51. This is not part of the two-repository gate, but
it is retained as a negative result. The next research target is lower route
noise, task-width-aware capacity, and confidence calibrated to intent and
changed-file coverage.

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
- 超出预算或修改真实仓库的 tracked 文件时立即失败。
- 额外命中的文件会如实记录，不会为了好看而隐藏。

## 实测结果

本次证据由产品提交 `c835860d0d63f4c3ddd83b01c5cbb182b216bc9e`
生成；对应的跨平台
[GitHub Actions](https://github.com/lohchanhin/vertex-palace/actions/runs/29696299788)
已通过，候选 npm tarball 的 SHA-1 为
`20a351363316ff5227ffe5cc5bfc75a281c7ad74`。

| 仓库 | 索引文件 | 模式 | 路由置信度 | Pack tokens | 目标召回率 | 严格目标精度 | 额外文件 | 边界稳定性 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Zod | 581 | `full-palace` | 0.85 | 2,700 | 1.000 | 0.333 | 4 | 是，2/2 |
| Requests | 123 | `full-palace` | 0.77 | 2,597 | 1.000 | 0.333 | 4 | 是，2/2 |

两个克隆仓库的 tracked worktree 都保持干净。每次执行时间保留在
[机器可读证据](./evidence/real-repository-validation-0.3.0.json)中供诊断，
但由于本门槛没有 Control 组，而且第一次运行包含冷索引，因此不能把它解释为性能结果。

## 预检发现

第一版候选包虽然 payload 很小，却同时漏掉 Zod 和 Requests 的真正实现文件。
修复过程发现：任务分类漏认 `fails`、`upgrades` 被误读为 `grade`、测试与实现只按
文件名关联、种子占满路线、Python 方法范围固定只有 8 行，以及明确要求修改测试
时仍可能错误进入 bypass。

修正版加入词形归一化、实现体检索词、符号级测试关系、Python 类与方法范围、关系
扩展预留容量，以及 `verificationChangeRisk`。最终两个仓库的已知目标召回率均为
100%，但仍存在额外上下文，因此报告同时保留 target precision。这个结果只证明
这两个固定案例的打包、跨语言索引和目标检索通过，不能扩大解释成普遍性能优势。

## 内部路由自评

同一候选版也针对自身这次宽范围研发任务做了评估。实际修改横跨解析、索引、路由、测试、
发行与文档，共 25 个文件；10 文件路线只命中其中 5 个，改动覆盖率 20%、路线聚焦度 50%、
预测置信度 0.71，过度自信误差 0.51。这不属于上述两个真实仓库门槛，但作为负面结果保留。
下一阶段重点是降低路线噪声、按任务宽度动态分配容量，并让置信度同时反映任务意图与实际覆盖率。
