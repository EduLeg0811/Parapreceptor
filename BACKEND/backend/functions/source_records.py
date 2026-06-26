from __future__ import annotations

import json
import re
from pathlib import Path
from threading import Lock
from typing import Any

_MD_RE = re.compile(r"\*{1,3}|_{1,3}")


def strip_markdown(text: str) -> str:
    return _MD_RE.sub("", text or "").strip()


BASE_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = BASE_DIR / "Files" / "corpus"

FILE_STEM_BY_INDEX_ID = {
    "200teat": "200TEAT",
    "700exp": "700EXP",
    "ccg": "CCG",
    "dac": "DAC",
    "dupla": "DUPLA",
    "ec": "EC",
    "hsp": "HSP",
    "hsr": "HSR",
    "lo": "LO",
    "mini_arlindo": "MINI_ARLINDO",
    "proexis": "PROEXIS",
    "proj": "PROJ",
    "proj1986": "PROJ1986",
    "quest": "QUEST",
    "temas": "TEMAS",
    "tnp": "TNP",
    "zefiro": "ZEFIRO",
}

BOOK_CODE_BY_INDEX_ID = {
    "200teat": "TEAT",
    "700exp": "EXP",
    "ccg": "CCG",
    "dac": "DAC",
    "dupla": "MDE",
    "ec": "EC",
    "hsp": "HSP",
    "hsr": "HSR",
    "lo": "LO",
    "mini_arlindo": "MINI_ARLINDO",
    "proexis": "MP",
    "proj": "PROJ",
    "proj1986": "PROJ1986",
    "quest": "QUEST",
    "temas": "TC",
    "tnp": "TNP",
    "zefiro": "ZEFIRO",
}

_SOURCE_INDEX_CACHE: dict[str, Any] | None = None
_SOURCE_DOC_CACHE: dict[str, dict[str, Any]] = {}
_SOURCE_CACHE_LOCK = Lock()


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _file_signature(path: Path) -> tuple[int, int]:
    stat = path.stat()
    return stat.st_mtime_ns, stat.st_size


def _source_dir_signature() -> tuple[tuple[str, int, int], ...]:
    if not SOURCE_DIR.exists():
        return ()
    return tuple(
        (path.name, path.stat().st_mtime_ns, path.stat().st_size)
        for path in sorted(SOURCE_DIR.glob("*.json"), key=lambda item: item.name.lower())
    )


def _file_stem_for(index_id: str, path: Path) -> str:
    return FILE_STEM_BY_INDEX_ID.get(index_id) or path.stem.upper()


def _book_code_for(index_id: str, file_stem: str) -> str:
    return BOOK_CODE_BY_INDEX_ID.get(index_id) or file_stem.upper()


def _normalize_record(record: Any, position: int) -> dict[str, Any] | None:
    if not isinstance(record, dict):
        return None

    row_map = record.get("data") if isinstance(record.get("data"), dict) else {}
    row_map = dict(row_map)

    for key, value in record.items():
        if key in {"data", "metadata", "row"}:
            continue
        if key == "page":
            row_map.setdefault("pagina", value)
        else:
            row_map.setdefault(str(key), value)

    if "text" not in row_map:
        row_map["text"] = record.get("text") or ""
    if "title" not in row_map:
        row_map["title"] = record.get("title") or ""
    if "pagina" not in row_map and "page" in row_map:
        row_map["pagina"] = row_map.get("page")
    if "page" not in row_map and "pagina" in row_map:
        row_map["page"] = row_map.get("pagina")
    row_map.setdefault("number", str(position))

    metadata = record.get("metadata") if isinstance(record.get("metadata"), dict) else {}
    metadata = dict(metadata)
    for key in ("title", "pagina", "page", "date", "author", "area", "theme", "numverb", "number"):
        value = row_map.get(key)
        if value not in (None, ""):
            metadata.setdefault(key, value)

    normalized = dict(record)
    normalized["row"] = int(record.get("row") or position + 1)
    normalized["text"] = str(row_map.get("text") or record.get("text") or "")
    normalized["metadata"] = metadata
    normalized["data"] = row_map
    return normalized


def _normalize_source_document(payload: dict[str, Any], path: Path) -> dict[str, Any]:
    index_id = str(payload.get("index_id") or path.stem).strip().lower()
    file_stem = str(payload.get("file_stem") or _file_stem_for(index_id, path)).strip()
    book_code = str(payload.get("book_code") or _book_code_for(index_id, file_stem)).strip().upper()
    records = payload.get("records") if isinstance(payload.get("records"), list) else []
    normalized_records = [
        normalized
        for position, record in enumerate(records, start=1)
        if (normalized := _normalize_record(record, position)) is not None
    ]

    normalized_doc = dict(payload)
    normalized_doc.setdefault("schema_version", 1)
    normalized_doc["index_id"] = index_id
    normalized_doc["index_label"] = str(payload.get("index_label") or file_stem).strip()
    normalized_doc["book_code"] = book_code
    normalized_doc["file_stem"] = file_stem
    normalized_doc["source_file"] = str(payload.get("source_file") or path.as_posix())
    normalized_doc["source_rows"] = int(payload.get("source_rows") or len(normalized_records))
    normalized_doc["records"] = normalized_records
    return normalized_doc


def _load_source_index() -> dict[str, Any]:
    if not SOURCE_DIR.exists():
        raise FileNotFoundError(f"Diretorio de corpus nao encontrado: {SOURCE_DIR}")

    global _SOURCE_INDEX_CACHE
    signature = _source_dir_signature()
    with _SOURCE_CACHE_LOCK:
        if _SOURCE_INDEX_CACHE and _SOURCE_INDEX_CACHE.get("_signature") == signature:
            return _SOURCE_INDEX_CACHE

        sources: list[dict[str, Any]] = []
        for path in sorted(SOURCE_DIR.glob("*.json"), key=lambda item: item.name.lower()):
            payload = _load_json(path)
            if not isinstance(payload, dict):
                continue
            index_id = str(payload.get("index_id") or path.stem).strip().lower()
            file_stem = str(payload.get("file_stem") or _file_stem_for(index_id, path)).strip()
            book_code = str(payload.get("book_code") or _book_code_for(index_id, file_stem)).strip().upper()
            records = payload.get("records") if isinstance(payload.get("records"), list) else []
            sources.append(
                {
                    "index_id": index_id,
                    "index_label": str(payload.get("index_label") or file_stem).strip(),
                    "book_code": book_code,
                    "book_name": str(payload.get("book_name") or "").strip(),
                    "file_stem": file_stem,
                    "path": path.name,
                    "source_file": str(payload.get("source_file") or path.as_posix()),
                    "source_rows": int(payload.get("source_rows") or len(records)),
                }
            )

        payload = {
            "schema_version": 1,
            "sources": sources,
        }
        payload["_signature"] = signature
        _SOURCE_INDEX_CACHE = payload
        return payload


def list_source_documents() -> list[dict[str, Any]]:
    index = _load_source_index()
    sources = index.get("sources") or []
    if not isinstance(sources, list):
        raise ValueError(f"Lista de fontes invalida: {SOURCE_DIR}")
    return [item for item in sources if isinstance(item, dict)]


def resolve_source_entry(identifier: str) -> dict[str, Any]:
    needle = str(identifier or "").strip()
    if not needle:
        raise ValueError("Identificador de fonte obrigatorio.")

    needle_lower = needle.lower()
    needle_upper = needle.upper()
    for entry in list_source_documents():
        candidates = {
            str(entry.get("index_id") or "").lower(),
            str(entry.get("file_stem") or "").lower(),
        }
        book_code = str(entry.get("book_code") or "").strip().upper()
        if needle_lower in candidates or (book_code and needle_upper == book_code):
            return entry

    raise FileNotFoundError(f"Fonte JSON nao encontrada: {identifier}")


def source_path_for(identifier: str) -> Path:
    entry = resolve_source_entry(identifier)
    path_name = str(entry.get("path") or "").strip()
    if not path_name:
        raise ValueError(f"Fonte sem index_id configurado: {identifier}")
    return SOURCE_DIR / path_name


def load_source_document(identifier: str, *, use_cache: bool = True) -> dict[str, Any]:
    path = source_path_for(identifier)
    if not path.exists():
        raise FileNotFoundError(f"Fonte JSON nao encontrada: {path}")

    signature = _file_signature(path)
    cache_key = str(path.resolve())
    if not use_cache:
        payload = _load_json(path)
        if not isinstance(payload, dict):
            raise ValueError(f"Fonte JSON invalida: {path}")
        return _normalize_source_document(payload, path)

    with _SOURCE_CACHE_LOCK:
        cached = _SOURCE_DOC_CACHE.get(cache_key)
        if cached and cached.get("_signature") == signature:
            return cached["payload"]

        payload = _load_json(path)
        if not isinstance(payload, dict):
            raise ValueError(f"Fonte JSON invalida: {path}")
        payload = _normalize_source_document(payload, path)
        _SOURCE_DOC_CACHE[cache_key] = {
            "_signature": signature,
            "payload": payload,
        }
        return payload


def clear_source_document_cache(identifier: str | None = None) -> None:
    with _SOURCE_CACHE_LOCK:
        if identifier is None:
            _SOURCE_DOC_CACHE.clear()
            return

        try:
            cache_key = str(source_path_for(identifier).resolve())
        except Exception:
            return
        _SOURCE_DOC_CACHE.pop(cache_key, None)


def iter_source_documents(*, use_cache: bool = True) -> list[dict[str, Any]]:
    return [
        load_source_document(str(entry.get("index_id") or entry.get("file_stem") or ""), use_cache=use_cache)
        for entry in list_source_documents()
    ]


def collect_source_manifest() -> list[dict[str, Any]]:
    if not SOURCE_DIR.exists():
        return []

    manifest: list[dict[str, Any]] = []
    for entry in list_source_documents():
        index_id = str(entry.get("index_id") or "").strip()
        if not index_id:
            continue
        path_name = str(entry.get("path") or f"{index_id}.json").strip()
        path = SOURCE_DIR / path_name
        if not path.exists():
            continue
        stat = path.stat()
        manifest.append(
            {
                "arquivo": path.name,
                "index_id": index_id,
                "file_stem": str(entry.get("file_stem") or ""),
                "tamanho": stat.st_size,
                "mtime_ns": stat.st_mtime_ns,
            }
        )
    return manifest
