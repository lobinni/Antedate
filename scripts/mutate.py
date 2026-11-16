"""
mutate.py - break every defence in contracts/antedate.py, one at a time, and
prove the test suites catch each one. A defence that survives being broken is
a defence that does not exist; this script refuses to pass if any mutation
escapes.

    python3 scripts/mutate.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = (ROOT / "contracts" / "antedate.py").read_text(encoding="utf-8")

#: (name, needle, replacement) - each needle must exist exactly once.
MUTATIONS = [
    ("bond floor dropped", "if bond < MIN_BOND:", "if bond < 0:"),
    ("stake check dropped", "if int(gl.message.value) != STAKE:", "if False:"),
    ("same-pair guard dropped", "if self.pairs.get(pair, False):", "if False:"),
    ("strict-priority check dropped", "if int(a.sealed_at) >= int(b.sealed_at):\n            raise gl.vm.UserError(EXPECTED + \"the earlier entry must have been sealed strictly before the later one\")\n        pair", "if False:\n            raise gl.vm.UserError(EXPECTED)\n        pair"),
    ("author-only reveal dropped", 'if e.author != gl.message.sender_address:', "if False:"),
    ("seal check dropped", "if seal_hash(body, clean_salt, e.author.as_hex) != e.seal:", "if False:"),
    ("season shortened", "SEASON_DAYS = 90", "SEASON_DAYS = 1"),
    ("judge window removed", "if now >= int(d.created_at) + JUDGE_WINDOW_HOURS * HOUR_SECONDS:", "if False:"),
    ("bonus always paid", "bonus = int(b.bond_left) if d.winnable else 0", "bonus = int(b.bond_left)"),
    ("stake not returned on CLEARED", "self._credit(d.accused, stake)", "pass"),
    ("label map lies", "VERDICT_OF = {SUBSTANTIAL: UPHELD, PARTIAL: ADJACENT, NOTHING: ABSOLVED}", "VERDICT_OF = {SUBSTANTIAL: ABSOLVED, PARTIAL: ADJACENT, NOTHING: ABSOLVED}"),
    ("withdraw pays twice", "self.balances[me] = u256(0)", "pass"),
    ("derived mark skipped", "b.derived_from = d.a_id", "b.derived_from = u64(0)"),
    ("duplicate seal allowed", "if key in self.seals:", "if False:"),
    ("text cap removed", "if len(body) > MAX_TEXT:", "if False:"),
]


def run_suite(contract_path: Path) -> bool:
    env = dict(os.environ, ANTEDATE_CONTRACT=str(contract_path))
    out = subprocess.run(
        [sys.executable, str(ROOT / "tests" / "run.py")],
        capture_output=True,
        text=True,
        env=env,
        cwd=ROOT,
    )
    return out.returncode == 0


def main() -> int:
    escaped = []
    caught = 0
    with tempfile.TemporaryDirectory() as tmp:
        mutant = Path(tmp) / "antedate.py"
        for name, needle, replacement in MUTATIONS:
            if SOURCE.count(needle) != 1:
                print(f"SKIP  {name} - needle not found exactly once, fix the mutation list")
                escaped.append(name)
                continue
            mutant.write_text(SOURCE.replace(needle, replacement), encoding="utf-8")
            if run_suite(mutant):
                print(f"ESCAPED  {name}")
                escaped.append(name)
            else:
                caught += 1
                print(f"caught   {name}")
    print(f"\n{caught} caught, {len(escaped)} escaped out of {len(MUTATIONS)} defences")
    return 1 if escaped else 0


if __name__ == "__main__":
    sys.exit(main())
