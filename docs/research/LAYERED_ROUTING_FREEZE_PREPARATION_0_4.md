# Layered Routing Freeze Preparation Record

## Scope

This record preserves two setup failures before the Round 22 or Round 23 candidate or baseline was run on any target. No formal freeze existed and no target output was observed.

## Attempt 1

The Windows harness called `spawnSync("npm")`. Windows did not resolve the npm command shim, so `npm pack` exited before creating a package or reading a target. The common freeze and runner command path was changed to invoke npm through `cmd.exe` on Windows.

## Attempt 2

The Windows command wrapper then received the repository's absolute path, which contains spaces. `cmd /s /c` parsed the nested quoting as part of the package path, so npm could not find `package.json`. Both scripts now use `npm pack .` from the already fixed repository working directory.

## Integrity Boundary

Target manifests, frozen GitHub metadata, truth layers, thresholds, condition order, and product code were unchanged. The repair is limited to cross-platform npm process invocation. The runner syntax and preregistration tests passed before freeze generation resumed.
