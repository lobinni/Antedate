"""
Direct tests: every public method, happy path and refusal, plus seal parity
with tests/vectors.json. Run offline:

    python -m pytest tests/test_contract.py -q
"""

import datetime
import json

import pytest

from genshim import (
    GEN,
    T0,
    UserError,
    fresh_contract,
    invariant,
    load_module,
    queue_labels,
    set_msg,
    transfers,
    transfers_total,
)

A = "0x" + "aA" * 20
B = "0x" + "Bb" * 20
C = "0x" + "cC" * 20
ROOT = __import__("pathlib").Path(__file__).resolve().parent.parent


def seal_of(text, salt, address):
    return load_module().seal_hash(text, salt, address)


def make_entry(c, sender, text="an idea worth sealing", salt="salt-1", at=T0, bond=2 * GEN):
    set_msg(sender=sender, value=bond, at=at)
    eid = c.register(seal_of(text, salt, sender))
    return eid


def reveal_entry(c, sender, eid, text="an idea worth sealing", salt="salt-1", at=T0):
    set_msg(sender=sender, value=0, at=at)
    c.reveal(eid, text, salt)


def pair(c, la="SUBSTANTIAL"):
    """A sealed+revealed by A at T0, B sealed+revealed by B at T0+1h, then A disputes B."""
    a_id = make_entry(c, A, "the reference text", "salt-a", T0)
    reveal_entry(c, A, a_id, "the reference text", "salt-a", T0)
    later = T0 + datetime.timedelta(hours=1)
    b_id = make_entry(c, B, "a reworded copy of the reference text", "salt-b", later)
    reveal_entry(c, B, b_id, "a reworded copy of the reference text", "salt-b", later)
    queue_labels(la)
    set_msg(sender=A, value=5 * GEN, at=later)
    did = c.challenge(a_id, b_id)
    return a_id, b_id, did


# --- register ---------------------------------------------------------------


def test_register_returns_ids_and_totals():
    c, _ = fresh_contract()
    eid = make_entry(c, A, bond=3 * GEN)
    assert eid == 1
    assert int(c.received) == 3 * GEN
    assert int(c.bonds_left) == 3 * GEN
    assert invariant(c)


def test_register_rejects_a_bad_seal():
    c, _ = fresh_contract()
    set_msg(sender=A, value=2 * GEN, at=T0)
    with pytest.raises(UserError, match="sha256"):
        c.register("not-a-seal")


def test_register_rejects_a_small_bond():
    c, _ = fresh_contract()
    set_msg(sender=A, value=GEN, at=T0)
    with pytest.raises(UserError, match="at least 2 GEN"):
        c.register(seal_of("text", "salt", A))


def test_register_rejects_a_duplicate_seal():
    c, _ = fresh_contract()
    make_entry(c, A)
    set_msg(sender=B, value=2 * GEN, at=T0)
    with pytest.raises(UserError, match="already registered"):
        c.register(seal_of("an idea worth sealing", "salt-1", A))


# --- reveal -----------------------------------------------------------------


def test_reveal_needs_the_author():
    c, _ = fresh_contract()
    eid = make_entry(c, A)
    set_msg(sender=B, value=0, at=T0)
    with pytest.raises(UserError, match="only the author"):
        c.reveal(eid, "an idea worth sealing", "salt-1")


def test_reveal_checks_the_seal():
    c, _ = fresh_contract()
    eid = make_entry(c, A)
    set_msg(sender=A, value=0, at=T0)
    with pytest.raises(UserError, match="do not match"):
        c.reveal(eid, "a different text", "salt-1")


def test_reveal_rejects_empty_and_long_text_and_bad_salt():
    c, _ = fresh_contract()
    eid = make_entry(c, A)
    set_msg(sender=A, value=0, at=T0)
    with pytest.raises(UserError, match="empty"):
        c.reveal(eid, "   ", "salt-1")
    with pytest.raises(UserError, match="1500"):
        c.reveal(eid, "x" * 1501, "salt-1")
    with pytest.raises(UserError, match="no bar"):
        c.reveal(eid, "an idea worth sealing", "salt|1")


def test_reveal_once_and_date_kept():
    c, _ = fresh_contract()
    eid = make_entry(c, A, at=T0)
    reveal_entry(c, A, eid, at=T0 + datetime.timedelta(days=2))
    out = json.loads(c.get_entry(eid))
    assert out["revealed"] is True
    assert out["sealed_at"] == int((T0 - datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc)).total_seconds())
    assert out["text"] == "an idea worth sealing"
    set_msg(sender=A, value=0, at=T0)
    with pytest.raises(UserError, match="already revealed"):
        c.reveal(eid, "an idea worth sealing", "salt-1")


def test_reveal_matches_vectors():
    module = load_module()
    vectors = json.loads((ROOT / "tests" / "vectors.json").read_text(encoding="utf-8"))
    for v in vectors:
        c, _ = fresh_contract()
        set_msg(sender=v["address"], value=2 * GEN, at=T0)
        eid = c.register(v["seal"])
        set_msg(sender=v["address"], value=0, at=T0)
        c.reveal(eid, v["text"], v["salt"])
        assert module.seal_hash(v["text"], v["salt"], v["address"]) == v["seal"]


# --- challenge ---------------------------------------------------------------


def test_challenge_rules():
    c, _ = fresh_contract()
    a_id = make_entry(c, A)
    later = T0 + datetime.timedelta(hours=1)
    b_id = make_entry(c, B, text="another idea", salt="salt-9", at=later)
    # not revealed yet
    set_msg(sender=A, value=5 * GEN, at=later)
    with pytest.raises(UserError, match="revealed first"):
        c.challenge(a_id, b_id)
    reveal_entry(c, A, a_id, at=later)
    reveal_entry(c, B, b_id, "another idea", "salt-9", later)
    # wrong author files
    set_msg(sender=B, value=5 * GEN, at=later)
    with pytest.raises(UserError, match="only the author"):
        c.challenge(a_id, b_id)
    # self dispute
    set_msg(sender=A, value=5 * GEN, at=later)
    with pytest.raises(UserError, match="against itself"):
        c.challenge(a_id, a_id)
    # wrong stake
    set_msg(sender=A, value=GEN, at=later)
    with pytest.raises(UserError, match="exactly 5 GEN"):
        c.challenge(a_id, b_id)
    # reversed order fails: B was not sealed before A
    set_msg(sender=B, value=5 * GEN, at=later)
    with pytest.raises(UserError, match="strictly before"):
        c.challenge(b_id, a_id)


def test_challenge_rejects_same_timestamp():
    c, _ = fresh_contract()
    a_id = make_entry(c, A, at=T0)
    b_id = make_entry(c, B, text="another idea", salt="salt-9", at=T0)
    reveal_entry(c, A, a_id, at=T0)
    reveal_entry(c, B, b_id, "another idea", "salt-9", T0)
    set_msg(sender=A, value=5 * GEN, at=T0)
    with pytest.raises(UserError, match="strictly before"):
        c.challenge(a_id, b_id)


def test_challenge_rejects_a_second_filing_of_the_pair():
    c, _ = fresh_contract()
    pair(c)
    with pytest.raises(UserError, match="already been disputed"):
        set_msg(sender=A, value=5 * GEN, at=T0 + datetime.timedelta(hours=2))
        c.challenge(1, 2)


# --- judge --------------------------------------------------------------------


def test_judge_upheld_moves_bond_and_stake():
    c, _ = fresh_contract()
    a_id, b_id, did = pair(c, "SUBSTANTIAL")
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=2))
    verdict = c.judge(did)
    assert verdict == "UPHELD"
    d = json.loads(c.get_dispute(did))
    assert d["label"] == "SUBSTANTIAL"
    assert d["to_challenger"] == str(7 * GEN)  # stake 5 + B's bond 2
    assert d["bonus"] == str(2 * GEN)
    b = json.loads(c.get_entry(b_id))
    assert b["derived_from"] == a_id
    assert b["bond_left"] == "0"
    assert int(c.stakes_held) == 0
    assert invariant(c)


def test_upheld_after_the_season_pays_no_bonus():
    """Filed past B's 90 days, an UPHELD dispute returns the stake only; the bond is out of reach."""
    c, _ = fresh_contract()
    a_id = make_entry(c, A, "the reference text", "salt-a", T0)
    reveal_entry(c, A, a_id, "the reference text", "salt-a", T0)
    later = T0 + datetime.timedelta(hours=1)
    b_id = make_entry(c, B, "a reworded copy of the reference text", "salt-b", later)
    reveal_entry(c, B, b_id, "a reworded copy of the reference text", "salt-b", later)
    late = T0 + datetime.timedelta(days=91)
    queue_labels("SUBSTANTIAL")
    set_msg(sender=A, value=5 * GEN, at=late)
    did = c.challenge(a_id, b_id)
    assert json.loads(c.get_dispute(did))["winnable"] is False
    set_msg(sender=C, value=0, at=late)
    assert c.judge(did) == "UPHELD"
    d = json.loads(c.get_dispute(did))
    assert d["bonus"] == "0"
    assert d["to_challenger"] == str(5 * GEN)
    b = json.loads(c.get_entry(b_id))
    assert b["derived_from"] == a_id
    assert b["bond_left"] == str(2 * GEN)
    assert invariant(c)


def test_judge_adjacent_returns_only_the_stake():
    c, _ = fresh_contract()
    _, b_id, did = pair(c, "PARTIAL")
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=2))
    assert c.judge(did) == "ADJACENT"
    d = json.loads(c.get_dispute(did))
    assert d["to_challenger"] == str(5 * GEN)
    assert d["bonus"] == "0"
    b = json.loads(c.get_entry(b_id))
    assert b["bond_left"] == str(2 * GEN)
    assert b["adjacent"] == 1
    assert invariant(c)


def test_judge_absolved_pays_the_accused():
    c, _ = fresh_contract()
    _, b_id, did = pair(c, "NONE")
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=2))
    assert c.judge(did) == "ABSOLVED"
    d = json.loads(c.get_dispute(did))
    assert d["to_accused"] == str(5 * GEN)
    b = json.loads(c.get_entry(b_id))
    assert b["absolved"] == 1
    assert invariant(c)


def test_judge_stale_after_the_window():
    c, _ = fresh_contract()
    _, _, did = pair(c)
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=49))
    assert c.judge(did) == "STALE"
    d = json.loads(c.get_dispute(did))
    assert d["label"] == ""
    assert d["to_challenger"] == str(5 * GEN)
    # the pair is free to be disputed again
    set_msg(sender=A, value=5 * GEN, at=T0 + datetime.timedelta(hours=50))
    assert c.challenge(1, 2) == 2
    assert invariant(c)


def test_judge_twice_is_rejected():
    c, _ = fresh_contract()
    _, _, did = pair(c)
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=2))
    c.judge(did)
    with pytest.raises(UserError, match="already read"):
        c.judge(did)


def test_judge_model_slip_retries_once():
    c, _ = fresh_contract()
    _, _, did = pair(c)
    module = load_module()
    queue_labels(module.gl.vm.UserError("[LLM_ERROR] empty"), "SUBSTANTIAL")
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=2))
    assert c.judge(did) == "UPHELD"


# --- close_entry ---------------------------------------------------------------


def test_close_entry_after_the_season():
    c, _ = fresh_contract()
    eid = make_entry(c, A, bond=4 * GEN)
    later = T0 + datetime.timedelta(days=91)
    set_msg(sender=C, value=0, at=later)
    amount = c.close_entry(eid)
    assert amount == 4 * GEN
    out = json.loads(c.get_entry(eid))
    assert out["state"] == "MATURED"
    assert out["matured_by"].lower() == C.lower()
    assert invariant(c)
    set_msg(sender=C, value=0, at=later)
    with pytest.raises(UserError, match="already matured"):
        c.close_entry(eid)


def test_close_entry_too_early():
    c, _ = fresh_contract()
    eid = make_entry(c, A)
    set_msg(sender=A, value=0, at=T0 + datetime.timedelta(days=30))
    with pytest.raises(UserError, match="90 days"):
        c.close_entry(eid)


def test_close_entry_blocked_by_open_dispute_and_by_mark():
    c, _ = fresh_contract()
    _, b_id, did = pair(c)
    later = T0 + datetime.timedelta(days=91)
    set_msg(sender=C, value=0, at=later)
    with pytest.raises(UserError, match="still waiting"):
        c.close_entry(b_id)
    # stale it (no model runs past the window), then mark B upheld on a new dispute
    c.judge(did)
    queue_labels("SUBSTANTIAL")
    set_msg(sender=A, value=5 * GEN, at=later)
    did2 = c.challenge(1, 2)
    set_msg(sender=C, value=0, at=later)
    assert c.judge(did2) == "UPHELD"
    set_msg(sender=C, value=0, at=later)
    with pytest.raises(UserError, match="does not mature"):
        c.close_entry(b_id)


# --- withdraw --------------------------------------------------------------------


def test_withdraw_is_the_only_payout():
    c, _ = fresh_contract()
    _, _, did = pair(c, "NONE")
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=2))
    c.judge(did)
    set_msg(sender=B, value=0, at=T0 + datetime.timedelta(hours=3))
    assert c.withdraw() == 5 * GEN
    assert transfers_total() == 5 * GEN
    assert transfers[0]["to"] == B.lower()
    assert int(c.paid) == 5 * GEN
    assert int(c.owed) == 0
    assert invariant(c)
    set_msg(sender=B, value=0, at=T0 + datetime.timedelta(hours=3))
    with pytest.raises(UserError, match="nothing to withdraw"):
        c.withdraw()


# --- views -----------------------------------------------------------------------


def test_views_shape():
    c, _ = fresh_contract()
    a_id, b_id, did = pair(c, "PARTIAL")
    set_msg(sender=C, value=0, at=T0 + datetime.timedelta(hours=2))
    c.judge(did)

    missing = json.loads(c.get_entry(99))
    assert missing["found"] is False
    assert "totals" in missing

    everyone = json.loads(c.list_entries("", 0, 10))
    assert everyone["total"] == 2
    assert [row["id"] for row in everyone["items"]] == [2, 1]

    mine = json.loads(c.list_entries(A, 0, 10))
    assert mine["total"] == 1
    assert mine["items"][0]["id"] == a_id
    assert mine["balance"] == str(5 * GEN)
    bad = json.loads(c.list_entries("hello", 0, 10))
    assert bad["found"] is False

    marks_a = json.loads(c.list_marks(a_id))
    assert marks_a["marks"][0]["role"] == "earlier"
    marks_b = json.loads(c.list_marks(b_id))
    assert marks_b["marks"][0]["role"] == "later"
    assert marks_b["adjacent"] == 1

    d = json.loads(c.get_dispute(did))
    assert d["seconds_between"] == 3600
    assert d["judge_deadline"] - d["created_at"] == 48 * 3600
    missing_d = json.loads(c.get_dispute(77))
    assert missing_d["found"] is False
