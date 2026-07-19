# Historical Scope Alias Resolution 0.3.0

Status: implemented and locally verified. npm publication remains held.

## Trigger

The draft Control-first benchmark added a deliberately memory-dependent task:

> Fix contrast for the independently governed launch tenant. Historical project
> decisions define which tenant owns this token.

The seeded record used `client=aurora` and explicitly described Aurora as that
launch tenant. Before this change, Adaptive selected
`guarded-memory-palace`, retrieved two relevant records, and then excluded both
as `scope_mismatch`. Static routing simultaneously made the shared token
Primary and left the Aurora token Deferred.

This smoke was not a formal benchmark outcome. It was a pre-freeze product gate
and exposed a real memory-fidelity defect.

## Root Cause

Any task containing a tenant marker activated strict client isolation. The
selector then accepted scoped memory only when the literal client identifier
appeared in the task. It did not use the task, tags, and pitfall text stored in
the same client-bound record to resolve a business alias.

The route tierer also ran before memory selection, so even a corrected memory
decision could not alter contradictory Primary and Deferred boundaries.

## Resolution

Historical alias inference is allowed only when all of these conditions hold:

- the task contains a client, tenant, or customer scope marker;
- the task explicitly asks for history, memory, a previous pitfall, or a prior
  decision;
- one client has at least three matching non-generic alias tokens across its
  stored task, text, and tags; and
- that client leads the next candidate by at least two tokens.

The telemetry records the inferred client, stable reason
`unique_historical_alias_match`, and evidence tokens. A tie or weak match keeps
all client memories excluded as `scope_mismatch`.

After a unique inference, a route entry whose path contains that exact client
segment becomes the sole Primary. Former static Primary entries become Support
and state why they were demoted. Current code and tests still outrank memory.

## Verification

The exact benchmark fixture smoke now reports:

```json
{
  "mode": "guarded-memory-palace",
  "memoryCandidates": 2,
  "memoryIncluded": 2,
  "memoryExcluded": 0,
  "inferredClient": "aurora",
  "inferenceReason": "unique_historical_alias_match",
  "primary": "clients/aurora/article-tokens.mjs"
}
```

The shared token is Support, not Primary. The payload was 9,011 bytes and about
2,253 estimated tokens, below the 5,000-token mode ceiling.

Regression tests also construct two equally plausible client records. Neither
is inferred or delivered, proving that semantic overlap alone does not bypass
tenant isolation.

## Research Boundary

This verifies retrieval, scope telemetry, and execution-boundary consistency.
It does not prove that an Agent will make the correct edit, save Token, or run
faster than Control. Those questions remain reserved for the fresh, frozen v3
benchmark after package publication.

## 简体中文摘要

新的测试任务只说“独立治理的 launch tenant”，没有直接写 Aurora。旧逻辑虽然
找到两条 Aurora 记忆，却因为任务没出现字面名称而全部判成 `scope_mismatch`，
同时还把 shared token 放在 Primary。

现在只有在任务明确要求历史决策、唯一 client 至少命中三个有辨识力的别名词，
并且领先其他 client 时，才会推断 scope。平手时仍全部拒绝，不会为了召回率破坏
客户隔离。推断成功后，Aurora 路径成为唯一 Primary，shared 降为 Support。
