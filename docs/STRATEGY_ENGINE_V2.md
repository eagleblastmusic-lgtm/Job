# Strategy Engine V2

## Purpose

Strategy Engine turns accumulated application/outcome history into cautious experiments. It is not a career oracle and does not make high-impact decisions from tiny samples.

## Evidence rules

- fewer than 10 applied-or-beyond applications: no strategy recommendation, `ZA_MALO_DANYCH`;
- 10–19 observations: at most an early signal;
- 20–39: probable conclusion wording may be used;
- 40+: strong-signal wording is permitted, but causality is still not claimed;
- interview and late-stage advice has its own denominator threshold;
- freshness comparisons are shown only when both fresh and older application groups have usable observations.

## Recommendations

Current deterministic rules can propose bounded experiments around response rate, interview conversion, late-stage conversion and freshness. Each recommendation includes:

- sample size;
- confidence;
- evidence/reason;
- a small next experiment;
- explicit language that the recommendation is a hypothesis rather than a sweeping career decision.

## Boundaries

The engine does not use cross-user outcomes, protected/sensitive traits, employer-side candidate ranking or causal claims. It is disabled by default behind `strategy_engine`. Later cross-user intelligence remains blocked until privacy/legal review and cohort/fairness safeguards are implemented.
