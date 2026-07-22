# 未见跨仓库路由结果（0.4 Alpha，第二轮）

## 结果

**失败。** 冻结候选版本 `0ef19a7bbef1901d813b81389405f87482db47c5` 在六个机械选择的目标中 `0/6` 通过，因此不能进入 Control 与 Adaptive Agent 实验。

预注册的 `12/12` 次 trial 全部完成，没有环境、仓库 setup、manifest 或 harness contract 失败。这次结果属于冻结协议下的产品路由与分类失败。

这六个仓库与任务从现在起都是公开开发数据，后续调校版本不能再把它们当作 held-out 证据。

## 冻结证据

- 产品候选版本：`0ef19a7bbef1901d813b81389405f87482db47c5`
- 选择器与选择协议 commit：`0f3a8bc13c9de670cc4f3caf880f3bfb6b744bc2`
- Target manifest commit：`4dfdf420fe56d397946e6f7920528697f1cd9629`
- Manifest SHA-256：`694BF80DDB45A381F19FCA993674A71EA5BA78EB963258E3A2675C416D3B09A8`
- 验证协议与 harness commit：`eb529b416d05560003dff480d30b81e8293eab73`
- 原始证据 commit：`237a173bfd474e31a35f5beac5d829c69d82f995`
- 原始证据：`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json`
- 原始证据 SHA-256：`F6F31375C3C300F32C25063AFC493DD536CDC1A96748199C557772A5275DE438`
- 证据类别：`preregistered-held-out-static-routing`
- 正式执行次数：一次 create-only 观察

Task type 勘误在任何选中任务执行 Palace 前写入验证协议，没有删除、替换或改写目标。

## 汇总

| 目标 | 通过 | 完成 trials | 核心完整目标 | Macro coverage | Macro focus | Macro precision | Overconfident trials | 最大 context | Setup/harness failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 0 | 12/12 | 4/6 | 0.667 | 0.183 | 0.185 | 4 | 3,784 | 0 |

每个目标的两次路线完全一致。所有仓库在显式 index 后都是 fresh，tracked Git 状态保持干净，context 没有超过 6,000 token，selected 与 excluded boundary 也没有重叠。

## 各目标结果

| 仓库 | 核心覆盖 | Changed-file coverage | Focus | Precision | Confidence | 路由文件数 | 主要失败 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Express | 1.00 | 1.00 | 0.22 | 0.222 | 0.78 | 9 | 正确文件对之外又加入七个 sibling |
| HTTPX | 1.00 | 1.00 | 0.22 | 0.222 | 0.74 | 9 | 正确文件对之外又加入七个 auth/client sibling |
| urfave/cli | 0.00 | 0.00 | 0.00 | 0.000 | 0.68 | 2 | 错误聚焦到 `help.go` 与 `help_test.go`；过度自信 |
| Clap | 1.00 | 1.00 | 0.33 | 0.333 | 0.74 | 9 | 找齐三个文件但加入六个 sibling；task type 为 `unknown` |
| Commander | 1.00 | 1.00 | 0.33 | 0.333 | 0.72 | 9 | 找齐三个文件但加入六个 sibling |
| pytest | 0.00 | 0.00 | 0.00 | 0.000 | 0.76 | 9 | 两个核心文件都遗漏；过度自信 |

## 路由实际表现

### Express

Palace 找到 `lib/request.js` 与 `test/req.acceptsCharsets.js`，之后仍用其他 request acceptance tests 和无关 request/response tests 填满剩余位置。核心召回正确，但 route limit 对这个任务仍像 quota。

### HTTPX

Palace 找到 `httpx/_auth.py` 与 `tests/test_auth.py`，之后加入七个广泛的 auth、client、API 和 properties 文件。任务信息足以找到精确文件对，但完整文件对出现后没有触发通用 evidence-sufficiency stop。

### urfave/cli

任务要求让 help output 中的 completion subcommand 顺序保持确定。Palace 提前停在 `help.go` 与 `help_test.go`，漏掉真正的 `completion.go` 与 `completion_test.go`。这里不是路线太长，而是聚焦锚点错误：`help output` 压过更具体的 completion-subcommand 概念。零覆盖时 confidence 为 `0.68`，两次都 overconfident。

### Clap

Palace 找齐两个 completion-engine implementation 与一个 engine testsuite 文件，但仍用 completion、builder 和 multiple-value sibling 填满九个位置。另外，`feat(complete): Index-aware ValueCompleter` 被分类为 `unknown`，说明 scoped Conventional Commit 语法处理不完整。

### Commander

Palace 找到 `lib/command.js` 与两个 executable-subcommand tests，之后又加入 typings、example 和四个无关 command tests。三文件召回完整，但 focus 与 precision 只有 `0.33`。

### pytest

Palace 走向 hooks、JUnit、泛化 fixtures、Python collection、monkeypatch、doctest 与 reports，完全漏掉 `src/_pytest/main.py` 与 `testing/test_conftest.py`。任务中的 Directory re-collection 与 fixture identity 关系被稀释成宽泛 fixture/collection 关键词。零覆盖时 confidence 为 `0.76`，两次都 overconfident。

## 主要发现

1. **已知文件对修复没有泛化成通用停止规则。** 四个目标完整召回核心文件，却全部仍然填满九个 route slot。
2. **窄范围 bounded bugfix 之外，route limit 仍像 quota。** 前一轮修复没有覆盖 feature 或更广泛的 bugfix 证据模式。
3. **提前停止前必须验证锚点。** urfave/cli 只返回两个文件，但它们是错误的 implementation-test pair。
4. **具体复合意图会输给宽泛展示概念。** `completion subcommand` 输给 `help output`；`Directory re-collection` 与 `fixture identity` 被拆成一般 pytest fixture 文件。
5. **Confidence 与直接身份、锚点差距的绑定仍不足。** 零覆盖路线仍得到 `0.68` 与 `0.76`。
6. **Scoped Conventional Commit 语法覆盖不完整。** `feat(complete):` 被判成 `unknown`。
7. **验证环境可靠。** 所有 trial 完成，索引 fresh，tracked worktree 干净，telemetry shape 正常，context 也在预算内。

第二轮 macro coverage `0.667` 高于第一轮的 `0.50`，但两轮仓库与任务不同，因此这不是受控 before/after 比较，不能称为已测得的改善。

## 解释限制

- 六个目标仍然是小样本，但已覆盖 JavaScript/TypeScript、Python、Go 与 Rust。
- Oracle 来自未改写 commit subject 对应的完整 Git diff，不同任务的可观察信息不同。
- 静态路由失败足以拒绝晋级，但不直接等同最终 Agent 任务正确率。
- Route payload 和 context 大小不能证明 Agent 节省 Token、加快执行或减少工具调用。
- 证据中的时间只用于诊断。

## 晋级决定

候选版本 `0ef19a7` 被拒绝进入 Agent A/B。下一候选必须修复通用机制，不能写死目标仓库或路径：

1. 将 evidence-sufficiency stop 扩展到 feature 与一般多表面路线，而不只聚焦 bugfix；
2. 提前停止前，使用具体任务概念和竞争锚点分差验证 implementation-test pair；
3. 保留 completion、collection、directory、fixture-identity 与 scoped symbol 的复合意图，避免拆成宽泛单词；
4. 识别 `feat(scope):`、`fix(scope):` 等 Conventional Commit 形式；
5. 使用直接 implementation/test 身份、关系证据、请求表面覆盖与锚点歧义校准 confidence；
6. 没有直接证据时，将 confidence 保持在 sufficiency threshold 以下；
7. 将六个任务加入公开开发回归，之后必须再选择第三组 untouched、预注册仓库，才可进入 Agent A/B。

本结果不授权任何性能或发布声明。
