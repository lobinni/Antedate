"""
deploy.py - put contracts/antedate.py on GenLayer Studio Next (chain 61997)
and freeze the result into contracts/FROZEN.json.

Two paths, tried in order:

    1. the genlayer CLI (pip install genlayer) driven over studio-dev
    2. a printed manual recipe for studio-dev.genlayer.com, after which this
       script can be re-run with --record <address> <tx> to freeze the record

Usage:
    python3 scripts/deploy.py
    python3 scripts/deploy.py --record 0xYourAddress 0xYourDeployTx
"""

from __future__ import annotations

import argparse
import datetime
import json
import shutil
import subprocess
import sys

sys.path.insert(0, str(__file__.rsplit("/", 1)[0]))
from chain import CONTRACT_PATH, FROZEN_PATH, frozen, source_sha256  # noqa: E402


def record(address: str, tx: str) -> None:
    data = frozen()
    data["deployment"] = {
        "address": address,
        "deployTx": tx,
        "deployedAt": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat(),
        "sourceSha256": source_sha256(),
        "status": "deployed",
    }
    FROZEN_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print("froze deployment into contracts/FROZEN.json")
    print(f"  address {address}")
    print(f"  tx      {tx}")
    print(f"  sha256  {data['deployment']['sourceSha256']}")
    print("now set NEXT_PUBLIC_CONTRACT_ADDRESS for the site - one variable, see .env.example")


def deploy_with_cli() -> None:
    cli = shutil.which("genlayer")
    if cli is None:
        raise SystemExit("genlayer CLI not found - pip install genlayer, or deploy by hand and use --record")
    print("deploying contracts/antedate.py to studio-dev (chain 61997)...")
    out = subprocess.run(
        [cli, "deploy", "--network", "studio-dev", str(CONTRACT_PATH)],
        check=True,
        capture_output=True,
        text=True,
    )
    print(out.stdout)
    raise SystemExit(
        "copy the printed contract address and transaction id, then run:\n"
        "  python3 scripts/deploy.py --record 0xAddress 0xTx"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", nargs=2, metavar=("ADDRESS", "TX"))
    args = parser.parse_args()
    if args.record:
        record(args.record[0], args.record[1])
        return
    deploy_with_cli()


if __name__ == "__main__":
    main()
