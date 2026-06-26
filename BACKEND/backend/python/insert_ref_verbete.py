import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.functions.books import find_refs_by_titles


def main() -> int:
    raw_titles = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not raw_titles:
        print(json.dumps({"ok": False, "error": "Parametro 'titles' e obrigatorio."}))
        return 1

    # Accept comma, semicolon, or line breaks as title separators.
    titles = [part.strip() for part in re.split(r"[;,\r\n]+", raw_titles) if part.strip()]
    if not titles:
        print(json.dumps({"ok": False, "error": "Nenhum verbete valido informado."}))
        return 1

    try:
        result = find_refs_by_titles(titles)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1

    print(json.dumps({"ok": True, "result": result}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
