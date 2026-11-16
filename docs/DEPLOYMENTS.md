# Deployments

## Live deployment (Studio Next)

| Setting  | Value                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Contract | `Antedate`                                                                                                |
| Address  | [0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65](https://explorer-studio-next.genlayer.com/address/0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65) |
| Source   | `contracts/antedate.py` - sha256 `4adafac8…31a58f9`; deployed bytes match after CRLF/LF normalization       |
| Record   | `contracts/FROZEN.json`                                                                                   |
| Verified | `python3 scripts/verify.py` -> local and chain hashes agree                                                |
| Live read| `node scripts/live-check.mjs` -> totals and views answer on chain 61997                                    |

## Network

| Setting  | Value                                            |
| -------- | ------------------------------------------------ |
| Name     | GenLayer Studio Next                             |
| Chain id | 61997 (`0xF22D`)                                  |
| Currency | GEN                                              |
| RPC      | https://studio-dev.genlayer.com/api              |
| Explorer | https://explorer-studio-next.genlayer.com         |
| Studio   | https://studio-dev.genlayer.com                   |

## Deploy

1. Install the CLI: `pip install genlayer` and select the network:
   `genlayer network set studio-dev`.
2. Fund a deployer account (the studio has a built-in faucet).
3. `python3 scripts/deploy.py` — it deploys `contracts/antedate.py` and asks
   you to freeze the address:

   ```
   python3 scripts/deploy.py --record 0xAddress 0xDeployTx
   ```

   The record lives in `contracts/FROZEN.json`: address, deploy transaction,
   timestamp, and the sha256 of the exact source bytes.

No deploy key ever enters this repository; the CLI holds it.

## When the address changes

There is exactly one runtime variable per consumer, and both fall back to the
frozen record:

| Consumer       | Variable                     | Fallback                          |
| -------------- | ---------------------------- | --------------------------------- |
| The site       | `NEXT_PUBLIC_CONTRACT_ADDRESS` | `src/lib/config.ts` mirrors FROZEN |
| Python scripts | `ANTEDATE_ADDRESS`           | `contracts/FROZEN.json`           |

So a redeploy means: record it with `--record`, set the one env var for the
site, rebuild. Nothing else references the address.

## Verifying a deployment

```
python3 scripts/verify.py
```

- recomputes `sha256(contracts/antedate.py)` and compares it with the frozen
  record,
- asks the network for the code at the frozen address
  (`gen_getContractCode`) and hashes what comes back.

Exit code 0 means the repository and the chain agree.

## The frontend environment

Copy `.env.example` to `.env` and fill in the address. The other three
variables (`NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_STUDIO_RPC`,
`NEXT_PUBLIC_STUDIO_EXPLORER`) already carry the Studio Next defaults and
exist so the site can be pointed at another deployment without a code change.
