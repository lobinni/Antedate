# Antedate

**First, on record.**

Antedate is a priority registry for ideas and written work on
[GenLayer](https://www.genlayer.com). An author seals a description with a
bond: the chain stamps the date and the text stays hidden until the author
chooses to reveal it. When a later entry looks like a copy, the earlier
author stakes a dispute, GenLayer validators compare the two texts without
seeing dates or names, and the contract derives the verdict and the mark from
their label and the seal dates.

One contract (`contracts/antedate.py`, ten methods), a Next.js site with a
`/docs` section, deployed on **GenLayer Studio Next** (chain 61997).

|                 |                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Network         | GenLayer Studio Next, chain 61997 (`0xF22D`)                                                                                         |
| RPC / Explorer  | studio-dev.genlayer.com/api · explorer-studio-next.genlayer.com                                                                      |
| Contract        | [`0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65`](https://explorer-studio-next.genlayer.com/address/0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65) |
| Verification    | `python3 scripts/verify.py` - deployed bytes match this repository (sha256 `4adafac8…31a58f9`, CRLF/LF normalised)                     |
| Live reads      | `node scripts/live-check.mjs` - the site's read path against the deployment                                                          |
| Tests           | 36 passing, offline (`python3 tests/run.py`)                                                                                          |
| Mutations       | 15 defences broken one at a time, 15 caught (`scripts/mutate.py`)                                                                     |
| Seal parity     | browser and chain agree (`node scripts/hash-parity.mjs`)                                                                              |

## Recent updates

- **Deployment frozen.** The contract address, both source hashes and the
  newline note are recorded in `contracts/FROZEN.json`; the scripts and the
  site fall back to it.
- **Validator fees are estimated on every write.** GenLayer charges
  consensus fees on top of gas, and a write without them is rejected with
  `FeeValueMustBeNonZero`. The site now estimates `feeValue` and the
  distribution at the network's current policy and attaches them to every
  transaction - seal, reveal, dispute, read, close and withdraw alike.
- **Disputes are preflighted in the UI.** Every guard the contract enforces -
  authorship of the earlier entry, both revealed, strict priority, a pair
  filed once, and a balance that covers the stake plus fees - is checked in
  the browser before MetaMask opens, explained in plain sentences.
- **Reveal carries a local seal-parity check.** The browser recomputes
  `sha256(text|salt|address)` as you type and refuses to send a reveal that
  the contract would refuse anyway.
- **Revert reasons survive the wallet.** Deliberate contract refusals are
  unprefixed from the wallet's error chain and shown as sentences; Studio's
  bare "execution failed" simulation answers are translated into guidance.

## How it works

1. **Seal.** The browser computes `sha256(text|salt|address)` locally - the
   text never leaves the machine - and the hash goes on chain with a bond of
   at least 2 GEN. The date is the chain time of the transaction; the ticket
   (text + salt) stays in the visitor's browser, downloadable as a file.
2. **Reveal.** The author publishes text and salt; the contract recomputes
   the seal and, on a match, makes the text public. A reveal never changes
   the date. The site recomputes the seal as you type and refuses to send a
   reveal the contract would refuse.
3. **Challenge.** The author of the earlier entry A stakes exactly 5 GEN
   against a later entry B. Both must be revealed, A sealed strictly before
   B, the pair disputed once. Every guard is preflighted in the UI before
   MetaMask opens, and validator fees are estimated and attached to the
   transaction.
4. **Read.** Anyone presses the button. Validators compare the two texts -
   the earlier always as TEXT 1 - and agree on one label: `SUBSTANTIAL`,
   `PARTIAL` or `NONE`. They never see dates, names or addresses.
5. **Mark.** The contract computes the verdict in code:

| Verdict  | When                    | Money                                                                                        |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| UPHELD   | SUBSTANTIAL             | stake back, plus B's bond if B was inside its 90 days; B is marked as derived from A          |
| ADJACENT | PARTIAL                 | stake back, the bond stays, both entries show an adjacency note                               |
| ABSOLVED | NONE                    | the stake goes to the accused                                                                 |
| MATURED  | 90 days, nothing upheld | the bond returns to its author                                                                |

A dispute nobody can read within 48 hours settles as **STALE**: no model
runs, the stake returns, and the pair unlocks - so no money waits forever.

Money moves only in `withdraw()`, a top-level transfer to the caller.
`reveal`, `judge` and `close_entry` only move balances. A test asserts after
nearly every step that `received == bonds_left + stakes_held + owed + paid`.

## The ten methods

`register` (payable), `reveal`, `challenge` (payable), `judge`, `close_entry`,
`withdraw`, `get_entry`, `get_dispute`, `list_entries`, `list_marks`.
The reference is [docs/METHODS.md](docs/METHODS.md).

## The site

- **Registry** - every seal, newest first, with state, bond and marks, filtered
  by sealed / revealed / marked / matured.
- **Disputes** - each open pair rendered as TEXT 1 versus TEXT 2, the label and
  verdict once read, and a button anyone may press to run the read (or to
  settle a stale one).
- **Seal desk** - a four-step flow: wallet, text, locally computed seal, bond.
  Tickets (text + salt) are stored in the visitor's browser and downloadable;
  nothing else keeps them.
- **Entry pages** - timeline, marks, and the three action panels (reveal,
  dispute, close) that appear exactly when the chain state allows them.
- **Account menu** - balance owed, lifetime earned, and the withdraw call.

The wallet flow: MetaMask on chain 61997, added and switched automatically on
connect. The site holds no key.

## Layout

```
contracts/antedate.py    one contract, the adjudicator prompt pinned inside
contracts/FROZEN.json    live address and sha256 of the deployed bytes
tests/                   direct tests, a money-invariant fuzz, static source tests
tests/vectors.json       seal vectors shared with the site
eval/                    the golden set, results, and samples for manual testing
scripts/                 chain, deploy, verify, mutate, seed, gen_vectors, hash-parity, live-check
docs/                    architecture, methods, deployments, testing, mutations, manual testing, shipping
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

## What the steward should see

After the commands above:

- `tests/run.py` -> "36/36 passing - all green"
- `scripts/mutate.py` -> "15 caught, 0 escaped"
- `hash-parity.mjs` -> "5/5 vectors match"
- `verify.py` -> identical local and chain hashes, "ok"
- `live-check.mjs` -> three pass lines, live totals
- the site -> the dark hero, live Registry and Disputes, MetaMask asked for chain 61997

Manual testing against the live contract is documented step by step in
[docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md), with ready-made texts in
`eval/samples.json`.

## Changing the contract address

One variable. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env` (site) or
`ANTEDATE_ADDRESS` (scripts); both fall back to `contracts/FROZEN.json`. See
[docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md).

## Honest limits

Antedate shows who sealed a description first and whether a later one
reproduces it. It proves neither authorship nor originality, it grants no
legal rights, and a revealed text is public - so authors should seal a
description, not a secret. Whether two texts overlap is a judgment, which is
why the label, both texts and the prompt are all public, and why the verdict
itself is code.
