# Vertex Palace 0.4.0-alpha.1 发布验证

日期：2026-08-26

状态：通过，可作为 npm `next` 标签下的预发布版本公开

## 发布边界

`0.4.0-alpha.1` 是建议式路由预览版，不是稳定版性能结论。`0.3.0` 继续保留为 npm `latest`；这个版本只通过 `vertex-palace@next` 与 Git 标签 `v0.4.0-alpha.1` 提供给明确选择 alpha 测试的使用者。

最终干净安装验证前，产品源码已经先提交：

- 源码提交：`9af77d724929b2acac79c82ce0067173caf3d4d2`
- 最终打包验证时工作树是否有修改：`false`
- 安装包：`vertex-palace@0.4.0-alpha.1`
- tarball 文件数：`7`
- 压缩大小：`3,826,552` bytes
- SHA-1：`dc1a71899664df84be2ce94428e7d6ffc858207d`
- integrity：`sha512-XYninBJESrbcggJWfXLHuq+7E8zGdhwLweABF5BcRLXxZoTJ1Q4xN8scdSWCGk2bheHGtiMZObQ4zIRi3mptyQ==`

机器可读证据：[release-candidate-0.4.0-alpha.1.json](../research/evidence/release-candidate-0.4.0-alpha.1.json)

## 验证门槛

| 门槛 | 结果 |
| --- | --- |
| `pnpm build` | 所有 workspace、npm CLI bundle 与插件 MCP bundle 全部通过 |
| `pnpm lint` | TypeScript no-emit 检查通过 |
| `pnpm test` | 238 项 workspace 测试通过；239 项研究检查通过，另有 2 项保存失败状态的检查明确标记为不适用 |
| `pnpm test:mcp-smoke` | 通过，提供 10 个 MCP 工具并报告版本 `0.4.0-alpha.1` |
| `pnpm test:release-candidate` | 从 tarball 安装到全新临时专案后通过 |
| `npm pack --dry-run --json` | 通过，公开包准确包含 7 个项目 |
| 暂存内容隐私与凭证扫描 | 未发现 API key、npm token、GitHub token 或私钥；Codex 原始会话审计未纳入 Git |

## 实际安装包合同

干净安装验证器在 240 个干扰文件下重复 4 次。四次都选择建议式 `full-palace`，把 `src/format-currency.mjs:1` 作为 Primary 起点，明确报告缺少 verification 证据，并保持 `stopEnforced: false`。每次实际交付 1,593 estimated tokens，没有超过 6,000 token 上限。

同一个 tarball 还通过：

- 一条相关决策记忆准确纳入且没有误排除；
- 正确推断 Aurora 客户范围，纳入两条 scoped memory，并把共享 token 降为 Support；
- 50 条 guarded-memory 候选中纳入 3 条、保留 47 条可审计排除原因，并符合 context ceiling；
- 从安装包启动 MCP、列出工具并完成 context smoke。

## 发布过程中保留的失败

第一次干净安装验证失败，因为验证器仍要求 `0.3.0` 的五字段 bypass schema；产品在缺少验证证据时正确返回了 `0.4` 的建议式完整上下文。我们修改的是验证器，让它检查新的安全合同，然后重新对打包安装产物执行。没有为了让旧断言变绿而削弱产品行为。

## 公网 Registry 验证

预发布版本已在 `2026-08-26T04:28:38.351Z` 发布到 npm 公网 registry。随后从一个全新的临时专案安装，使用新的 npm cache，并明确指定公网 registry，以验证使用者实际取得的发布产物。

| 检查 | 结果 |
| --- | --- |
| 公网准确版本 | `vertex-palace@0.4.0-alpha.1` |
| npm dist-tags | `latest=0.3.0`、`next=0.4.0-alpha.1` |
| 公网 SHA-1 | `dc1a71899664df84be2ce94428e7d6ffc858207d`，与验证过的 tarball 相同 |
| 安装后的 CLI | 正确报告 `0.4.0-alpha.1` |
| 安装后的 MCP | 完成初始化、列出 10 个工具，并以 `full-palace` 模式完成 `palace_context` |
| 安装后的 CLI context | 在干净专案中完成 `context --auto --format json` |

npm 稳定通道刻意保持不变。使用者必须明确执行 `npm install vertex-palace@next` 才会安装这个预览版。

## 结论边界

披露后的 13 文件重放达到 13/13 coverage 与 1.00 focus，但抽象八文件自评只有 3/8，冻结的 Round 19 held-out gate 也没有通过。因此，这个版本证明的是打包、确定性的建议式行为、记忆隔离、context ceiling 与研究可追溯性，不代表已经证明普遍减少 Agent Token、缩短时间或降低正确性错误。
