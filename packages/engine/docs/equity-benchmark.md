# Equity Monte Carlo — notes

## Scope

- Client-only. Uses hero hole cards + visible community + opponent **count**.
- Never receives opponent hole cards. No server events.

## Adaptive iterations

| Street | Community | Base N (1 opp) |
|--------|-----------|----------------|
| Preflop | 0 | ~4500 |
| Flop | 3 | ~3000 |
| Turn | 4 | ~2000 |
| River | 5 | ~1000 |

Cap 8000. Slight bump per extra opponent.

## Validation

`exactRiverEquityVsOne` enumerates all opponent combos on the river (C(45,2) ≈ 990).  
Tests require Monte Carlo within **±2.5 pp** of exact win% on a fixed nut-ish river (seeded).

## Performance target

Mid-range phone: river 1k trials should feel &lt; ~300 ms wall time for the worker batch  
(UI stays responsive because work is off the main thread).
