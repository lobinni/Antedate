# Method reference

Ten public methods. Writes first, then views. All views answer a JSON string
and always carry a `totals` block with the seven contract counters.

## Writes

### `register(seal) -> int` — payable

Store a seal with the chain time and the author's bond.

- `seal`: 64 lowercase-or-uppercase hex characters, the sha256 of
  `text|salt|address` computed off-chain.
- Value: at least 2 GEN.
- Refuses: malformed seals, duplicate seals, bonds below the floor.
- Returns the new entry id.

### `reveal(entry_id, text, salt) -> int`

Publish the text; the contract checks `sha256(text|salt|author)` against the
stored seal. The seal date never changes.

- Only the author; only once.
- Text: non-empty, at most 1500 characters.
- Salt: at most 100 characters, no `|` (the join must stay unambiguous).

### `challenge(a_id, b_id) -> int` — payable

The author of the earlier entry A stakes exactly 5 GEN against the later
entry B.

- Both entries revealed; A sealed strictly before B; a pair disputed once.
- Records whether B's bond is winnable: B unclosed, inside its 90 days, bond
  untouched.
- Returns the new dispute id.

### `judge(dispute_id) -> str`

Anyone may trigger the read. Past the 48-hour window the dispute is settled
`STALE` with no model run. Otherwise validators answer
`{"label": "SUBSTANTIAL" | "PARTIAL" | "NONE"}` over TEXT 1 (earlier) and
TEXT 2 (later), and the contract derives the verdict in code:

| Label      | Verdict  | Settlement                                            |
| ---------- | -------- | ----------------------------------------------------- |
| SUBSTANTIAL| UPHELD   | challenger: stake + B's bond if winnable; B marked `derived_from` A |
| PARTIAL    | ADJACENT | challenger: stake back; both entries gain an adjacency note  |
| NONE       | ABSOLVED | accused: the stake; B gains an absolution              |
| (timeout)  | STALE    | challenger: stake back; pair unlocked                  |

### `close_entry(entry_id) -> int`

After 90 days, with no open dispute and no upheld derivation, anyone matures
the entry: the bond is credited to its author. Returns the amount credited.

### `withdraw() -> int`

A top-level transfer of the caller's whole balance to the caller. The only
call that pays.

## Views

### `get_entry(entry_id) -> str(json)`

Seal, bond, dates, state (`SEALED` | `REVEALED` | `MATURED`), text and salt
once revealed, marks (`derived_from`, `adjacent`, `absolved`), dispute
counters. `{"found": false}` when there is none.

### `get_dispute(dispute_id) -> str(json)`

Both full entries, `seconds_between`, challenger, accused, stake, winnability,
label, verdict, payouts, `judge_deadline`. `{"found": false}` when there is
none.

### `list_entries(account, offset, limit) -> str(json)`

Newest first, at most 50 per page. An empty account lists everyone; an
address lists its own entries and adds `balance`, `earned`, `withdrawn` for
the wallet page.

### `list_marks(entry_id) -> str(json)`

The disputes touching an entry on either side, newest first, each with its
role (`earlier` | `later`), label and verdict.
