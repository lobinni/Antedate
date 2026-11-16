# Manual testing on Studio Next

A full walk-through of the live deployment, by hand, with two wallets. The
sample texts are in `eval/samples.json`.

| What you need | Where it comes from |
| ------------- | ------------------- |
| MetaMask (or any EIP-1193 wallet) | browser extension |
| GenLayer Studio Next, chain 61997 | the site adds it to the wallet for you |
| Test GEN | the built-in faucet in studio-dev.genlayer.com |
| A second account for the later entry | create it in the same wallet |

The deployed contract:
[0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65](https://explorer-studio-next.genlayer.com/address/0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65)

## 1. Connect

1. Open the site. Press **Connect wallet** in the header.
2. MetaMask asks to add **GenLayer Studio Next** (chain 61997, GEN) - accept.
3. The header shows your address chip once you are on the right chain. If it
   shows a switch prompt instead, press it.

## 2. Seal the reference (account A)

1. Go to **Seal an idea**.
2. Paste the reference text `S1` from `eval/samples.json`.
3. Keep the generated salt. Choose a bond of **2 GEN** and press
   **Seal with 2 GEN**; confirm in MetaMask and wait for finality.
4. The site stores a ticket in your browser and offers a download -
   **download it**. It is the only copy of text + salt.
5. Open the entry page; the state is SEALED and the text is hidden.

Checks: the seal is 64 hex characters; your entry id is new; the totals moved
by 2 GEN.

## 3. Reveal it (account A)

1. Still on account A, open your entry.
2. The reveal panel is prefilled from the browser ticket - press
   **Reveal and verify**, confirm, wait for finality.

Checks: state becomes REVEALED; the text renders; the seal date did not move.

## 4. Seal and reveal the candidate (account B)

1. Switch MetaMask to account B. Repeat steps 2-3 with `S2a` (the reworded
   copy), sealed **after** S1 - it must be strictly later.

## 5. Dispute and read

1. Back on account A, open the newer entry (S2a) and press
   **Stake 5 GEN and open the dispute** with your earlier entry's id.
2. Open **Disputes** and find the open pair. Press **Ask the validators** -
   anyone may. Consensus takes a moment while validators read TEXT 1 and
   TEXT 2 blind.

Checks (expected with the stock adjudicator): `S2a` lands UPHELD, the later
entry shows "derived from", and your account menu shows an owed balance of
7 GEN (stake 5 + bond 2). Repeat with `S2b` for ADJACENT (stake back only)
and `S2c` for ABSOLVED (the 5 GEN go to account B instead).

## 6. Withdraw

1. Open the account menu in the header and press **Withdraw balance**.
2. Wait for finality; the owed figure returns to zero.

Check: the wallet received a plain transfer - the only call that pays.

## 7. Refusals worth trying

- register with a 1 GEN bond - refused (floor is 2).
- dispute with a stake that is not exactly 5 GEN - refused.
- dispute the same pair twice - refused.
- dispute against your own earlier entry from the wrong account - refused.
- reveal with one changed character - refused, seal mismatch.

## Reading along on the explorer

Every transaction lands on the explorer linked from each entry page. The read
path can be checked from a shell at any time:

```
node scripts/live-check.mjs
python3 scripts/verify.py
```
