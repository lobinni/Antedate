# Testing

Three suites, all offline, plus two live scripts for after deployment.

## Fast path

```
python3 tests/run.py      # zero dependencies - not even pytest
```

Expected tail: `36/36 passing - all green`.

## With pytest (richer output)

```
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest tests -q
```

## What each suite proves

| Suite                 | Proves                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| `tests/test_contract.py` | Every method, happy path and refusal; seal parity with `tests/vectors.json` |
| `tests/test_money.py`    | `received == bonds_left + stakes_held + owed + paid` after each of 400 random steps; `paid` equals the sum of `withdraw` transfers; `owed` equals the sum of balances |
| `tests/test_static.py`   | Promises kept by the source as text: ten public methods, exactly one `emit_transfer` (inside `withdraw`), verdicts derived in code, the prompt pinned inside the contract, the STALE path never running the model |

The offline world is `tests/genshim.py`: a small stand-in for the GenLayer
runtime (addresses, integer types, TreeMap storage, message context, the
leader/validator agreement loop, and a scripted model). The contract file is
imported as-is; nothing is reimplemented.

## Seal parity

```
node scripts/hash-parity.mjs
```

The browser computes `sha256(text|salt|address)` with WebCrypto; this script
computes the same bytes in Node and compares them against `tests/vectors.json`,
which the contract tests also check. Three implementations, one formula.

Regenerate the vectors after changing the formula (do not change the formula):

```
python3 scripts/gen_vectors.py
```

## Mutation testing

```
python3 scripts/mutate.py
```

Fifteen defences are broken one at a time - the bond floor dropped, the
author check deleted, the label map made to lie, the season shortened, and so
on - and the suites must fail every time. Current standing: 15 broken, 15
caught. See [MUTATIONS.md](MUTATIONS.md).

## Live testing, once deployed

1. Fund two Studio Next accounts; export them as `ANTEDATE_KEY_A` and
   `ANTEDATE_KEY_B`.
2. `python3 scripts/seed.py --golden` replays the ten golden pairs through
   real consensus and writes `eval/results.live.md` as it came out.
3. `python3 scripts/seed.py --held-out` runs the three held-out pairs —
   once, never to tune anything.

The wallet path is exercised by hand: connect MetaMask on chain 61997, seal,
reveal, dispute, judge, withdraw. The site walks you through each step.
