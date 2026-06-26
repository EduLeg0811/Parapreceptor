import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.functions.books import find_book_reference_by_mode


def main() -> int:
    book = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    mode = (sys.argv[2] if len(sys.argv) > 2 else "bee").strip().lower()
    if not book:
        print(json.dumps({"ok": False, "error": "Parametro 'book' e obrigatorio."}))
        return 1
    if mode not in {"bee", "simples"}:
        print(json.dumps({"ok": False, "error": "Parametro 'mode' invalido. Use 'bee' ou 'simples'."}))
        return 1

    try:
        result = find_book_reference_by_mode(book, mode=mode)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1

    print(json.dumps({"ok": True, "result": result}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
