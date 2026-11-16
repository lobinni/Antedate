# Antedate

**First, on record.**

Antedate is a priority registry for ideas and written work on
[GenLayer](https://www.genlayer.com). An author seals a description with a
bond: the chain stamps the date and the text stays hidden until the author
chooses to reveal it. When a later entry looks like a copy, the earlier
author stakes a challenge, GenLayer validators compare the two texts without
seeing dates or names, and the contract derives the verdict and the mark from
their label and the seal dates.

One contract (`contracts/antedate.py`, ten methods), a Next.js site with a
`/docs` section, deployed on **GenLayer Studio Next** (chain 61997).

|                     |                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Network             | GenLayer Studio Next, chain 61997                                                                                            |
| Contract            | [0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65](https://explorer-studio-next.genlayer.com/address/0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65) |
| Verification        | deployed bytes vs this repository: `python3 scripts/verify.py` (hashes agree)                                                 |
| Live reads          | `node scripts/live-check.mjs` - the site read path against the deployment                                                     |
| Tests               | 36 passing, offline (`python3 tests/run.py`)                                                                                  |
| Mutations           | 15 defences broken one at a time, 15 caught (`scripts/mutate.py`)                                                             |
| Seal parity         | browser and chain agree (`node scripts/hash-parity.mjs`)                                                                      |

## How it works

1. **Seal.** `sha256(text|salt|address)` with a bond of at least 2 GEN. The
   date is the chain time of the transaction.
2. **Reveal.** The author publishes the text; the contract checks it against
   the seal. A reveal never changes the date.
3. **Challenge.** The author of the earlier entry A stakes 5 GEN against a
   later entry B. Both revealed, A sealed strictly before B, a pair disputed
   once.
4. **Read.** Validators compare the two texts, the earlier always as TEXT 1,
   and agree on one label: `SUBSTANTIAL`, `PARTIAL` or `NONE`. They never see
   dates, names or addresses.
5. **Mark.** The contract computes the verdict in code:

| Verdict  | When                    | Money                                                                                    |
| -------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| UPHELD   | SUBSTANTIAL             | stake back, plus B's bond if B was inside its 90 days; B is marked as derived from A      |
| ADJACENT | PARTIAL                 | stake back, the bond stays, both entries show an adjacency note                           |
| ABSOLVED | NONE                    | the stake goes to the accused                                                             |
| MATURED  | 90 days, nothing upheld | the bond returns to its author                                                            |

Money moves only in `withdraw()`, a top-level transfer to the caller.
`reveal`, `judge` and `close_entry` only move balances. A test asserts after
nearly every step that `received == bonds_left + stakes_held + owed + paid`.

## The ten methods

`register` (payable), `reveal`, `challenge` (payable), `judge`, `close_entry`,
`withdraw`, `get_entry`, `get_dispute`, `list_entries`, `list_marks`.
The reference is [docs/METHODS.md](docs/METHODS.md).

## Layout

```
contracts/antedate.py    one contract, the adjudicator prompt pinned inside
contracts/FROZEN.json    live address and sha256 of the deployed bytes
tests/                   direct tests, a money-invariant fuzz, static source tests
tests/vectors.json       seal vectors shared with the site
eval/                    the golden set, results, and samples for manual testing
scripts/                 chain, deploy, verify, mutate, seed, gen_vectors, hash-parity, live-check
docs/                    architecture, methods, deployments, testing, mutations, manual testing
src/                     the Next.js site (app/, components/, lib/)
```

## Run it

```bash
# the offline suites - no node, no network, no keys
python3 tests/run.py                 # or: python -m pytest tests -q
node scripts/hash-parity.mjs         # browser seal against the contract's
python3 scripts/mutate.py            # break every defence; refuses to pass on escape

# the live deployment
python3 scripts/verify.py            # deployed bytes against this repository
node scripts/live-check.mjs          # read path against chain 61997

# the site
cp .env.example .env                 # NEXT_PUBLIC_CONTRACT_ADDRESS already set
npm install && npm run build && npm start
```

Manual testing against the live contract is documented step by step in
[docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md), with ready-made texts in
`eval/samples.json`.

## Ship it: GitHub

```bash
git init
git add .
git commit -m "Antedate: a priority registry on GenLayer Studio Next"
git branch -M main
git remote add origin git@github.com:YOUR_HANDLE/antidate.git
git push -u origin main
```

## Ship it: Vercel (no database)

The site builds with zero services - no `DATABASE_URL`, no server secrets.
On Vercel:

1. **Import** the GitHub repository; the framework preset is Next.js.
2. Build command `npm run build`, install `npm install` - the defaults work.
3. Set one environment variable (the rest fall back to the frozen record):

| Name                          | Value                                        |
| ----------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS`  | `0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65`   |
| `NEXT_PUBLIC_CHAIN_ID`          | `61997` (optional override)                    |
| `NEXT_PUBLIC_STUDIO_RPC`        | `https://studio-dev.genlayer.com/api` (optional) |
| `NEXT_PUBLIC_STUDIO_EXPLORER`   | `https://explorer-studio-next.genlayer.com` (optional) |

4. **Deploy.** Reads go straight from the visitor's browser to the GenLayer
   RPC; writes are signed in the visitor's MetaMask on chain 61997.

Keys never live in this repository. The site holds no key; writes are signed
in the visitor's wallet (MetaMask on chain 61997). Seal tickets - text and
salt - live only in the visitor's browser.

## Changing the contract address

One variable. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env` (site) or
`ANTEDATE_ADDRESS` (scripts); both fall back to `contracts/FROZEN.json`. See
[docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md).

## Honest limits

Antedate shows who sealed a description first and whether a later one
reproduces it. It proves neither authorship nor originality, it grants no
legal rights, and a revealed text is public - so authors should seal a
description, not a secret. Whether two texts overlap is a judgment, which is
why the label, both texts and the prompt are all public.
