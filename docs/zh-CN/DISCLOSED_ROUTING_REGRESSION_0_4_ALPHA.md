# 已公开路由失败开发回归结果（0.4 Alpha）

## 结果

**作为已见开发回归通过，但不能视为 held-out 证据。** 候选版本 `0ef19a7bbef1901d813b81389405f87482db47c5` 修复了第一轮未见仓库研究公开的四个路由失败。预先规定的 `8/8` 次开发回归 trial 全部完成，并通过静态门槛。

这个结果不能证明泛化能力。Fastify、Click、Cobra 与 Marked 已经在研发修复期间被检查过，因此它们只能证明已知问题没有复发。候选版本仍必须通过一组全新、未接触的仓库，才有资格进入 Agent A/B 实验。

## 冻结证据

- 候选版本与验证脚本 commit：`0ef19a7bbef1901d813b81389405f87482db47c5`
- 原始证据：`docs/research/evidence/disclosed-routing-regression-0.4-alpha.json`
- 原始证据 SHA-256：`536795FF78A6F4F7B6E0498D2E73342B805284F1C8CBED99A248C3BB73B70C90`
- 第一轮 held-out 失败证据：`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json`
- 第一轮证据 SHA-256：`B466582D48A1E2B70ED679BA4ADD7AB5192EF0F3E6A875CB70B7C0C336396606`
- 证据类别：`seen-development-regression`
- `heldOutAgainstCandidate`：`false`

目标 manifest 与第一轮 held-out 原始证据都没有被修改。量测前，脚本逐项验证固定的 route commit、ground-truth commit subject、父子关系和 changed-file oracle。

## 汇总

| 目标数 | 通过 | 完成 trials | Macro coverage | Macro focus | Macro precision | Overconfident trials | 最大 context | Setup failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 4 | 8/8 | 1.00 | 1.00 | 1.00 | 0 | 5,992 | 0 |

每个仓库的两次路线都完全一致。所有仓库在显式索引后均为 fresh，Palace 没有修改 tracked Git 文件，上下文没有超过 6,000 token 门槛，selected 与 excluded boundary 也没有重叠。

## 各目标结果

| 仓库 | 精确路线 | Coverage | Focus | Precision | Confidence | 校准 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Fastify | `lib/route.js`；`test/find-route.test.js` | 1.00 | 1.00 | 1.00 | 0.90 | well-calibrated |
| Click | `src/click/_compat.py`；`tests/test_utils.py` | 1.00 | 1.00 | 1.00 | 0.66 | underconfident |
| Cobra | `completions.go`；`completions_test.go` | 1.00 | 1.00 | 1.00 | 0.71 | underconfident |
| Marked | `bin/main.js`；`test/unit/bin.test.js` | 1.00 | 1.00 | 1.00 | 0.61 | underconfident |

修复后的路线会在实现与测试两文件组合处停止，不再机械填满九个位置。三项 underconfident 比原先的 overconfident 更安全，但仍需使用全新观察结果继续校准。

## 加入的通用机制

1. 在任务、symbol 与路径之间统一 camelCase、snake_case 和 hyphenated 名称的词法身份。
2. 将 Python absolute package import 解析到索引中的 `src`、仓库根目录或 `lib` 候选。
3. 将 `test_*.py`、`*_test.go`、`*Test.java` 等语言测试命名识别为 verification surface。
4. 将仓库中的 `bin` 路径识别为 CLI implementation surface。
5. 聚焦的实现与测试配对同时使用路径亲和度、import 证据、语义证据和规范化 basename。
6. 对有强证据的 bounded bugfix，把 route limit 当成上限；找到完整文件对后即可停止，不再添加无关 sibling。
7. 隐式 bypass 只有在整条物理路线确实只有一个文件时成立，避免 support 证据被静默丢弃。
8. 当歧义任务或复合任务缺乏足够证据时，主动降低 confidence。
9. 验证遥测在读取 boundary 和 payload 前，统一 full、route-lite 与 bypass context response shape。

生产路由规则没有写入任何仓库名称、commit hash 或目标专属路径。

## 候选版本自我评估

构建后，同一候选版本对这次真实 15 文件修复任务进行评估：

| 路由文件 | 命中的改动文件 | Changed-file coverage | Route focus | Confidence | 校准 | 评估 |
| ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6 | 4/15 | 0.27 | 0.67 | 0.40 | well-calibrated，误差 0.13 | needs-review |

这是仍需正视的限制。Confidence 安全性已经改善：复杂路线不会再冒充证据充分；但对于同时涉及 implementation、indexer、生成 bundle、验证脚本和测试的广泛任务，多表面召回仍然不足。Palace 必须保持 advisory，Agent 必须依据当前代码与测试继续扩大检查范围。

## 解释限制

- 这四个仓库在第一轮 `0/4` held-out 失败后已经成为开发资料。
- 每项两次重复可以证明本轮行为确定，但不能估计总体可靠性。
- 静态路线覆盖和 context 大小不代表最终 Agent 正确率、reported tokens、wall time 或工具调用数。
- 最大 context 为 5,992 estimated tokens，已经接近 6,000 上限，context packing 仍需压力测试。
- 本结果不支持任何 Agent 节省 Token 或提高速度的声明。

## 晋级决定

候选版本通过了已公开问题的开发回归，但**不能**直接进入 Agent A/B。下一道门槛是机械选择、预注册且完全未接触的跨仓库池，并继续要求：

1. aggregate changed-file coverage `>= 0.90`，且每个目标都不能漏掉必要的 implementation/test surface；
2. route focus 与 precision `>= 0.75`；
3. 重复执行得到确定路线；
4. overconfident trial 为零；
5. 索引 fresh、tracked worktree 干净、telemetry shape 已统一、context 不超预算；
6. 原始证据不可覆盖，并明确区分产品、脚本和环境失败。

只有全新的 untouched study 通过后，才可以启动 Control 与 Adaptive Agent 实验。
