# Cross-stack Execution Contract (0.4.0-alpha)

Status: post-v3 engineering validation. This is not a formal v4 Agent result and is not published to npm, a Git tag, or a GitHub Release.

## Problem

The v3 evidence showed that a larger cross-stack payload could still reduce later Agent work when it carried useful execution boundaries. The remaining defects were repeated paths and reasons, several implementation candidates from the same layer, no machine-readable no-reopen marker, and stop guidance that could be ignored without leaving structured evidence.

## Contract

Cross-stack adaptive packs now:

- keep at most one routed implementation anchor for each frontend, backend, and contract layer;
- preserve direct verification evidence;
- move additional same-layer implementation candidates to Deferred;
- attach a Contract Capsule with input, output, invariant, and prohibited change;
- mark delivered `full_file` and `full_symbol` drawers with `do_not_reopen: true`;
- require batched verification and a final changed-file scope check;
- expose `stopEnforced: true` and an explicit immediate-stop condition.

Human-facing Markdown no longer repeats loaded Primary or Support paths above their delivered drawers, and it does not repeat Required Evidence paths already delivered in full. JSON route delivery records are normalized so a source path is represented by only one of unloaded Primary, delivered Context, or Deferred. Execution-boundary arrays remain explicit control metadata for compatibility and auditability.

## Safety interaction

An inferred tenant/client decision scope outranks cross-stack anchor promotion. This prevents a generic backend candidate from becoming an additional Primary after historical evidence has selected a tenant-owned implementation path.

## Regression evidence

The cross-stack fixture requires frontend, backend, contract, and test coverage; verifies one implementation anchor per layer; checks normalized route-path uniqueness; and checks the Contract Capsule, no-reopen marker, batched verification, and stop enforcement in JSON and Markdown. Existing decision-memory scope tests remain mandatory.
