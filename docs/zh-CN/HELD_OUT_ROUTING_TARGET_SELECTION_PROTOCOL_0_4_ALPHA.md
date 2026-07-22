# 未见路由目标选择协议（0.4 Alpha）

## 状态

本协议在检查仓库历史、或让 Vertex Palace 接触任何候选任务之前预注册。协议与选择器必须先提交，之后才能执行目标选择。

## 冻结产品

产品候选继续固定为 `0b6a0fd92f43a74c983663cd32f937087e3ec923`。目标选择与 held-out 验证期间不得修改产品路径。Zod、Requests、p-limit 曾参与产品研发，因此全部排除。

## 仓库候选池

候选池顺序具有约束力。HEAD 只通过远端引用取得，没有检查提交历史或路由结果。

| 顺序 | 仓库 | 语言 | 固定 HEAD |
| ---: | --- | --- | --- |
| 1 | [fastify/fastify](https://github.com/fastify/fastify) | JavaScript | `ada0623dce9ed776306f2ccaa095b8ee01a492ba` |
| 2 | [pallets/click](https://github.com/pallets/click) | Python | `cfa01eeb7894a408af70b29d28c0b24f8680f9fb` |
| 3 | [date-fns/date-fns](https://github.com/date-fns/date-fns) | TypeScript | `4098115cf705e3af7f663d8e5b0686e39a9f478a` |
| 4 | [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) | Rust fallback parser | `8372866810a1f2a647d11d7780984d4402a5c1e9` |
| 5 | [spf13/cobra](https://github.com/spf13/cobra) | Go fallback parser | `adbc8813901bba65827259daa8e22ff94ec1f30e` |
| 6 | [markedjs/marked](https://github.com/markedjs/marked) | JavaScript/TypeScript | `1d3229a4cc423dbfef9dc2d1e325f7a9231ad60b` |

依序找到的前四个合格仓库组成目标集合。只有前面的仓库没有合格提交或无法准备时，才使用第五、第六个后备仓库。看到路由结果后不得手工替换仓库。

## 机械提交选择

每个仓库从固定 HEAD 向后扫描最多 200 个非合并提交，选择第一个同时满足全部条件的提交：

1. 只有一个 parent。
2. Commit subject 长度为 20–180 个字符，并以 fix、feat、add、allow、prevent、support、improve 等行为动词开头。
3. Diff 修改 2–6 个文件，而且所有状态都是 `M`，保证目标文件在修改前后都存在。
4. 每个改动文件都使用该仓库预先声明的源码副档名。
5. 至少有一个实现文件与一个聚焦测试文件。
6. 排除文档、生成产物、fixture、snapshot、benchmark、example、vendor、build output、lockfile 和二进制 diff。
7. 新增与删除合计必须介于 2–400 行。

任务文本直接使用 Git commit subject，不进行人工改写。Route commit 是 parent，ground-truth commit 是被选中的 commit，changed-file oracle 是该提交的完整选定 diff。

选择器不会调用 Vertex Palace，只能以 create-only 方式建立 `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha.json`。若不足四个目标，失败 manifest 仍需保留，而且不能从冻结候选池之外人工补选。

## 在选择前固定的验证门槛

Manifest 提交后，独立验证脚本会在每个 route commit 上使用冻结候选 `0b6a0fd`。每个目标连续执行两次 `evaluate` 与 `context --auto`，预算 6,000 tokens、route limit 9、最多 4 个 drawers。

每个目标都必须满足：

- changed-file coverage 为 `1.00`；
- route focus 至少 `0.75`；
- 相对于机械 changed-file 边界的 precision 至少 `0.75`；
- 两次重复的 route files 完全一致；
- 不得出现 overconfident；
- context 不得超过 6,000 estimated tokens；
- selected/excluded 不得重叠，也不得修改 tracked worktree。

四个目标必须全部通过。环境或仓库准备失败会单独记录，但不能算成产品通过。失败目标将成为公开开发资料，调校后的后继版本不能再把它当作 held-out 证据。

即使通过，也只属于静态路由证据，不能证明 Agent 任务正确率、Token 节省或速度提升。

## 选择命令

只有在本协议与 `scripts/select-held-out-routing-targets.cjs` 已提交后才能执行：

```powershell
node scripts/select-held-out-routing-targets.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha.json
```

