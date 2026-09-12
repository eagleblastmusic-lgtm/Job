# Feature flags and staged rollout

Large post-MVP capabilities are shipped behind persisted feature flags before they are exposed to users. The current keys are:

- `today`
- `interview_pack`
- `skill_roi`
- `career_transition`
- `strategy_engine`
- `job_feed`

## Rollout model

Allowed rollout percentages are deliberately discrete: `0`, `10`, `50`, `100`.

- `enabled=false` — immediate rollback; nobody receives the feature, including administrators.
- `enabled=true, rollout=0` — internal mode; persisted `ADMIN` users receive the feature, normal users do not.
- `enabled=true, rollout=10|50` — normal users are assigned deterministically using a stable `feature:user` bucket, while administrators remain included.
- `enabled=true, rollout=100` — all authenticated users receive the feature.

The same user remains in the same bucket across requests and restarts. Rollout therefore does not flicker between sessions.

## Operator command

Until the protected admin UI is expanded, flags can be changed only from an operator environment with direct database access:

```bash
DATABASE_PATH=/app/data/job.sqlite npm run feature:flag -- today on 10
DATABASE_PATH=/app/data/job.sqlite npm run feature:flag -- today off 0
```

The command validates the key and rollout level, updates the flag in a transaction and records `FEATURE_FLAG_UPDATED_OUT_OF_BAND` in `audit_logs`.

A flag being technically enabled does not by itself close a product acceptance gate. Features that require real-usage evidence remain marked pending until that evidence exists.
