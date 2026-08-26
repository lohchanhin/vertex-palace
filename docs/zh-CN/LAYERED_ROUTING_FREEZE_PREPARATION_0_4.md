# 分层路由冻结准备记录

## 范围

本记录保留 Round 22 或 Round 23 的 candidate/baseline 在任何目标上执行前发生的两次 setup 失败。当时没有正式 freeze，也没有观察到任何 target 输出。

## 第一次

Windows harness 直接调用 `spawnSync("npm")`，系统没有解析 npm 的命令 shim，因此 `npm pack` 在生成包或读取目标前就退出。freeze 与正式 runner 的共同命令路径改为在 Windows 上通过 `cmd.exe` 调用 npm。

## 第二次

Windows 命令包装器收到含空格的仓库绝对路径，`cmd /s /c` 把嵌套引号解析进 package 路径，导致 npm 找不到 `package.json`。两个脚本现在都在已固定的仓库工作目录中使用 `npm pack .`。

## 完整性边界

目标 manifest、冻结 GitHub metadata、真值层、阈值、条件顺序与产品代码都没有改变。修复只涉及跨平台 npm 进程调用。恢复 freeze 前，runner 语法与预注册测试已经通过。
