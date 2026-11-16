"""
Money tests: the invariant received == bonds_left + stakes_held + owed + paid
must survive random play, and nothing may leave the contract except through
withdraw(). Run offline:

    python -m pytest tests/test_money.py -q
"""

import datetime
import random

from genshim import (
    GEN,
    T0,
    UserError,
    fresh_contract,
    invariant,
    load_module,
    queue_labels,
    set_msg,
    transfers_total,
)

ACTORS = [
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "0xcccccccccccccccccccccccccccccccccccccccc",
    "0xdddddddddddddddddddddddddddddddddddddddd",
]
LABELS = ["SUBSTANTIAL", "PARTIAL", "NONE"]


def test_money_invariant_under_random_play():
    rng = random.Random(20260101)
    c, module = fresh_contract()
    now = T0
    texts = {}

    def fresh_time():
        nonlocal now
        now = now + datetime.timedelta(minutes=rng.choice([1, 7, 30, 180, 1440, 2160]))
        return now

    def any_label_queue():
        queue_labels(*[rng.choice(LABELS) for _ in range(8)])

    for step in range(400):
        who = rng.choice(ACTORS)
        at = fresh_time()
        action = rng.randrange(6)

        try:
            if action <= 1 or int(c.entry_count) == 0:
                text = f"idea number {step} from {who[-4:]}"
                salt = f"s{step}"
                bond = rng.choice([2, 2, 3, 5]) * GEN
                set_msg(sender=who, value=bond, at=at)
                seal = module.seal_hash(text, salt, who)
                try:
                    eid = c.register(seal)
                    texts[eid] = (who, text, salt)
                except UserError:
                    pass  # duplicate seal
            elif action == 2:
                eid = rng.randrange(1, int(c.entry_count) + 1)
                if eid in texts:
                    owner, text, salt = texts[eid]
                    set_msg(sender=owner, value=0, at=at)
                    c.reveal(eid, text, salt)
            elif action == 3:
                if int(c.entry_count) >= 2:
                    a_id = rng.randrange(1, int(c.entry_count) + 1)
                    b_id = rng.randrange(1, int(c.entry_count) + 1)
                    if a_id != b_id and a_id in texts and str(a_id) in c.entries:
                        a = c.entries[str(a_id)]
                        owner = a.author.as_hex
                        any_label_queue()
                        set_msg(sender=owner, value=5 * GEN, at=at)
                        c.challenge(a_id, b_id)
            elif action == 4:
                if int(c.dispute_count) >= 1:
                    any_label_queue()
                    did = rng.randrange(1, int(c.dispute_count) + 1)
                    set_msg(sender=who, value=0, at=at)
                    c.judge(did)
            elif action == 5:
                roll = rng.randrange(2)
                if roll == 0 and int(c.entry_count) >= 1:
                    eid = rng.randrange(1, int(c.entry_count) + 1)
                    set_msg(sender=who, value=0, at=at)
                    c.close_entry(eid)
                else:
                    set_msg(sender=who, value=0, at=at)
                    c.withdraw()
        except UserError:
            pass  # an expected refusal still leaves the books balanced

        assert invariant(c), f"invariant broken at step {step} (action {action})"

    # everything paid out must have gone through withdraw's transfer record
    assert int(c.paid) == transfers_total()
    # and what is still owed is exactly what balances hold
    held = sum(int(v) for v in c.balances.values())
    assert int(c.owed) == held
