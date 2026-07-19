# Agent Preflight 0.3.0

Date: 2026-07-20 (UTC+08:00)

Status: non-formal engineering preflight. npm publication and the frozen v3
study remain pending.

## Why This Preflight Exists

The deterministic 0.3.0 product tests prove that True Adaptive Bypass can
return a three-field payload and that guarded memory can include the intended
history. They do not prove that a complete Codex run uses fewer tokens, fewer
tools, or less wall time. This preflight executed one sequential four-arm run
for a small local bug and one for a history-dependent tenant decision before
freezing the formal protocol.

## Small Local Task

All four arms made the exact one-file repair and passed the public and hidden
tests. Adaptive selected `bypass` and delivered only 177 bytes, but the agent
then performed more repository inspection than Control.

| Metric | Control | Adaptive | Adaptive minus Control |
| --- | ---: | ---: | ---: |
| Correct scope | 100/100 | 100/100 | equal |
| Palace payload | none | 177 bytes / about 45 tokens | one compact call |
| Tool calls | 5 | 11 | +6 |
| Inspection commands | 2 | 4 | +2 |
| Reported tokens | 104,596 | 119,207 | +14,611 |
| Uncached input tokens | 19,545 | 20,914 | +1,369 |
| Wall time | 48.8 s | 54.2 s | +5.5 s |

The product-level bypass contract passed; the end-to-end efficiency objective
did not. A small Palace payload is not sufficient when the agent inventories
the repository afterward.

## Memory-Dependent Task

The cold-index task intentionally left the tenant owner out of public tests.
Adaptive selected `guarded-memory-palace`, delivered 2 of 2 relevant memory
items with zero exclusions, and promoted Aurora to the only Primary file.

| Arm | Hidden oracle | Scope | Changed file | Reported tokens | Wall time |
| --- | --- | ---: | --- | ---: | ---: |
| Control | pass | 100/100 | Aurora | 310,115 | 159.5 s |
| Route-only | fail | 0/100 | Borealis | 236,146 | 179.8 s |
| Full Palace | pass | 100/100 | Aurora | 233,159 | 140.1 s |
| Adaptive | pass | 100/100 | Aurora | 133,334 | 92.8 s |

Adaptive used 176,781 fewer reported tokens and 66.7 fewer seconds than
Control in this single run. This is a favorable descriptive observation, not
an inferential result. Control also chose Aurora correctly, so the required
Control-fail/Adaptive-pass discordance has not yet been demonstrated.

Route-only selected Borealis and failed the hidden oracle while both
memory-bearing arms selected Aurora. That supports the memory mechanism
relative to structure-only routing, but it does not establish superiority over
normal Codex exploration.

## Measurement Defects Found

1. The harness initially rejected the valid compact bypass because it expected
   a full context-pack header and echoed task. It now verifies the task from
   the recorded command and measures the three-field output directly.
2. Cold Palace initialization created an untracked `.palace/` directory. The
   harness now preserves this in raw Git evidence as instrumentation while
   excluding it from source-change scoring.
3. The v0.3 memory telemetry line was richer than the old parser. The harness
   now records included, candidate, and excluded counts instead of `null`.
4. The product now adds `/.palace/` idempotently to `.git/info/exclude`, never
   edits tracked `.gitignore`, supports linked worktrees, and leaves non-Git
   directories alone. A clean packed-install test confirms that `git status`
   remains empty after `palace context --auto`.

## Current Research Conclusion

- Relevant memory fidelity is working in the tested package contract and in
  this Agent preflight: 2/2 relevant items were delivered.
- True bypass is working as a transport contract: the payload was 177 bytes.
- End-to-end savings are not established. Small-local Adaptive was worse than
  Control because subsequent exploration consumed the payload savings.
- One memory run is encouraging for efficiency, but correctness benefit versus
  Control is still unproven.
- No npm release claim is made. Public `latest` remains 0.2.3.

The product's own closeout evaluation for this seven-file change selected only
2/7 actual files: changed-file coverage 0.29, route focus 0.33, confidence 0.35,
and assessment `needs-review`. It found the release verifier and README but
missed the Core initialization change, its regression test, the generated MCP
bundle, and both research records. The low confidence was appropriately
conservative, but multi-surface maintenance routing still needs work.

## Next Direction

1. Give every benchmark arm the same explicit completion criteria, then make
   Adaptive obey its Primary, Deferred, Do Not, and Stop Condition boundaries.
   This tests route guidance without hiding a prompt-quality advantage.
2. Randomize the historical tenant owner by seed so the public repository does
   not repeatedly reward an Aurora guess. Memory and the hidden oracle will use
   the same concealed assignment.
3. Run fresh seeds sequentially with balanced order. The primary comparison is
   Adaptive versus Control; reported tokens are the primary efficiency metric,
   with correctness and scope as mandatory gates.
4. Preserve every valid, invalid, favorable, and unfavorable arm in sanitized
   public evidence before any npm 0.3.0 publication decision.

The corresponding harness details and machine-readable preflight evidence live
in the public
[benchmarks-demo repository](https://github.com/lohchanhin/benchmarks-demo).

## 简体中文说明

这次预跑的目的，不是证明 Vertex Palace 已经胜过 Codex，而是检查产品级契约能否
转化成完整 Agent 执行收益。

小型单文件任务中，四个 Arm 都正确且只修改目标文件。Adaptive 确实选择 bypass，
Palace 输出只有 177 bytes；但 Agent 后续又扩大探索，因此相对 Control 多 6 次工具
调用、多 14,611 reported tokens，并慢 5.5 秒。结论是：真正 bypass 的输出已经成立，
但仅缩小输出还不够，必须约束后续探索与停止条件。

记忆依赖任务中，Adaptive 纳入 2/2 条相关记忆、零排除，并把 Aurora 提升为唯一
Primary；Full 与 Adaptive 都正确，Route-only 选择 Borealis 并被 hidden oracle 拒绝。
Adaptive 单次相对 Control 少 176,781 reported tokens、快 66.7 秒，但 Control 也独立
选对 Aurora，所以仍未出现“Control 失败、Adaptive 成功”的决定性结果。这只能算
有利的方向性信号，不能当成正式统计结论。

预跑同时发现并修复三项测量问题：旧 harness 不认识三字段 bypass、冷启动的
`.palace/` 被误计为源码改动、旧 parser 无法读取 0.3 的记忆纳入/候选/排除格式。
产品也会把 `/.palace/` 幂等写入本地 `.git/info/exclude`，不会修改项目的
`.gitignore`；干净 tarball 安装已验证执行 context 后 `git status` 保持为空。

产品对这次七文件收尾任务的自评也只有 2/7：changed-file coverage 0.29、route
focus 0.33、confidence 0.35，并判定 `needs-review`。它找到 release verifier 与
README，却漏掉 Core 初始化实现、回归测试、生成 MCP 和两份研究记录；低置信度是
合理的，但多表面维护路线仍需继续改善。

下一步会把停止条件公平地应用到各 Arm，按 seed 随机化真正的历史 tenant owner，
再以交替顺序运行多组新 trial。正式主比较仍是 Adaptive 对 Control，正确性与修改
范围必须先通过，reported tokens 才能进入效率比较。npm 的 `latest` 目前仍保持
0.2.3，尚未发布 0.3.0。
