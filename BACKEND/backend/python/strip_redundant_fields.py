"""Remove campos redundantes (text_plain, display_data, hyperlinks) de todos os source JSONs."""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

SOURCE_DIR = Path(__file__).resolve().parents[2] / "backend" / "Files" / "Source"
FIELDS_TO_REMOVE = {"text_plain", "display_data", "hyperlinks"}


def _strip_record(record: dict) -> dict:
    return {k: v for k, v in record.items() if k not in FIELDS_TO_REMOVE}


def _write_atomic(path: Path, payload: dict) -> None:
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=path.name + ".", suffix=".tmp")
    os.close(fd)
    try:
        Path(tmp).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        Path(tmp).replace(path)
    finally:
        if Path(tmp).exists():
            Path(tmp).unlink(missing_ok=True)


def main() -> None:
    for json_path in sorted(SOURCE_DIR.glob("*.json")):
        if json_path.name == "index.json":
            continue

        doc = json.loads(json_path.read_text(encoding="utf-8"))
        if not isinstance(doc, dict):
            continue

        changed = False

        if "records" in doc and isinstance(doc["records"], list):
            stripped = [_strip_record(r) for r in doc["records"]]
            if stripped != doc["records"]:
                doc["records"] = stripped
                changed = True

        if changed:
            _write_atomic(json_path, doc)
            print(f"  cleaned: {json_path.name}")
        else:
            print(f"  ok (no changes): {json_path.name}")


if __name__ == "__main__":
    main()
