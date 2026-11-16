# Mutations

A defence that survives being broken is a defence that does not exist.
`scripts/mutate.py` rewrites `contracts/antedate.py` in a temporary file, one
sabotage at a time, and re-runs the whole offline suite against the mutant.
The run passes only if every mutant is caught.

Current standing: **15 broken, 15 caught.**

| #  | Defence sabotaged                          | Caught by                                  |
| -- | ------------------------------------------ | ------------------------------------------ |
| 1  | Bond floor dropped (register takes dust)   | small-bond test                            |
| 2  | Exact-stake check dropped                  | wrong-stake test                           |
| 3  | Same-pair guard dropped                    | second-filing test                         |
| 4  | Strict-priority check dropped              | reversed-order and same-timestamp tests    |
| 5  | Author-only reveal dropped                 | wrong-author test                          |
| 6  | Seal check dropped (any text reveals)      | seal-mismatch test                         |
| 7  | Season shortened to one day                | too-early close test                       |
| 8  | Judge window removed (no STALE path)       | stale-after-window test                    |
| 9  | Bond bonus paid after the season           | upheld-after-season test                   |
| 10 | Accused not paid on ABSOLVED               | absolution test, money fuzz                |
| 11 | Label map lies (SUBSTANTIAL -> ABSOLVED)   | upheld test                                |
| 12 | Withdraw does not zero the balance         | withdraw test, money fuzz                  |
| 13 | Derived mark skipped on UPHELD             | upheld and close-blocked tests             |
| 14 | Duplicate seals allowed                    | duplicate-seal test                        |
| 15 | Text length cap removed                    | over-length reveal test                    |

Run it:

```
python3 scripts/mutate.py
```

Each line of output is one sabotage: `caught` means at least one test failed,
as required; `ESCAPED` fails the run. Adding a defence to the contract without
adding its mutation here — or a mutation without a test that catches it — is
treated as unfinished work.
