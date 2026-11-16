"""
tests/run.py - a dependency-free runner for the offline suites.

    python3 tests/run.py

It provides just enough of the pytest surface (raises) for the suites and
executes every test_* function, printing a pass/fail line for each. The same
files also run under a real pytest for richer reporting:

    python -m pytest tests -q
"""

import contextlib
import re
import sys
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


class _Raises:
    def __init__(self, exc, match=None):
        self.exc = exc
        self.match = match
        self.value = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            raise AssertionError(f"expected {self.exc.__name__} but nothing was raised")
        if not issubclass(exc_type, self.exc):
            return False
        if self.match and not re.search(self.match, str(exc)):
            raise AssertionError(f"{exc} did not match /{self.match}/")
        self.value = exc
        return True


pytest_shim = type(sys)("pytest")
pytest_shim.raises = lambda exc, match=None: _Raises(exc, match)
sys.modules.setdefault("pytest", pytest_shim)


def main() -> int:
    total = passed = 0
    failures = []
    for name in ("test_contract", "test_money", "test_static"):
        module = __import__(name)
        for attr in sorted(dir(module)):
            if not attr.startswith("test_"):
                continue
            fn = getattr(module, attr)
            if not callable(fn):
                continue
            total += 1
            label = f"{name}.{attr}"
            try:
                fn()
                passed += 1
                print(f"pass  {label}")
            except Exception:
                failures.append(label)
                print(f"FAIL  {label}")
                traceback.print_exc(limit=3)
    print(f"\n{passed}/{total} passing" + (" - all green" if passed == total else ""))
    return 0 if passed == total else 1


if __name__ == "__main__":
    with contextlib.suppress(KeyboardInterrupt):
        sys.exit(main())
