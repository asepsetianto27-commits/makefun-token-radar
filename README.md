# makefun-token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/asepsetianto27-commits/makefun-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/asepsetianto27-commits/makefun-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks 178 pre-token protocols from a sealed DefiLlama snapshot by implied launch value — all 40 on the watchlist plus 138 early finds below the floor — each with a concrete six-step farm plan, in a no-network dashboard. Model radar-3 prices each category at the multiple its own live tokens command — the median market-cap-to-TVL ratio of the live protocols in that category, calibrated from the snapshot itself, with the global median as the fallback — then applies growth, maturity and chain breadth. The dashboard shows the calibration table, the top three, the value per $100 farmed, and a per-protocol detail that recomputes the row from the same figures; live-token protocols are set aside with their market caps. Built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=7a80mfws&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
