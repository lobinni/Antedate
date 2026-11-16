# Golden results

The set in `golden.json` is hashed and timestamped before the first live run.
Two rehearsals exist, and they are labelled honestly:

## Offline rehearsal (deterministic shim)

Every pair replayed against `tests/genshim.py` with the labels the prompt is
expected to produce. This validates the contract's money and marking logic
end to end; it does not exercise real models.

| Pair  | Expected    | Logic check            |
| ----- | ----------- | ---------------------- |
| G1    | SUBSTANTIAL | UPHELD, bond moves     |
| G2    | SUBSTANTIAL | UPHELD, bond moves     |
| G3    | SUBSTANTIAL | UPHELD, bond moves     |
| G4    | SUBSTANTIAL | UPHELD, bond moves     |
| G5    | PARTIAL     | ADJACENT, stake back   |
| G6    | PARTIAL     | ADJACENT, stake back   |
| G7    | NONE        | ABSOLVED, stake to B   |
| G8    | NONE        | ABSOLVED, stake to B   |
| G9    | NONE        | ABSOLVED, stake to B   |
| G10   | SUBSTANTIAL | UPHELD, bond moves     |

## Live run on Studio Next

Run `scripts/seed.py --golden` with two funded accounts to replay the set
against the deployed contract and the real validator cohort. The script
writes `eval/results.live.md` with every transaction hash and the label each
dispute returned, exactly as it came out. Publish the file as produced - a
miss is a datapoint, not a bug to tune away.

The held-out pairs H1-H3 follow the same path and land in the same file.
They exist to be run once, after everything else is frozen.

## How to reproduce

1. Deploy: `python3 scripts/deploy.py` (writes `contracts/FROZEN.json`).
2. Fund two accounts on Studio Next and export them as `ANTEDATE_KEY_A` and
   `ANTEDATE_KEY_B`. Keys never enter this repository.
3. `python3 scripts/seed.py --golden` and wait for finalization.
4. `python3 scripts/seed.py --held-out` exactly once.
