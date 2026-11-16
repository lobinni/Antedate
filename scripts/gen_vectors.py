"""
gen_vectors.py - rebuild tests/vectors.json from scratch. The vectors pin the
seal formula sha256(text|salt|address) in three places at once: the contract,
this file, and the browser (scripts/hash-parity.mjs checks the third).

    python3 scripts/gen_vectors.py
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CASES = [
    ("A protocol that pays storage hosts only when a random audit passes.", "k7f3a1c9b2d84e06", "0x" + "11" * 20),
    ("An on-chain newsletter where each issue is unlocked by the previous week's readers.", "s3cr3t-pepper-01", "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"),
    ("Weekly vote summaries for a DAO, written in plain language, with turnout charts.", "9z8y7x6w5v4u3t2s", "0x" + "bb" * 20),
    ("Text with a bar | inside it, several ||| bars, to prove the join is unambiguous.", "noBarHere123", "0x" + "CC" * 20),
    ("Một ý tưởng: sàn đấu giá giọng nói cho podcast độc lập.", "unicode-safe-1", "0x" + "dD" * 20),
]


def seal(text: str, salt: str, address: str) -> str:
    return hashlib.sha256((text + "|" + salt + "|" + address.lower()).encode("utf-8")).hexdigest()


def main() -> None:
    vectors = [
        {"text": text, "salt": salt, "address": addr, "seal": seal(text, salt, addr)}
        for text, salt, addr in CASES
    ]
    out = ROOT / "tests" / "vectors.json"
    out.write_text(json.dumps(vectors, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(vectors)} vectors to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
