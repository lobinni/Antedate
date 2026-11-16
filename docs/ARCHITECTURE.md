# Architecture

Antedate is one GenLayer contract and one Next.js site. Nothing else holds
state. This document is the map.

## Layers

```
visitor's wallet (MetaMask, chain 61997)
        |  writes signed in the browser; reads over JSON-RPC
        v
Next.js site (src/)  -- no keys, no database of secrets; tickets in localStorage
        |
        v
Antedate contract (contracts/antedate.py) on Studio Next
        |  on a dispute, validators run the adjudicator prompt
        v
validator models -- agree on one label, never see dates or names
```

## The contract, inside out

`contracts/antedate.py` is organised in five bands:

1. **Constants and labels.** The three labels (`SUBSTANTIAL`, `PARTIAL`,
   `NONE`), the five verdicts (`UPHELD`, `ADJACENT`, `ABSOLVED`, `STALE`,
   `MATURED`), and the money limits (2 GEN bond, 5 GEN stake, 90-day season,
   48-hour judge window).
2. **Pure helpers.** `_seconds` for chain time, `fence` to neutralise
   delimiters at the prompt boundary, `seal_hash` for the
   `sha256(text|salt|address)` formula, and the adjudicator: `build_prompt`,
   `read_answer`, `ask_model`, `run_comparison`, `verdict_of`.
3. **Storage dataclasses.** `Entry` (seal, bond, dates, marks) and `Dispute`
   (pair, stake, label, verdict, payout), both wrapped in `@allow_storage`.
4. **The contract class.** State counters (`received`, `bonds_left`,
   `stakes_held`, `owed`, `paid`), TreeMaps (`entries`, `seals`, `disputes`,
   `entry_disputes`, `pairs`, `author_entries`, `balances`, …), and the ten
   public methods.
5. **Views.** All four views answer JSON strings and always include `totals`,
   so a client can keep the books with one read.

## Who may do what

| Method       | Who                      | Money in   | Money inside | Money out |
| ------------ | ------------------------ | ---------- | ------------ | --------- |
| register     | anyone                   | >= 2 GEN   | bond held    | -         |
| reveal       | the entry's author       | -          | -            | -         |
| challenge    | author of the earlier one| exactly 5 GEN (stake) | stake held | - |
| judge        | anyone                   | -          | settles stake, bond, marks | - |
| close_entry  | anyone                   | -          | bond credited to author | - |
| withdraw     | anyone with a balance    | -          | balance zeroed | transfer to caller |

`emit_transfer` appears exactly once in the source; a static test enforces it.

## The money invariant

At every moment, outside random play too:

```
received == bonds_left + stakes_held + owed + paid
```

`tests/test_money.py` fuzzes 400 random steps and asserts it after each.
`_settle` documents the same equation at the exact spot where balances move.

## Priority is code, not the model

A dispute names an earlier entry A and a later entry B. `challenge` requires
`a.sealed_at < b.sealed_at`, and `judge` asserts it again before the model
runs. The prompt receives the earlier text as TEXT 1 always, so a copy cannot
be hidden by asking the question the other way round. Validators never see a
date, a name or an address; the label is all they return, and
`validator_fn` compares labels only.

## No state waits forever

A dispute left unread for 48 hours is settled as `STALE` by the next `judge`
call: no model run, the stake returns, the pair unlocks for a fresh filing.
This adds a fifth outcome so that no money is ever stuck behind a model that
never answered.
