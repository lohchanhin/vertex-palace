# Multi-Surface Evidence Routing for 0.3.0

## Claim boundary

This is a fixed-oracle product-routing evaluation. It measures whether Vertex
Palace selects the files that were actually changed for one bilingual evidence
maintenance task. It is not an Agent A/B trial and does not establish lower
end-to-end tokens, wall time, tool calls, or higher task correctness than
Control.

Product source: `5cae580a67c3b8d3b6885abb900a69cd285ecbc0`

Benchmark source: `lohchanhin/benchmarks-demo` at
`8aa7886a2404fa5b91a7b59c6bbaa6451f51a277`

Cross-platform CI: [run 29698755147](https://github.com/lohchanhin/vertex-palace/actions/runs/29698755147)

Machine evidence: [multi-surface-evidence-routing-0.3.0.json](./evidence/multi-surface-evidence-routing-0.3.0.json)

## Fixed task and oracle

The exact task was:

> 同步 Vertex Palace v0.3 最终源码与证据提交，更新严格真实仓库精度和高密度记忆预算验证，并保留 control-first 冻结边界与简体中文说明

The oracle was the eight files actually changed by the preceding benchmark
evidence-sync task:

- `src/commands/study.mjs`
- `test/study.test.mjs`
- `results/control-first-v3/plan.json`
- `docs/research/CONTROL_FIRST_V3_PREFLIGHT.md`
- `docs/research/PROTOCOL_V3.md`
- `docs/zh-CN/PROTOCOL_V3.md`
- `README.md`
- `docs/zh-CN/README.md`

No oracle file was added or removed while tuning the route.

## Recorded progression

| Stage | Task type | Matched | Route files | Coverage | Focus | Confidence | Main failure |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Baseline | `test` | 3/8 | 10 | 0.38 | 0.30 | 0.78 | Misclassification and unrelated analysis/test files |
| Intent and surface model | `evaluation` | 4/8 | 10 | 0.50 | 0.40 | Old protocols and unrelated implementation files |
| Role allocation | `evaluation` | 6/8 | 8 | 0.75 | 0.75 | Raw historical evidence JSON displaced current docs |
| Root-document priority | `evaluation` | 7/8 | 8 | 0.88 | 0.88 | Nested historical README displaced the root README |
| Final | `evaluation` | 8/8 | 8 | 1.00 | 1.00 | 0.35 | None for this fixed oracle |

The baseline confidence of 0.78 was too high for 0.38 observed coverage. The
final route remained capped at 0.35 because the task requested four broad
surfaces. Against this one oracle that is underconfident, but it avoids turning
keyword strength into a false claim of route completeness.

## Product changes

- Added bilingual source, evidence, precision, protocol, plan, documentation,
  README, localization, and memory-budget intent recognition.
- Classified pure evidence maintenance only when maintenance action, evidence
  subject, and evidence artifact are all present and no release or repair intent
  overrides it.
- Added generic `src/` implementation and plan/config surfaces.
- Allocated separate route capacity for implementation, test, config, and
  documentation.
- Selected documentation by role: narrative evidence, current protocol, root
  README, and localized counterparts.
- Used version ordering only within a document role, while keeping the root
  README above nested historical result notes.
- Prevented empty normalized non-ASCII entities from matching every path.

## Remaining negative result

The product implementation task that produced this fix changed six files. A
post-commit Palace self-evaluation matched only three of six, with 0.50
changed-file coverage, 0.30 route focus, and confidence 0.35. It missed
`classify-task.ts`, the regression test, and the generated MCP bundle.

A second self-evaluation exposed a different boundary. A documentation-only
task said it was updating "release-candidate machine evidence"; the noun phrase
was interpreted as an instruction to perform a release. The route matched 1/8
changed documentation files, with 0.13 coverage, 0.10 focus, and confidence
0.35. Reference to a release artifact still needs to be distinguished from a
release action.

That result sets the next routing targets:

1. Guarantee a focused verification companion when a bugfix explicitly asks
   for tests.
2. Improve sibling-module coverage for multi-module router changes without
   reopening broad dependency expansion.
3. Model generated artifact provenance so a source change can point to its
   rebuilt MCP or CLI bundle.
4. Separate release-artifact references from verbs that request publication.
5. Re-run the frozen Control-first Agent study before making Token or time
   claims.

## Follow-up: artifact intent and verification companions

Follow-up product source: `ef010c196f3a9ba659e705a363fade8686403b1b`

Follow-up benchmark source: `a0f21d6674b5928c13c4d78af03c3c3f22155d4b`

Follow-up cross-platform CI: [run 29699542507](https://github.com/lohchanhin/vertex-palace/actions/runs/29699542507)

Machine evidence: [release-artifact-routing-0.3.0.json](./evidence/release-artifact-routing-0.3.0.json)

The follow-up separates release-artifact references from publication actions.
Updating release-candidate evidence, release notes, a checklist, or a report is
evaluation work unless an explicit action asks to publish, release, tag, or
bump a version. Actual npm publication, mixed feature-and-release preparation,
release review, release testing, and publication-failure repair remain distinct
task types.

It also reserves a test surface when an evidence task synchronizes source plus
plan/config, and requires a direct test/spec companion when a bounded bugfix
explicitly asks for regression work. A synthetic small-route regression first
reproduced the failure: several high-scoring release verification scripts used
all four route slots and displaced the real router test. The fixed route keeps
the implementation anchor and the focused test without selecting an unrelated
payment test.

| Follow-up evaluation | Matched | Route files | Coverage | Focus | Confidence | Remaining issue |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Real benchmark pin sync | 8/8 | 9 | 1.00 | 0.89 | 0.35 | CI is the one requested route-only file |
| Product self-evaluation | 5/8 | 10 | 0.63 | 0.50 | 0.65 | Missed helper, classifier sibling, and generated MCP bundle |

The benchmark result used the real task that synchronized product source,
research evidence, CI, the control-first v3 plan, English and Simplified
Chinese protocols, and both READMEs while preserving `frozen: false` and zero
Agent outcomes. All eight actual changed files were selected; the explicitly
requested CI workflow was the ninth route file.

The product self-evaluation is deliberately retained as a negative result. It
shows that direct verification is improved, but sibling-module association and
source-to-generated-artifact provenance are not solved. The next engineering
work is therefore to model those relationships without reopening broad import
expansion. None of these results establishes lower end-to-end Agent tokens or
wall time.

## Reproduction

Build product commit `5cae580a67c3b8d3b6885abb900a69cd285ecbc0`,
check out benchmark commit `8aa7886a2404fa5b91a7b59c6bbaa6451f51a277`,
and run `palace evaluate` with the exact task and all eight `--changed-file`
arguments listed above. The final route must contain exactly those eight paths.

---

# 0.3.0 多表面证据路由研究（简体中文）

## 结论边界

这是一项使用固定 oracle 的产品路由评估。它只测量 Vertex Palace 对一个
双语“证据维护任务”能否找到实际改动文件，不是 Agent A/B 测试，也不能证明
相较 Control 已经降低总 Token、总时间、工具调用，或提高最终任务正确率。

产品源码提交：`5cae580a67c3b8d3b6885abb900a69cd285ecbc0`

基准仓库提交：`lohchanhin/benchmarks-demo`
`8aa7886a2404fa5b91a7b59c6bbaa6451f51a277`

跨平台 CI：[run 29698755147](https://github.com/lohchanhin/vertex-palace/actions/runs/29698755147)

机器证据：[multi-surface-evidence-routing-0.3.0.json](./evidence/multi-surface-evidence-routing-0.3.0.json)

## 固定任务与 oracle

任务要求同时同步源码、证据提交、严格精度、高密度记忆预算、control-first
冻结边界和简体中文说明。Oracle 固定为上文列出的八个真实改动文件；调试期间
没有为了提高分数而新增或删除 oracle 文件。

## 研究结果

路线依次由 `3/8`、`4/8`、`6/8`、`7/8` 提升到 `8/8`。最终
changed-file coverage 与 route focus 都为 `1.00`，路线文件数正好为 8，
没有旧协议、原始 trial JSON、无关分析代码或嵌套历史 README。

旧路线在只有 0.38 实际覆盖率时给出 0.78 置信度，明显过高。最终路线因任务
横跨四种表面，置信度仍保守封顶在 0.35；对本次 oracle 来说偏低，但不会把
关键词命中误报成“路线已经完整”。

## 修正内容

- 新增中英文源码、证据、精度、协议、计划、文档、README、本地化和记忆预算意图。
- 只有维护动作、证据主题与资料载体同时出现，而且没有发布或修复意图时，才归类为 evaluation。
- 新增通用 `src/` 实现表面和 plan/config 表面。
- 为实现、测试、配置和文档分别保留路线容量。
- 文档按职责选择叙事证据、当前协议、根 README 与本地化版本。
- 版本号只用于同类文档排序，根 README 不再被历史结果目录中的 README 挤掉。
- 非 ASCII 实体归一化为空字串时不再参与路径匹配。

## 尚未解决

产品自身这次六文件实现变更，Palace 自评仍只命中 3/6，coverage 为 0.50、
focus 为 0.30、置信度为 0.35；遗漏分类模块、回归测试和生成的 MCP bundle。
另一项仅更新研究资料的任务因为提到“发布候选机器证据”，被误判成真正 release，
只命中 1/8，coverage 为 0.13、focus 为 0.10。这说明“引用发布资料”和“要求执行
发布动作”仍需分开。下一阶段会优先研究 bugfix 的测试伴随、多模块兄弟文件、
源码到生成物的 provenance，以及发布名词/动作消歧。端到端 Token 与时间结论仍
必须等待冻结的 Control-first Agent 实验。

## 后续：发布资料意图与测试伴随

后续产品提交：`ef010c196f3a9ba659e705a363fade8686403b1b`

后续 benchmark 提交：`a0f21d6674b5928c13c4d78af03c3c3f22155d4b`

后续跨平台 CI：[run 29699542507](https://github.com/lohchanhin/vertex-palace/actions/runs/29699542507)

机器证据：[release-artifact-routing-0.3.0.json](./evidence/release-artifact-routing-0.3.0.json)

这次修正把“更新发布候选证据、release notes、检查清单或报告”与“真的发布、
建立 tag、提升版本”分开。只有明确发布动作才会进入 release；真实 npm 发布、
混合功能发布准备、发布审核、发布测试与发布失败修复仍保留各自任务类型。

当证据任务同时同步源码与 plan/config 时，路线会保留测试表面；小预算 bugfix
若明确要求回归测试，也必须带上真正的 test/spec 文件。回归 fixture 先复现了
四个路线席位全被高分 release verification 脚本占用、真正 router test 被挤掉的
失败；修复后会保留实现锚点与对应测试，同时不带入无关 payment 测试。

真实 benchmark 同步任务命中全部 8/8 改动文件，并额外带上明确要求的 CI，
coverage 为 1.00、focus 为 0.89、confidence 为 0.35。产品自身八文件自评则只
命中 5/8，coverage 为 0.63、focus 为 0.50、confidence 为 0.65；遗漏新 helper、
分类兄弟模块与生成的 MCP bundle。这个负面结果说明下一阶段应研究 sibling
模块关系和源码到生成物 provenance，而不是重新扩大一般 import 搜索。上述结果
仍不证明端到端 Agent Token 或总时间已经下降。
