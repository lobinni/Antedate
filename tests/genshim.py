"""
genshim - a tiny offline stand-in for the GenLayer runtime.

It installs a fake `genlayer` module into sys.modules so that
contracts/antedate.py can be imported and exercised without a node, a
simulator or a network. Everything the contract touches is reproduced:

  - Address, u32, u64, u256 value types
  - TreeMap storage and the @allow decorator
  - gl.contract.Contract and the @gl.public.write / .payable / .view decorators
  - gl.message (sender_address, value, raw["datetime"]) - set per call
  - gl.vm.UserError, gl.vm.Return and gl.vm.run_nondet (leader + agreement check)
  - gl.nondet.exec_prompt - answered from a scripted label queue
  - gl.evm.contract_interface and _Payee(...).emit_transfer, recorded here

Use fresh_contract() for a clean world, set_msg() to act as an account, and
queue_labels() to script what the validators will agree on.
"""

from __future__ import annotations

import datetime
import importlib.util
import json
import os
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
#: scripts/mutate.py points this at a mutated copy; nothing else should.
CONTRACT_PATH = Path(os.environ.get("ANTEDATE_CONTRACT", ROOT / "contracts" / "antedate.py"))

GEN = 10**18
T0 = datetime.datetime(2026, 1, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)


# --- value types ----------------------------------------------------------


class Address(str):
    """A 20-byte hex address. Normalised to lower-case so equality is case-proof."""

    def __new__(cls, value):
        text = str(value).lower()
        if len(text) != 42 or not text.startswith("0x"):
            raise ValueError("an address is 0x plus 40 hex characters")
        int(text[2:], 16)
        return str.__new__(cls, text)

    @property
    def as_hex(self) -> str:
        return str(self)


def _bounded(name: str, bits: int):
    top = 2**bits - 1

    class _Bound(int):
        def __new__(cls, value=0):
            v = int(value)
            if v < 0 or v > top:
                raise ValueError(f"{name} out of range")
            return int.__new__(cls, v)

    _Bound.__name__ = name
    return _Bound


u32 = _bounded("u32", 32)
u64 = _bounded("u64", 64)
u256 = _bounded("u256", 256)


class TreeMap(dict):
    """dict with a .get(key, default) and membership, matching storage semantics."""

    pass


def allow(cls):
    return cls


# --- message context ---------------------------------------------------------


class _Message:
    def __init__(self):
        self.sender_address = Address("0x" + "00" * 20)
        self.value = 0
        self.raw = {"datetime": T0.isoformat()}


# --- nondeterminism ------------------------------------------------------------


class UserError(Exception):
    pass


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


_label_queue: list = ["SUBSTANTIAL"]
transfers: list = []


def exec_prompt(prompt: str):
    label = _label_queue.pop(0) if len(_label_queue) > 1 else _label_queue[0]
    if isinstance(label, Exception):
        raise label
    if isinstance(label, (dict, str)) and not isinstance(label, Exception):
        if isinstance(label, dict):
            return json.dumps(label)
        return json.dumps({"label": label})
    raise UserError("[LLM_ERROR] bad label")


def run_nondet(leader_fn, validator_fn):
    result = leader_fn()
    if not validator_fn(Return(result)):
        raise UserError("[LLM_ERROR] validators disagreed")
    return result


def contract_interface(cls):
    class _Binding:
        def __init__(self, address):
            self._address = Address(address)

        def __getattr__(self, name):
            def _send(**kwargs):
                transfers.append({"to": self._address.as_hex, "method": name, **kwargs})
                return None

            return _send

    return _Binding


# --- module wiring -------------------------------------------------------------


def _build_module():
    mod = types.ModuleType("genlayer")
    mod.__all__ = ["Address", "u32", "u64", "u256"]
    mod.Address = Address
    mod.u32 = u32
    mod.u64 = u64
    mod.u256 = u256

    mod.message = _Message()
    mod.nondet = types.SimpleNamespace(exec_prompt=exec_prompt)
    mod.vm = types.SimpleNamespace(UserError=UserError, Return=Return, run_nondet=run_nondet)
    mod.evm = types.SimpleNamespace(contract_interface=contract_interface)

    class _Contract:
        pass

    mod.contract = types.SimpleNamespace(Contract=_Contract)

    def _identity(fn):
        return fn

    class _Write:
        def __call__(self, fn):
            return fn

        def payable(self, fn):
            return fn

    mod.public = types.SimpleNamespace(write=_Write(), view=_identity)

    storage = types.ModuleType("genlayer.storage")
    storage.TreeMap = TreeMap
    storage.allow = allow
    mod.storage = storage
    return mod, storage


_gl_mod, _gl_storage = _build_module()
sys.modules.setdefault("genlayer", _gl_mod)
sys.modules.setdefault("genlayer.storage", _gl_storage)
gl = _gl_mod


# --- harness --------------------------------------------------------------------


def set_msg(sender: str | None = None, value: int = 0, at: datetime.datetime | None = None):
    """Act as an account: sender, attached value, and the shared transaction time."""
    if sender is not None:
        gl.message.sender_address = Address(sender)
    gl.message.value = value
    if at is not None:
        gl.message.raw["datetime"] = at.isoformat()


def queue_labels(*labels):
    """Script what exec_prompt answers next (each label feeds one judge call)."""
    _label_queue.clear()
    _label_queue.extend(labels if labels else ["SUBSTANTIAL"])


def fresh_contract():
    """Import contracts/antedate.py fresh and deploy it with clean storage."""
    name = "antedate_under_test"
    sys.modules.pop(name, None)
    spec = importlib.util.spec_from_file_location(name, CONTRACT_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    contract = module.Antedate()
    contract.__init__()
    for field, hint in module.Antedate.__annotations__.items():
        if getattr(hint, "__origin__", None) is TreeMap or hint is TreeMap:
            setattr(contract, field, TreeMap())
    transfers.clear()
    queue_labels("SUBSTANTIAL")
    set_msg(sender="0x" + "00" * 20, value=0, at=T0)
    return contract, module


def load_module():
    """Import the contract module without deploying (for helper-level tests)."""
    name = "antedate_helpers"
    sys.modules.pop(name, None)
    spec = importlib.util.spec_from_file_location(name, CONTRACT_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def invariant(contract) -> bool:
    """The one rule that must survive every step: received == bonds_left + stakes_held + owed + paid."""
    return int(contract.received) == (
        int(contract.bonds_left) + int(contract.stakes_held) + int(contract.owed) + int(contract.paid)
    )


def transfers_total() -> int:
    return sum(int(t.get("value", 0)) for t in transfers if t["method"] == "emit_transfer")
