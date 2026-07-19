# Small-OSS Real-History Protocol for 0.3.0

Status: selection locked before the first Vertex Palace route.

## Claim Boundary

This is an engineering gate for one independently defined small open-source
repository. It tests package routing, a real Git-history oracle, a public
architecture contract, and the upstream ground-truth tests. It does not run a
Codex Agent and cannot establish Token, time, or correctness advantages over
Control.

## Selection Rule

The repository was selected without observing a Palace route. The rule was:

- public repository with an OSI-approved license;
- no more than 100 tracked files at the routed parent commit;
- a closed public issue and a later real commit that changes both the product
  surface and focused tests;
- a repository-provided test command runnable on Node.js 20 or newer; and
- preserve the result even if Palace routing or the current dependency
  resolution fails.

The locked case is [`sindresorhus/p-limit`](https://github.com/sindresorhus/p-limit):

- license: MIT;
- 15 tracked files at parent `c944e4a4363ff41a7202d5dec346cc174c3ecf49`;
- issue: [#97, `limitFunction: overly permissive type hint`](https://github.com/sindresorhus/p-limit/issues/97);
- real ground-truth commit: `ccb80b2721a6a4a27ce5ad7721fe939162a35b31`;
- real diff oracle: `index.d.ts` and `index.test-d.ts`;
- architecture evidence: `package.json` exports runtime from `index.js`, types
  from `index.d.ts`, and runs compile-time tests with `tsd`.

## Routed Task

> Fix the overly permissive public `limitFunction` type. It currently accepts
> synchronous functions even though limiting synchronous execution has no
> effect. Restrict it to asynchronous functions, preserve inferred argument
> and return types, and add focused compile-time regression coverage using the
> repository's existing type-test setup.

Required route files are the two files in the real commit diff. `package.json`
is accepted as architecture support; any other boundary file lowers accepted
precision. Two runs must produce identical boundaries under a 6,000-token
ceiling. After routing the parent, the harness checks out the real target,
installs dependencies with lifecycle scripts disabled, and runs upstream
`npm test`. Because the repository has no committed lockfile, dependency
resolution is explicitly recorded as unpinned.

## Reproduction

The protocol commit must exist before running:

```bash
pnpm build
node scripts/verify-small-oss-history.cjs --out docs/research/evidence/small-oss-history-validation-0.3.0-after-boundary-consistency-fix.json
```

The output records a failure before returning non-zero, so an unfavorable case
cannot disappear by replacing the repository.

## Locked Iteration Record

The first run is preserved in
`docs/research/evidence/small-oss-history-validation-0.3.0.json` at commit
`872f7da7ef47785f518d0c097063882a496a3623`. It achieved complete recall but
routed four files outside the accepted boundary (`acceptedPrecision: 0.333`).
The preregistered `npm test` command also failed in `xo` after resolving current
unpinned dependencies.

Commit `acec14ef9cbb0a404f2418768774695759137c2b` implements a general
type-declaration intent rule and benchmark-path penalty. The repository, task,
parent, ground-truth commit, required files, accepted boundary, route budget,
and pass thresholds remain unchanged for the post-fix run. The harness still
requires the complete upstream `npm test`; separate `ava` and `tsd` runs are
diagnostics only and cannot turn a failed upstream command into a pass.

The post-type-route result is preserved at commit
`510bbfe111c9ffd6bed46e44df64d96e2a8bc700`. Its routing gate passed with
`requiredRecall: 1` and `acceptedPrecision: 1`, but audit found that selected
source paths could still appear in `excluded` through sibling symbol nodes.
Commit `81beebceb5c040658a4886a4b49039daa54f693b` fixes that path-level boundary
contradiction. A final unchanged-oracle rerun remains required.

---

# 0.3.0 小型开源仓库真实历史协议（简体中文）

状态：仓库与 Oracle 已在第一次 Vertex Palace 路由前锁定。

## 结论边界

这是一项独立定义的小型开源仓库工程闸门，验证候选包路由、真实 Git history Oracle、
公开 architecture contract 与上游真实测试。它不会启动 Codex Agent，不能证明相对
Control 更省 Token、更快或更正确。

## 选择规则

仓库是在观察 Palace 路线前按以下规则选定：

- 使用 OSI 认可许可的公开仓库；
- routed parent commit 不超过 100 个 tracked files；
- 有已关闭公开 issue，后续真实 commit 同时修改产品表面与聚焦测试；
- 仓库自己的测试命令可在 Node.js 20 或以上运行；
- 即使 Palace 路由或当前依赖解析失败，也必须保留结果，不能换案例。

锁定案例为 [`sindresorhus/p-limit`](https://github.com/sindresorhus/p-limit)：

- MIT；
- parent `c944e4a4363ff41a7202d5dec346cc174c3ecf49` 只有 15 个 tracked files；
- issue [#97](https://github.com/sindresorhus/p-limit/issues/97)；
- 真实 ground-truth commit：`ccb80b2721a6a4a27ce5ad7721fe939162a35b31`；
- 真实 diff Oracle：`index.d.ts`、`index.test-d.ts`；
- architecture evidence：`package.json` 把 runtime export 指向 `index.js`、types
  指向 `index.d.ts`，并以 `tsd` 执行 compile-time tests。

## 路由任务与验证

任务要求收紧过度宽松的 public `limitFunction` 类型，只接受异步函数，同时保留参数与
返回值推断，并使用现有 type-test setup 加入聚焦回归覆盖。真实 commit diff 的两个文件
都是必需路线；`package.json` 只作为可接受的 architecture support。两次路线必须在
6,000-token 上限下产生相同边界。

路由 parent 后，harness 会 checkout 真实 target、禁止 lifecycle scripts 安装依赖，
再执行上游 `npm test`。由于仓库没有提交 lockfile，依赖解析未固定这一限制会明确写进
证据。失败会先写入 JSON 再返回非零，不允许用更漂亮的仓库替换。

## 锁定迭代记录

第一次结果保留在 `docs/research/evidence/small-oss-history-validation-0.3.0.json`，
对应 commit `872f7da7ef47785f518d0c097063882a496a3623`。它完整命中两个真实改动文件，
但多带入四个边界外文件，`acceptedPrecision` 只有 `0.333`；预注册的 `npm test` 也因为
无 lockfile 环境解析到当前依赖，在 `xo` 阶段失败。

commit `acec14ef9cbb0a404f2418768774695759137c2b` 加入通用的 type-declaration intent
与 benchmark 路径惩罚。修复后复测仍使用完全相同的仓库、任务、parent、ground-truth commit、
必需文件、可接受边界、预算与通过阈值。完整 `npm test` 仍是正式闸门；单独执行 `ava`、`tsd`
只用于诊断，不能把失败改写成通过。

type-route 修复后的结果保留在 commit
`510bbfe111c9ffd6bed46e44df64d96e2a8bc700`。路由闸门达到 `requiredRecall: 1`、
`acceptedPrecision: 1`，但审计发现同一个已选 source path 仍可能通过其他 symbol node 出现在
`excluded`。commit `81beebceb5c040658a4886a4b49039daa54f693b` 已修复这个路径层级矛盾；
仍需使用不变 Oracle 完成最后一次复测。
