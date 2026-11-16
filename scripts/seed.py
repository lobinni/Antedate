"""
seed.py - replay the golden pairs (or the held-out three) against the live
contract on Studio Next and write eval/results.live.md exactly as the
answers come out. Nothing is retried and nothing is tuned.

    export ANTEDATE_KEY_A=0x...   # reference author, funded
    export ANTEDATE_KEY_B=0x...   # the later entries, funded
    python3 scripts/seed.py --golden
    python3 scripts/seed.py --held-out

Writes go through the genlayer CLI; this script shells out to it pair by pair
and collects transaction hashes.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from chain import address, explorer_tx  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GEN = 10**18


def cli(args: list[str]) -> str:
    tool = shutil.which("genlayer")
    if tool is None:
        raise SystemExit("genlayer CLI not found - pip install genlayer")
    out = subprocess.run([tool, *args, "--network", "studio-dev"], capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(out.stderr.strip() or out.stdout.strip())
    return out.stdout.strip()


def seal_hash(text: str, salt: str, addr: str) -> str:
    import hashlib

    return hashlib.sha256((text + "|" + salt + "|" + addr.lower()).encode("utf-8")).hexdigest()


def run_set(rows: list[dict], reference: str, keys: tuple[str, str]) -> list[dict]:
    key_a, key_b = keys
    addr = address()
    me_a = cli(["account", "address", "--private-key", key_a])
    results = []
    for row in rows:
        log = {"id": row["id"], "expect": row.get("expect", ""), "steps": []}

        def step(name: str, cmd: list[str]) -> str:
            out = cli(cmd)
            log["steps"].append({"name": name, "out": out})
            print(f"{row['id']}  {name:<10} {out.splitlines()[-1] if out else ''}")
            return out

        salt = f"seed-{row['id']}"
        step("register A", ["write", addr, "register", json.dumps([seal_hash(reference, salt + "-a", me_a)]), "--value", str(2 * GEN), "--private-key", key_a])
        step("reveal A", ["write", addr, "reveal", json.dumps([1, reference, salt + "-a"]), "--private-key", key_a])
        step("register B", ["write", addr, "register", json.dumps([seal_hash(row["later"], salt + "-b", "__B__")]), "--value", str(2 * GEN), "--private-key", key_b])
        step("reveal B", ["write", addr, "reveal", json.dumps([2, row["later"], salt + "-b"]), "--private-key", key_b])
        step("challenge", ["write", addr, "challenge", json.dumps([1, 2]), "--value", str(5 * GEN), "--private-key", key_a])
        verdict = step("judge", ["write", addr, "judge", json.dumps([1]), "--private-key", key_a])
        log["returned"] = verdict
        results.append(log)
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--golden", action="store_true")
    group.add_argument("--held-out", action="store_true")
    args = parser.parse_args()

    key_a = os.environ.get("ANTEDATE_KEY_A", "").strip()
    key_b = os.environ.get("ANTEDATE_KEY_B", "").strip()
    if not key_a or not key_b:
        raise SystemExit("export ANTEDATE_KEY_A and ANTEDATE_KEY_B - keys never enter this repository")

    golden = json.loads((ROOT / "eval" / "golden.json").read_text(encoding="utf-8"))
    rows = golden["pairs"] if args.golden else golden["heldOut"]
    print(f"contract {address()}")
    results = run_set(rows, golden["reference"]["text"], (key_a, key_b))

    lines = [
        "# Live results",
        "",
        f"Ran {datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()} on Studio Next.",
        "Published as they came out.",
        "",
        "| Pair | Expected | Returned |",
        "| ---- | -------- | -------- |",
    ]
    for r in results:
        lines.append(f"| {r['id']} | {r['expect'] or '-'} | {r.get('returned', '')} |")
    lines += ["", "Raw steps:", "", "```json", json.dumps(results, indent=2), "```", ""]
    out = ROOT / "eval" / "results.live.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")
    print(f"explorer: {explorer_tx('<tx>')}")


if __name__ == "__main__":
    main()
