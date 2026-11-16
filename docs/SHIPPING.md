# Shipping

How this repository is published and hosted. Nothing here is required to run
or test the project itself.

## GitHub

```bash
git init
git add .
git commit -m "Antedate: a priority registry on GenLayer Studio Next"
git branch -M main
git remote add origin git@github.com:YOUR_HANDLE/antedate.git
git push -u origin main
```

Keys and secrets never enter the repository. `.env` stays local; only
`.env.example` is committed. Test accounts for the seed script live outside
the tree and are exported as `ANTEDATE_KEY_A` / `ANTEDATE_KEY_B` at run time.

## Vercel (no database)

The site builds with zero services - no `DATABASE_URL`, no server secrets.

1. Import the GitHub repository; the framework preset is Next.js.
2. Build command `npm run build`, install `npm install` - the defaults work.
3. Set one environment variable (the rest fall back to the frozen record):

| Name                           | Value                                          |
| ------------------------------ | ---------------------------------------------- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x38E4D9AB56491233E7336c92FAaAA0B336DE0f65`     |
| `NEXT_PUBLIC_CHAIN_ID`         | `61997` (optional override)                      |
| `NEXT_PUBLIC_STUDIO_RPC`       | `https://studio-dev.genlayer.com/api` (optional) |
| `NEXT_PUBLIC_STUDIO_EXPLORER`  | `https://explorer-studio-next.genlayer.com` (optional) |

4. Deploy. Reads go straight from the visitor's browser to the GenLayer RPC;
   writes are signed in the visitor's MetaMask on chain 61997.
