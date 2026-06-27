from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
from threading import Lock
import uuid
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import quote
import zipfile

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

DATA_DIR = ROOT_DIR / "server-data"
UPLOADS_DIR = DATA_DIR / "uploads"
META_DIR = DATA_DIR / "meta"
PYTHON_DIR = Path(__file__).resolve().parent / "python"

try:
    from backend.python.external_dictionary import (
        clean_text as clean_external_dictionary_term,
        fetch_analogico_aulete,
        fetch_etimologia_dicionario_etimologico,
        run_lexical_pipeline,
    )
    from backend.functions.online_dictionary_service import search_online_dictionaries
except Exception:
    from python.external_dictionary import (
        clean_text as clean_external_dictionary_term,
        fetch_analogico_aulete,
        fetch_etimologia_dicionario_etimologico,
        run_lexical_pipeline,
    )
    from functions.online_dictionary_service import search_online_dictionaries


def resolve_biblio_file(filename: str) -> Path:
    preferred = ROOT_DIR / "backend" / "Files" / "Biblio" / filename
    if preferred.exists():
        return preferred
    return ROOT_DIR / "backend" / "Files" / filename


def validate_external_dictionary_term(raw_term: str, param_name: str = "palavra") -> str:
    word = clean_external_dictionary_term(raw_term)
    if not word:
        raise HTTPException(status_code=400, detail=f"Parametro '{param_name}' e obrigatorio.")
    if len(word) > 80:
        raise HTTPException(status_code=400, detail=f"Parametro '{param_name}' deve ter no maximo 80 caracteres.")
    return word

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
META_DIR.mkdir(parents=True, exist_ok=True)

SEMANTIC_SEARCH_PROGRESS_LOCK = Lock()
SEMANTIC_SEARCH_PROGRESS: dict[str, Any] = {
    "searchType": "semantic_search",
    "status": "idle",
    "startedAt": None,
    "finishedAt": None,
    "updatedAt": None,
    "term": "",
    "limit": 0,
    "minScore": None,
    "ignoreBaseCalibration": False,
    "usesCalibratedMinScores": True,
    "totalIndexes": 1,
    "processedIndexes": 0,
    "currentIndexPosition": 0,
    "currentIndexId": "",
    "currentIndexLabel": "",
    "currentMatches": 0,
    "totalMatchesAccumulated": 0,
    "totalFound": 0,
    "lexicalFilteredCount": 0,
    "groupsCount": 0,
    "topScore": None,
    "message": "",
    "error": None,
    "ragContext": None,
    "events": [],
}

SEMANTIC_OVERVIEW_PROGRESS_LOCK = Lock()
SEMANTIC_OVERVIEW_PROGRESS: dict[str, Any] = {
    "searchType": "semantic_overview",
    "status": "idle",
    "startedAt": None,
    "finishedAt": None,
    "updatedAt": None,
    "term": "",
    "limit": 0,
    "minScore": None,
    "ignoreBaseCalibration": False,
    "usesCalibratedMinScores": True,
    "totalIndexes": 0,
    "processedIndexes": 0,
    "currentIndexPosition": 0,
    "currentIndexId": "",
    "currentIndexLabel": "",
    "currentMatches": 0,
    "totalMatchesAccumulated": 0,
    "totalFound": 0,
    "lexicalFilteredCount": 0,
    "groupsCount": 0,
    "topScore": None,
    "message": "",
    "error": None,
    "ragContext": None,
    "events": [],
}

LEXICAL_OVERVIEW_PROGRESS_LOCK = Lock()
LEXICAL_OVERVIEW_PROGRESS: dict[str, Any] = {
    "searchType": "lexical_overview",
    "status": "idle",
    "startedAt": None,
    "finishedAt": None,
    "updatedAt": None,
    "term": "",
    "limit": 0,
    "totalIndexes": 0,
    "processedIndexes": 0,
    "currentIndexPosition": 0,
    "currentIndexId": "",
    "currentIndexLabel": "",
    "currentMatches": 0,
    "totalMatchesAccumulated": 0,
    "totalFound": 0,
    "groupsCount": 0,
    "topScore": None,
    "message": "",
    "error": None,
    "ragContext": None,
    "events": [],
}


def _utc_iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _update_semantic_overview_progress(update: dict[str, Any], *, reset_events: bool = False) -> None:
    event = update.pop("event", None)
    timestamp = _utc_iso_now()
    with SEMANTIC_OVERVIEW_PROGRESS_LOCK:
        current = dict(SEMANTIC_OVERVIEW_PROGRESS)
        events = [] if reset_events else list(current.get("events") or [])
        if event:
            events.insert(0, {"at": timestamp, **event})
            events = events[:80]
        current.update(update)
        current["updatedAt"] = timestamp
        current["events"] = events
        SEMANTIC_OVERVIEW_PROGRESS.clear()
        SEMANTIC_OVERVIEW_PROGRESS.update(current)


def _update_semantic_search_progress(update: dict[str, Any], *, reset_events: bool = False) -> None:
    event = update.pop("event", None)
    timestamp = _utc_iso_now()
    with SEMANTIC_SEARCH_PROGRESS_LOCK:
        current = dict(SEMANTIC_SEARCH_PROGRESS)
        events = [] if reset_events else list(current.get("events") or [])
        if event:
            events.insert(0, {"at": timestamp, **event})
            events = events[:80]
        current.update(update)
        current["updatedAt"] = timestamp
        current["events"] = events
        SEMANTIC_SEARCH_PROGRESS.clear()
        SEMANTIC_SEARCH_PROGRESS.update(current)


def _snapshot_semantic_search_progress() -> dict[str, Any]:
    with SEMANTIC_SEARCH_PROGRESS_LOCK:
        snapshot = dict(SEMANTIC_SEARCH_PROGRESS)
        snapshot["events"] = [dict(item) for item in SEMANTIC_SEARCH_PROGRESS.get("events", [])]
        return snapshot


def _snapshot_semantic_overview_progress() -> dict[str, Any]:
    with SEMANTIC_OVERVIEW_PROGRESS_LOCK:
        snapshot = dict(SEMANTIC_OVERVIEW_PROGRESS)
        snapshot["events"] = [dict(item) for item in SEMANTIC_OVERVIEW_PROGRESS.get("events", [])]
        return snapshot


def _update_lexical_overview_progress(update: dict[str, Any], *, reset_events: bool = False) -> None:
    event = update.pop("event", None)
    timestamp = _utc_iso_now()
    with LEXICAL_OVERVIEW_PROGRESS_LOCK:
        current = dict(LEXICAL_OVERVIEW_PROGRESS)
        events = [] if reset_events else list(current.get("events") or [])
        if event:
            events.insert(0, {"at": timestamp, **event})
            events = events[:80]
        current.update(update)
        current["updatedAt"] = timestamp
        current["events"] = events
        LEXICAL_OVERVIEW_PROGRESS.clear()
        LEXICAL_OVERVIEW_PROGRESS.update(current)


def _snapshot_lexical_overview_progress() -> dict[str, Any]:
    with LEXICAL_OVERVIEW_PROGRESS_LOCK:
        snapshot = dict(LEXICAL_OVERVIEW_PROGRESS)
        snapshot["events"] = [dict(item) for item in LEXICAL_OVERVIEW_PROGRESS.get("events", [])]
        return snapshot


def _sanitize_rag_context(rag_context: Any) -> dict[str, Any] | None:
    if not isinstance(rag_context, dict):
        return None
    sanitized = dict(rag_context)
    sanitized.pop("llmLog", None)
    return sanitized

PORT = int(os.getenv("PORT") or os.getenv("SERVER_PORT", "8787"))
frontend_origin = (os.getenv("FRONTEND_ORIGIN") or "http://localhost:5173").strip()
cors_origins = ["*"] if frontend_origin == "*" else [origin.strip() for origin in frontend_origin.split(",") if origin.strip()]
if "https://lexicons-frontend.onrender.com" not in cors_origins and "*" not in cors_origins:
    cors_origins.append("https://lexicons-frontend.onrender.com")
pdf2docx_python_cmd = (os.getenv("PDF2DOCX_PYTHON_CMD") or "python").strip()
backend_python_cmd = (os.getenv("BACKEND_PYTHON_CMD") or pdf2docx_python_cmd or "python").strip()
file_retention_hours = int(os.getenv("FILE_RETENTION_HOURS") or "24")
file_retention_seconds = max(1, file_retention_hours) * 3600
LETTER_CLASS = "A-Za-zÀ-ÖØ-öø-ÿ"
KEEP_WORD_HYPHEN_PREFIXES = {
    "além",
    "ante",
    "anti",
    "arqui",
    "auto",
    "bem",
    "co",
    "contra",
    "ex",
    "extra",
    "hiper",
    "infra",
    "inter",
    "intra",
    "macro",
    "micro",
    "mini",
    "multi",
    "neo",
    "pós",
    "pre",
    "pró",
    "proto",
    "pseudo",
    "recém",
    "semi",
    "sobre",
    "sub",
    "super",
    "supra",
    "tele",
    "ultra",
    "vice",
}
INLINE_HYPHENATED_WORD_RE = re.compile(rf"\b([{LETTER_CLASS}]{{2,}})-([{LETTER_CLASS}]{{2,}})\b")
TRAILING_HYPHEN_FRAGMENT_RE = re.compile(rf"([{LETTER_CLASS}]{{2,}})-$")
LEADING_WORD_FRAGMENT_RE = re.compile(rf"^([{LETTER_CLASS}]{{2,}})")
RULE_ONLY_TEXT_RE = re.compile(r"^[\s\-\_=~\.·•]{8,}$")
VML_WIDTH_STYLE_RE = re.compile(r"(\bwidth:)([0-9]+(?:\.[0-9]+)?)(pt\b)")
NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
DOCX_XML_NAMESPACES = {
    "w": NS_W,
    "wp": NS_WP,
    "a": NS_A,
}
for prefix, namespace in DOCX_XML_NAMESPACES.items():
    ET.register_namespace(prefix, namespace)


class ExecuteLLMRequest(BaseModel):
    model: str = ""
    messages: list[dict[str, Any]]
    previousResponseId: str | None = None
    systemPrompt: str = ""
    temperature: float = 0.7
    maxOutputTokens: int | None = None
    gpt5Verbosity: str | None = None
    gpt5Effort: str | None = None
    tools: list[dict[str, Any]] | None = None
    vectorStoreIds: list[str] = []
    inputFileIds: list[str] = []
    vectorMaxResults: int = 5


class InsertRefBookRequest(BaseModel):
    book: str
    mode: str = "bee"


def get_openai_api_key() -> str:
    return (os.getenv("OPENAI_API_KEY") or "").strip()


class InsertRefVerbeteRequest(BaseModel):
    titles: str


class BiblioGeralRequest(BaseModel):
    author: str = ""
    title: str = ""
    year: str = ""
    extra: str = ""
    topK: int = 10


class BiblioExternaRequest(BaseModel):
    query: str = ""
    author: str = ""
    title: str = ""
    year: str = ""
    journal: str = ""
    publisher: str = ""
    identifier: str = ""
    extra: str = ""
    freeText: str = ""
    topK: int = 5
    llmModel: str | None = None
    llmTemperature: float | None = None
    llmMaxOutputTokens: int | None = None
    llmGpt5Verbosity: str | None = None
    llmGpt5Effort: str | None = None
    llmSystemPrompt: str | None = None


class LexicalSearchRequest(BaseModel):
    book: str
    term: str
    limit: int = 50
    miniTextWindow: int = 3


class LexicalOverviewSearchRequest(BaseModel):
    term: str
    limit: int = 50
    miniTextWindow: int = 3
    sourceIds: list[str] = []
    maxResultsDocx: int | None = None


class LexicalOverviewPayloadExportRequest(BaseModel):
    term: str
    limit: int = 50
    miniTextWindow: int = 3
    sourceIds: list[str] = []
    totalBooks: int = 0
    totalFound: int = 0
    groups: list[dict[str, Any]] = []
    maxResultsDocx: int | None = None


class LexicalCitationLookupRequest(BaseModel):
    text: str
    paginasAntes: int = 2
    paginasDepois: int = 3


class LexicalVerbeteSearchRequest(BaseModel):
    author: str = ""
    title: str = ""
    area: str = ""
    text: str = ""
    limit: int = 50


class SemanticSearchRequest(BaseModel):
    indexId: str = ""
    query: str = ""
    limit: int = 10
    minScore: float | None = None
    miniTextWindow: int = 3
    useRagContext: bool = False
    excludeLexicalDuplicates: bool = True
    vectorStoreIds: list[str] = []
    ignoreBaseCalibration: bool = False


class SemanticOverviewSearchRequest(BaseModel):
    term: str = ""
    limit: int = 50
    minScore: float | None = None
    miniTextWindow: int = 3
    useRagContext: bool = False
    excludeLexicalDuplicates: bool = True
    vectorStoreIds: list[str] = []
    sourceIds: list[str] = []
    ignoreBaseCalibration: bool = False
    maxResultsDocx: int | None = None


class SemanticOverviewPayloadExportRequest(BaseModel):
    term: str = ""
    limit: int = 50
    minScore: float | None = None
    miniTextWindow: int = 3
    useRagContext: bool = False
    excludeLexicalDuplicates: bool = True
    vectorStoreIds: list[str] = []
    sourceIds: list[str] = []
    ignoreBaseCalibration: bool = False
    recommendedMinScoreMin: float = 0.0
    recommendedMinScoreMax: float = 0.0
    usesCalibratedMinScores: bool = False
    totalIndexes: int = 0
    totalFound: int = 0
    lexicalFilteredCount: int = 0
    ragContext: dict[str, Any] | None = None
    groups: list[dict[str, Any]] = []
    maxResultsDocx: int | None = None


class OnlineDictionarySearchRequest(BaseModel):
    term: str = ""


class HighlightRequest(BaseModel):
    term: str


class CreateBlankFileRequest(BaseModel):
    title: str = "novo-documento.docx"


class SaveFileTextRequest(BaseModel):
    text: str = ""
    html: str = ""


class VerbetografiaOpenTableRequest(BaseModel):
    title: str = ""
    specialty: str = ""


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_gc() -> None:
    run_storage_gc()


def meta_path_for(file_id: str) -> Path:
    return META_DIR / f"{file_id}.json"


def read_meta(file_id: str) -> dict[str, Any]:
    p = meta_path_for(file_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado.")
    return json.loads(p.read_text(encoding="utf-8"))


def write_meta(file_id: str, meta: dict[str, Any]) -> None:
    meta_path_for(file_id).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_unlink(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except OSError:
        pass


def open_file_in_local_word(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {path}")
    try:
        os.startfile(str(path))  # type: ignore[attr-defined]
    except AttributeError as exc:
        raise RuntimeError("Abertura automatica no Word disponivel apenas no Windows.") from exc
    except OSError as exc:
        raise RuntimeError(f"Nao foi possivel abrir o arquivo no Word local: {exc}") from exc


def run_storage_gc(retention_seconds: int = file_retention_seconds) -> None:
    now = time.time()
    referenced_uploads: set[str] = set()

    for meta_file in META_DIR.glob("*.json"):
        expired = False
        try:
            meta = json.loads(meta_file.read_text(encoding="utf-8"))
        except Exception:
            meta = {}
            expired = True

        if not expired and (now - meta_file.stat().st_mtime) > retention_seconds:
            expired = True

        stored_name = str(meta.get("storedName") or "").strip()
        source_stored_name = str(meta.get("sourceStoredName") or "").strip()

        if expired:
            if stored_name:
                safe_unlink(UPLOADS_DIR / stored_name)
            if source_stored_name:
                safe_unlink(UPLOADS_DIR / source_stored_name)
            safe_unlink(meta_file)
            continue

        if stored_name:
            referenced_uploads.add(stored_name)
        if source_stored_name:
            referenced_uploads.add(source_stored_name)

    for upload_file in UPLOADS_DIR.glob("*"):
        if upload_file.name in referenced_uploads:
            continue
        if (now - upload_file.stat().st_mtime) > retention_seconds:
            safe_unlink(upload_file)


def require_openai_key() -> None:
    if not get_openai_api_key():
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY nao configurada no servidor.")


def _normalize_docx_result_limit(value: int | None, default: int) -> int:
    try:
        raw_value = int(value) if value is not None else int(default)
    except Exception:
        raw_value = int(default)
    return max(1, min(raw_value, 5000))


def _limit_overview_groups_for_docx(groups: list[dict[str, Any]], max_results: int) -> tuple[list[dict[str, Any]], int, bool]:
    limited_groups: list[dict[str, Any]] = []
    included = 0
    truncated = False
    for group in groups:
        if included >= max_results:
            truncated = True
            break
        matches = [match for match in (group.get("matches") or []) if isinstance(match, dict)]
        remaining = max_results - included
        selected = matches[:remaining]
        if len(selected) < len(matches):
            truncated = True
        if selected:
            next_group = dict(group)
            next_group["matches"] = selected
            next_group["shownCount"] = len(selected)
            limited_groups.append(next_group)
            included += len(selected)
    return limited_groups, included, truncated


def decode_xml_text(text: str) -> str:
    return text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")\
        .replace("&quot;", '"').replace("&apos;", "'")


def encode_xml_text(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")\
        .replace('"', "&quot;").replace("'", "&apos;")


def escape_html_text(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def read_html_with_declared_charset(path: Path) -> str:
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw[3:].decode("utf-8", errors="ignore")
    if raw.startswith(b"\xff\xfe"):
        return raw.decode("utf-16le", errors="ignore")
    if raw.startswith(b"\xfe\xff"):
        return raw.decode("utf-16be", errors="ignore")

    # Primary path: files are expected in UTF-8 without BOM.
    try:
        return raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        pass

    head = raw[:4096].decode("latin-1", errors="ignore")
    meta_match = re.search(r"charset\s*=\s*['\"]?\s*([A-Za-z0-9._-]+)", head, flags=re.IGNORECASE)
    declared = (meta_match.group(1).strip().lower() if meta_match else "")
    charset_aliases = {
        "unicode": "utf-8",
        "utf8": "utf-8",
        "win-1252": "cp1252",
        "windows-1252": "cp1252",
    }
    charset = charset_aliases.get(declared, declared or "utf-8")
    try:
        return raw.decode(charset, errors="ignore")
    except LookupError:
        return raw.decode("cp1252", errors="ignore")


def ensure_run_highlight(run_xml: str, color: str = "yellow") -> str:
    highlight_tag = f'<w:highlight w:val="{color}"/>'
    if re.search(r"<w:highlight\b[^>]*/>", run_xml):
        return run_xml
    if "<w:rPr>" in run_xml:
        return run_xml.replace("<w:rPr>", f"<w:rPr>{highlight_tag}", 1)
    return re.sub(r"<w:r(\s[^>]*)?>", lambda m: f"{m.group(0)}<w:rPr>{highlight_tag}</w:rPr>", run_xml, count=1)


def should_merge_syllable_hyphen(left_fragment: str, right_fragment: str) -> bool:
    left = left_fragment.lower()
    right = right_fragment.lower()
    if left in KEEP_WORD_HYPHEN_PREFIXES:
        return False
    if len(right) <= 2:
        return False
    return True


def normalize_inline_hyphenation(text: str) -> tuple[str, int]:
    changes = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal changes
        left_fragment, right_fragment = match.group(1), match.group(2)
        if not should_merge_syllable_hyphen(left_fragment, right_fragment):
            return match.group(0)
        changes += 1
        return f"{left_fragment}{right_fragment}"

    return INLINE_HYPHENATED_WORD_RE.sub(repl, text), changes


def normalize_rule_like_paragraphs(xml_root: ET.Element) -> int:
    removed = 0
    paragraph_tag = f"{{{NS_W}}}p"
    for parent in xml_root.iter():
        for node in list(parent):
            if node.tag != paragraph_tag:
                continue
            paragraph_text = "".join((t.text or "") for t in node.findall(".//w:t", DOCX_XML_NAMESPACES)).strip()
            if paragraph_text and RULE_ONLY_TEXT_RE.fullmatch(paragraph_text):
                parent.remove(node)
                removed += 1
    return removed


def normalize_cross_run_hyphenation(xml_root: ET.Element) -> int:
    fixes = 0
    for paragraph in xml_root.findall(".//w:p", DOCX_XML_NAMESPACES):
        text_nodes = paragraph.findall(".//w:t", DOCX_XML_NAMESPACES)
        if len(text_nodes) < 2:
            continue
        for index in range(len(text_nodes) - 1):
            current_node = text_nodes[index]
            next_node = text_nodes[index + 1]
            current_text = current_node.text or ""
            next_text = next_node.text or ""
            if not current_text.endswith("-") or not next_text:
                continue
            if not next_text[0].isalpha() or not next_text[0].islower():
                continue
            left_match = TRAILING_HYPHEN_FRAGMENT_RE.search(current_text)
            right_match = LEADING_WORD_FRAGMENT_RE.match(next_text)
            if not left_match or not right_match:
                continue
            left_fragment = left_match.group(1)
            right_fragment = right_match.group(1)
            if not should_merge_syllable_hyphen(left_fragment, right_fragment):
                continue
            current_node.text = current_text[:-1]
            fixes += 1
    return fixes


def get_max_content_width_twips(document_root: ET.Element) -> int:
    section = document_root.find(".//w:body/w:sectPr", DOCX_XML_NAMESPACES)
    if section is None:
        section = document_root.find(".//w:sectPr", DOCX_XML_NAMESPACES)
    default_width_twips = 9360
    if section is None:
        return default_width_twips

    page_size = section.find("w:pgSz", DOCX_XML_NAMESPACES)
    page_margin = section.find("w:pgMar", DOCX_XML_NAMESPACES)
    page_width = int(page_size.attrib.get(f"{{{NS_W}}}w", "12240")) if page_size is not None else 12240
    margin_left = int(page_margin.attrib.get(f"{{{NS_W}}}left", "1440")) if page_margin is not None else 1440
    margin_right = int(page_margin.attrib.get(f"{{{NS_W}}}right", "1440")) if page_margin is not None else 1440
    return max(3600, page_width - margin_left - margin_right)


def parse_docx_numeric(raw_value: str | None) -> int | None:
    if raw_value is None:
        return None
    text = raw_value.strip()
    if not text:
        return None
    try:
        return int(round(float(text)))
    except ValueError:
        return None


def clamp_table_grid_columns(table_node: ET.Element, max_content_width_twips: int) -> int:
    grid = table_node.find("w:tblGrid", DOCX_XML_NAMESPACES)
    if grid is None:
        return 0
    columns = grid.findall("w:gridCol", DOCX_XML_NAMESPACES)
    if not columns:
        return 0

    parsed_widths: list[int] = []
    for col in columns:
        width = parse_docx_numeric(col.attrib.get(f"{{{NS_W}}}w"))
        parsed_widths.append(width if width is not None and width > 0 else 1)

    total_width = sum(parsed_widths)
    if total_width <= 0:
        return 0

    scale = max_content_width_twips / total_width
    updated = [max(1, int(round(width * scale))) for width in parsed_widths]
    diff = max_content_width_twips - sum(updated)
    if updated:
        updated[-1] = max(1, updated[-1] + diff)

    changes = 0
    for col, width in zip(columns, updated):
        old_raw = col.attrib.get(f"{{{NS_W}}}w")
        old_value = parse_docx_numeric(old_raw)
        if old_value != width:
            col.attrib[f"{{{NS_W}}}w"] = str(width)
            changes += 1
    return changes


def clamp_table_cell_widths(table_node: ET.Element, max_content_width_twips: int) -> int:
    cells = table_node.findall(".//w:tcPr/w:tcW", DOCX_XML_NAMESPACES)
    if not cells:
        return 0
    parsed_cells: list[tuple[ET.Element, int]] = []
    for cell in cells:
        width_type = cell.attrib.get(f"{{{NS_W}}}type", "")
        if width_type not in {"dxa", "", "nil"}:
            continue
        width_value = parse_docx_numeric(cell.attrib.get(f"{{{NS_W}}}w"))
        if width_value is None:
            continue
        parsed_cells.append((cell, max(1, width_value)))

    if not parsed_cells:
        return 0

    total_width = sum(width for _, width in parsed_cells)
    if total_width <= 0:
        return 0

    scale = max_content_width_twips / total_width
    updated = [max(1, int(round(width * scale))) for _, width in parsed_cells]
    diff = max_content_width_twips - sum(updated)
    updated[-1] = max(1, updated[-1] + diff)

    changes = 0
    for (cell, _), width in zip(parsed_cells, updated):
        old_value = parse_docx_numeric(cell.attrib.get(f"{{{NS_W}}}w"))
        if old_value != width:
            cell.attrib[f"{{{NS_W}}}w"] = str(width)
            cell.attrib[f"{{{NS_W}}}type"] = "dxa"
            changes += 1
    return changes


def force_table_width_to_page(table_node: ET.Element, max_content_width_twips: int) -> int:
    tbl_pr = table_node.find("w:tblPr", DOCX_XML_NAMESPACES)
    if tbl_pr is None:
        tbl_pr = ET.SubElement(table_node, f"{{{NS_W}}}tblPr")

    changes = 0

    tbl_width = tbl_pr.find("w:tblW", DOCX_XML_NAMESPACES)
    if tbl_width is None:
        tbl_width = ET.SubElement(tbl_pr, f"{{{NS_W}}}tblW")
    old_type = tbl_width.attrib.get(f"{{{NS_W}}}type")
    old_width = parse_docx_numeric(tbl_width.attrib.get(f"{{{NS_W}}}w"))
    if old_type != "dxa" or old_width != max_content_width_twips:
        tbl_width.attrib[f"{{{NS_W}}}type"] = "dxa"
        tbl_width.attrib[f"{{{NS_W}}}w"] = str(max_content_width_twips)
        changes += 1

    tbl_indent = tbl_pr.find("w:tblInd", DOCX_XML_NAMESPACES)
    if tbl_indent is not None:
        indent_type = tbl_indent.attrib.get(f"{{{NS_W}}}type", "dxa")
        indent_width = parse_docx_numeric(tbl_indent.attrib.get(f"{{{NS_W}}}w")) or 0
        if indent_type != "dxa" or indent_width != 0:
            tbl_indent.attrib[f"{{{NS_W}}}type"] = "dxa"
            tbl_indent.attrib[f"{{{NS_W}}}w"] = "0"
            changes += 1

    return changes


def clamp_layout_overflow(xml_root: ET.Element, max_content_width_twips: int) -> int:
    changes = 0
    max_content_width_emu = max_content_width_twips * 635

    for width_node in (
        xml_root.findall(".//w:tblW", DOCX_XML_NAMESPACES)
        + xml_root.findall(".//w:tcW", DOCX_XML_NAMESPACES)
        + xml_root.findall(".//w:tblInd", DOCX_XML_NAMESPACES)
    ):
        width_type = width_node.attrib.get(f"{{{NS_W}}}type", "")
        width_value = parse_docx_numeric(width_node.attrib.get(f"{{{NS_W}}}w"))
        if width_value is None:
            continue
        if width_type in {"dxa", "", "nil"} and width_value > max_content_width_twips:
            width_node.attrib[f"{{{NS_W}}}w"] = str(max_content_width_twips)
            width_node.attrib[f"{{{NS_W}}}type"] = "dxa"
            changes += 1
            continue
        if width_type == "pct" and width_value > 5000:
            width_node.attrib[f"{{{NS_W}}}w"] = "5000"
            changes += 1

    for extent_node in xml_root.findall(".//wp:extent", DOCX_XML_NAMESPACES) + xml_root.findall(".//a:ext", DOCX_XML_NAMESPACES):
        raw_cx = extent_node.attrib.get("cx")
        if raw_cx is None:
            continue
        try:
            cx_value = int(raw_cx)
        except ValueError:
            continue
        if cx_value > max_content_width_emu:
            extent_node.attrib["cx"] = str(max_content_width_emu)
            changes += 1

    for table_node in xml_root.findall(".//w:tbl", DOCX_XML_NAMESPACES):
        changes += force_table_width_to_page(table_node, max_content_width_twips)
        changes += clamp_table_grid_columns(table_node, max_content_width_twips)
        changes += clamp_table_cell_widths(table_node, max_content_width_twips)

    return changes


def clamp_vml_width_styles(xml_text: str, max_content_width_twips: int) -> tuple[str, int]:
    changes = 0
    max_width_points = max_content_width_twips / 20

    def replace_width(match: re.Match[str]) -> str:
        nonlocal changes
        width_points = float(match.group(2))
        if width_points <= max_width_points:
            return match.group(0)
        changes += 1
        return f"{match.group(1)}{max_width_points:.2f}{match.group(3)}"

    return VML_WIDTH_STYLE_RE.sub(replace_width, xml_text), changes


def cleanup_converted_pdf_docx(docx_path: Path) -> None:
    with zipfile.ZipFile(docx_path, "r") as zin:
        files = {name: zin.read(name) for name in zin.namelist()}

    document_xml = files.get("word/document.xml")
    if not document_xml:
        return

    document_root = ET.fromstring(document_xml)
    max_content_width_twips = get_max_content_width_twips(document_root)

    xml_parts = ["word/document.xml"]
    xml_parts.extend(name for name in files.keys() if re.fullmatch(r"word/(header|footer)\d+\.xml", name))

    for part_name in xml_parts:
        part_content = files.get(part_name)
        if not part_content:
            continue
        try:
            root = ET.fromstring(part_content)
        except ET.ParseError:
            continue

        changed = False
        for text_node in root.findall(".//w:t", DOCX_XML_NAMESPACES):
            original_text = text_node.text
            if not original_text:
                continue
            normalized_text, text_changes = normalize_inline_hyphenation(original_text)
            if text_changes:
                text_node.text = normalized_text
                changed = True

        if normalize_cross_run_hyphenation(root) > 0:
            changed = True

        if normalize_rule_like_paragraphs(root) > 0:
            changed = True

        if clamp_layout_overflow(root, max_content_width_twips) > 0:
            changed = True

        if not changed:
            continue

        serialized_xml = ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
        serialized_xml, style_changes = clamp_vml_width_styles(serialized_xml, max_content_width_twips)
        if style_changes > 0:
            changed = True
        if changed:
            files[part_name] = serialized_xml.encode("utf-8")

    with zipfile.ZipFile(docx_path, "w") as zout:
        for name, content in files.items():
            zout.writestr(name, content)


def run_pdf_to_docx(pdf_path: Path, docx_path: Path) -> None:
    py_code = "\n".join([
        "import sys",
        "from pdf2docx import Converter",
        "pdf_path = sys.argv[1]",
        "docx_path = sys.argv[2]",
        "cv = Converter(pdf_path)",
        "try:",
        "    cv.convert(docx_path)",
        "finally:",
        "    cv.close()",
    ])
    proc = subprocess.run([pdf2docx_python_cmd, "-c", py_code, str(pdf_path), str(docx_path)], capture_output=True, text=True)
    if proc.returncode != 0:
        details = proc.stderr.strip() or f"processo finalizado com codigo {proc.returncode}"
        raise RuntimeError(f"Falha na conversao PDF->DOCX: {details}")
    cleanup_converted_pdf_docx(docx_path)


def run_python_json_script(script_path: Path, args: list[str]) -> dict[str, Any]:
    proc = subprocess.run([backend_python_cmd, str(script_path), *args], capture_output=True, text=True)
    if proc.returncode != 0:
        stdout_text = (proc.stdout or "").strip()
        if stdout_text:
            try:
                parsed = json.loads(stdout_text)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass
        details = proc.stderr.strip() or stdout_text or f"processo finalizado com codigo {proc.returncode}"
        raise RuntimeError(f"Falha na execucao Python: {details}")
    return json.loads(proc.stdout)


def create_blank_docx_bytes() -> bytes:
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""
    document = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p/>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>"""
    core = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Novo Documento</dc:title>
  <dc:creator>Parapreceptor</dc:creator>
</cp:coreProperties>"""
    app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Parapreceptor</Application>
</Properties>"""

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document)
        zf.writestr("docProps/core.xml", core)
        zf.writestr("docProps/app.xml", app)
    return buffer.getvalue()


def create_docx_bytes_from_text(raw_text: str) -> bytes:
    text = (raw_text or "").replace("\r\n", "\n")
    lines = text.split("\n") if text else [""]
    paragraph_xml_parts: list[str] = []
    for line in lines:
        if line == "":
            paragraph_xml_parts.append("<w:p/>")
            continue
        encoded_line = encode_xml_text(line)
        paragraph_xml_parts.append(f"<w:p><w:r><w:t xml:space=\"preserve\">{encoded_line}</w:t></w:r></w:p>")

    paragraphs_xml = "\n    ".join(paragraph_xml_parts)
    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {paragraphs_xml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>"""

    docx_bytes = create_blank_docx_bytes()
    files: dict[str, bytes] = {}
    with zipfile.ZipFile(BytesIO(docx_bytes), "r") as zin:
        files = {name: zin.read(name) for name in zin.namelist()}
    files["word/document.xml"] = document.encode("utf-8")

    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name, content in files.items():
            zout.writestr(name, content)
    return output.getvalue()


def extract_text_from_docx(path: Path) -> str:
    import zipfile

    with zipfile.ZipFile(path, "r") as zf:
        if "word/document.xml" not in zf.namelist():
            return ""
        xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")
    text = re.sub(r"<w:tab\b[^>]*/>", "\t", xml)
    text = re.sub(r"<w:br\b[^>]*/>", "\n", text)
    text = re.sub(r"</w:p>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return decode_xml_text(text)


def highlight_term_in_docx(docx_path: Path, term: str, color: str = "yellow") -> tuple[bool, int]:
    import zipfile

    term_regex = re.compile(re.escape(term), re.IGNORECASE)
    matches = 0

    with zipfile.ZipFile(docx_path, "r") as zin:
        files = {name: zin.read(name) for name in zin.namelist()}

    xml = files["word/document.xml"].decode("utf-8", errors="ignore")

    def repl_run(m: re.Match[str]) -> str:
        nonlocal matches
        run_xml = m.group(0)
        text_nodes = re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t>", run_xml)
        run_has_match = False
        for node in text_nodes:
            found = term_regex.findall(decode_xml_text(node or ""))
            if found:
                matches += len(found)
                run_has_match = True
        return ensure_run_highlight(run_xml, color) if run_has_match else run_xml

    xml = re.sub(r"<w:r\b[\s\S]*?</w:r>", repl_run, xml)
    files["word/document.xml"] = xml.encode("utf-8")

    with zipfile.ZipFile(docx_path, "w") as zout:
        for name, content in files.items():
            zout.writestr(name, content)

    return True, matches


@app.get("/api/health")
def api_health() -> dict[str, Any]:
    return {"ok": True, "openaiConfigured": bool(get_openai_api_key())}


@app.post("/api/macros/insert-ref-book")
def api_insert_ref_book(payload: InsertRefBookRequest) -> dict[str, Any]:
    book = payload.book.strip()
    mode = (payload.mode or "bee").strip().lower()
    if not book:
        raise HTTPException(status_code=400, detail="Parametro 'book' e obrigatorio.")
    if mode not in {"bee", "simples"}:
        raise HTTPException(status_code=400, detail="Parametro 'mode' invalido. Use 'bee' ou 'simples'.")
    script_path = PYTHON_DIR / "insert_ref_book.py"
    result = run_python_json_script(script_path, [book, mode])
    if not result.get("ok"):
        message = str(result.get("error") or "Falha ao executar macro1 no Python.")
        if "Livro nao identificado" in message or "Titulo nao encontrado" in message or "Parametro" in message:
            raise HTTPException(status_code=400, detail=message)
        raise HTTPException(status_code=500, detail=message)
    return result


@app.post("/api/apps/insert-ref-verbete")
def api_insert_ref_verbete(payload: InsertRefVerbeteRequest) -> dict[str, Any]:
    titles = payload.titles.strip()
    if not titles:
        raise HTTPException(status_code=400, detail="Parametro 'titles' e obrigatorio.")
    script_path = PYTHON_DIR / "insert_ref_verbete.py"
    result = run_python_json_script(script_path, [titles])
    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result.get("error") or "Falha ao executar App2 no Python.")
    return result


@app.post("/api/apps/biblio-geral")
def api_biblio_geral(payload: BiblioGeralRequest) -> dict[str, Any]:
    author = (payload.author or "").strip()
    title = (payload.title or "").strip()
    year = (payload.year or "").strip()
    extra = (payload.extra or "").strip()
    if not any([author, title, year, extra]):
        raise HTTPException(status_code=400, detail="Informe ao menos um campo: author, title, year ou extra.")

    top_k = max(1, min(int(payload.topK or 10), 20))
    excel_path = resolve_biblio_file("Refs.xlsx")
    if not excel_path.exists():
        raise HTTPException(status_code=500, detail="Base bibliografica Refs.xlsx nao encontrada.")

    try:
        from backend.functions.biblio_matcher import search_bibliography
    except Exception:
        from functions.biblio_matcher import search_bibliography

    try:
        matches = search_bibliography(str(excel_path), author=author, title=title, year=year, extra=extra, top_k=top_k)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar Bibliografia Autores: {exc}")

    refs = [str(item.get("ref") or "").strip() for item in matches if str(item.get("ref") or "").strip()]
    markdown = "\n".join(f"**{idx}.** {ref}" for idx, ref in enumerate(refs, start=1))
    return {
        "ok": True,
        "result": {
            "query": {"author": author, "title": title, "year": year, "extra": extra},
            "matches": refs,
            "markdown": markdown,
        },
    }


@app.post("/api/apps/biblio-externa")
def api_biblio_externa(payload: BiblioExternaRequest) -> dict[str, Any]:
    require_openai_key()
    openai_api_key = get_openai_api_key()
    query = (payload.query or "").strip()
    author = (payload.author or "").strip()
    title = (payload.title or "").strip()
    year = (payload.year or "").strip()
    journal = (payload.journal or "").strip()
    publisher = (payload.publisher or "").strip()
    identifier = (payload.identifier or "").strip()
    extra = (payload.extra or "").strip()
    free_text = (payload.freeText or "").strip()

    if not query:
        parts = [
            author and f"author: {author}",
            title and f"title: {title}",
            year and f"year: {year}",
            journal and f"journal: {journal}",
            publisher and f"publisher: {publisher}",
            identifier and f"doi/isbn: {identifier}",
            extra and f"extra: {extra}",
        ]
        query = " | ".join([p for p in parts if p])

    if not query and not free_text:
        raise HTTPException(status_code=400, detail="Informe ao menos um campo de busca da bibliografia externa.")

    try:
        from backend.functions.biblio_openAI import BibliografiaService
    except Exception:
        from functions.biblio_openAI import BibliografiaService

    try:
        service = BibliografiaService(
            api_key=openai_api_key,
            llm_model=(payload.llmModel or "").strip() or None,
            llm_temperature=payload.llmTemperature,
            llm_max_output_tokens=payload.llmMaxOutputTokens,
            llm_gpt5_verbosity=(payload.llmGpt5Verbosity or "").strip() or None,
            llm_gpt5_effort=(payload.llmGpt5Effort or "").strip() or None,
            llm_system_prompt=(payload.llmSystemPrompt or "").strip() or None,
        )
        if free_text:
            result = service.identificar_por_texto_livre(free_text)
            referencia = str(result.get("referencia") or "").strip()
            if not referencia:
                referencia = "NÃO IDENTIFICADO"
            return {
                "ok": True,
                "result": {
                    "query": free_text,
                    "matches": [referencia],
                    "markdown": referencia,
                    "score": None,
                    "llmLog": result.get("llm_log") if isinstance(result, dict) else None,
                    "llmLogs": result.get("llm_logs") if isinstance(result, dict) else None,
                },
            }
        else:
            result = service.gerar_com_validacao(
                query,
                criterios={
                    "author": author,
                    "title": title,
                    "year": year,
                    "journal": journal,
                    "publisher": publisher,
                    "identifier": identifier,
                    "extra": extra,
                },
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar Bibliografia Externa: {exc}")

    referencias = result.get("matches") if isinstance(result, dict) else None
    if isinstance(referencias, list):
        matches = [str(item).strip() for item in referencias if str(item).strip()]
    else:
        matches = []
    referencia = str(result.get("referencia") or "").strip()
    score = result.get("score") if isinstance(result, dict) else None
    if not matches and referencia:
        matches = [referencia]
    markdown = "\n".join(f"**{idx}.** {ref}" for idx, ref in enumerate(matches, start=1))
    return {
        "ok": True,
        "result": {
            "query": free_text or query,
            "matches": matches,
            "markdown": markdown,
            "score": score,
            "llmLog": result.get("llm_log") if isinstance(result, dict) else None,
            "llmLogs": result.get("llm_logs") if isinstance(result, dict) else None,
        },
    }


@app.post("/api/apps/random-pensata")
def api_random_pensata() -> dict[str, Any]:
    script_path = PYTHON_DIR / "random_pensata.py"
    result = run_python_json_script(script_path, [])
    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result.get("error") or "Falha ao executar Pensata do Dia.")
    return result


@app.post("/api/apps/verbetografia/open-table")
def api_verbetografia_open_table(payload: VerbetografiaOpenTableRequest) -> dict[str, Any]:
    run_storage_gc()

    word_template_path = ROOT_DIR / "backend" / "Files" / "Verbetes" / "Tab_Verbete.docx"
    html_template_path = ROOT_DIR / "backend" / "Files" / "Verbetes" / "Html_Verbete.htm"
    if not word_template_path.exists():
        raise HTTPException(status_code=500, detail="Arquivo base Tab_Verbete.docx nao encontrado em backend/Files/Verbetes.")
    if not html_template_path.exists():
        raise HTTPException(status_code=500, detail="Arquivo base Html_Verbete.htm nao encontrado em backend/Files/Verbetes.")

    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}.htm"
    target_path = UPLOADS_DIR / stored_name
    shutil.copyfile(html_template_path, target_path)

    html_content = read_html_with_declared_charset(target_path)

    raw_title = (payload.title or "").strip() or "Título"
    raw_specialty = (payload.specialty or "").strip() or "Especialidade"
    title_html = escape_html_text(raw_title)
    specialty_html = escape_html_text(raw_specialty)
    heading_lines = (
        f'<p style="margin:0 0 8px 0 !important;text-align:center !important;font-size:20px !important;line-height:1.25 !important;font-weight:700 !important;"><span style="font-size:20px !important;">{title_html}</span></p>'
        f'<p style="margin:0 0 16px 0 !important;text-align:center !important;font-size:16px !important;line-height:1.25 !important;font-style:italic !important;"><span style="font-size:16px !important;">({specialty_html})</span></p>'
    )
    if "<body" in html_content.lower():
        html_content = re.sub(r"(<body[^>]*>)", rf"\1{heading_lines}", html_content, count=1, flags=re.IGNORECASE)
    else:
        html_content = f"{heading_lines}\n{html_content}"
    text_content = re.sub(r"<[^>]+>", " ", html_content)
    text_content = re.sub(r"\s+", " ", text_content).strip()

    metadata: dict[str, Any] = {
        "id": file_id,
        "originalName": html_template_path.name,
        "storedName": stored_name,
        "mimeType": "text/html",
        "size": target_path.stat().st_size,
        "ext": "htm",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "sourceTemplateWord": str(word_template_path),
        "sourceTemplateHtmlPage": str(html_template_path),
        # Compatibilidade retroativa.
        "sourceTemplateHtml": str(html_template_path),
        "editorHtml": html_content,
        "editorText": text_content,
        "verbetografiaTitle": raw_title,
        "verbetografiaSpecialty": raw_specialty,
    }
    write_meta(file_id, metadata)
    return metadata


@app.get("/api/apps/lexical/books")
def api_lexical_books() -> dict[str, Any]:
    try:
        from backend.functions.lexical_search_service import list_lexical_book_options
    except Exception:
        from functions.lexical_search_service import list_lexical_book_options
    return {"ok": True, "result": {"books": list_lexical_book_options()}}


@app.post("/api/apps/lexical/search")
def api_lexical_search(payload: LexicalSearchRequest) -> dict[str, Any]:
    book = (payload.book or "").strip()
    term = (payload.term or "").strip()
    if not book:
        raise HTTPException(status_code=400, detail="Parametro 'book' e obrigatorio.")
    if not term:
        raise HTTPException(status_code=400, detail="Parametro 'term' e obrigatorio.")
    limit = max(1, min(int(payload.limit or 50), 200))
    mini_text_window = max(0, min(int(payload.miniTextWindow), 20))

    try:
        from backend.functions.lexical_search_service import search_lexical_book_with_total
    except Exception:
        from functions.lexical_search_service import search_lexical_book_with_total

    try:
        total, matches = search_lexical_book_with_total(
            book=book,
            term=term,
            limit=limit,
            mini_text_window=mini_text_window,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar busca lexical: {exc}")

    return {
        "ok": True,
        "result": {
            "book": book,
            "term": term,
            "total": total,
            "matches": matches,
        },
    }


@app.post("/api/apps/lexical/overview")
def api_lexical_overview(payload: LexicalOverviewSearchRequest) -> dict[str, Any]:
    term = (payload.term or "").strip()
    if not term:
        raise HTTPException(status_code=400, detail="Parametro 'term' e obrigatorio.")
    limit = max(1, min(int(payload.limit or 50), 200))
    mini_text_window = max(0, min(int(payload.miniTextWindow), 20))

    try:
        from backend.functions.lexical_search_service import search_lexical_overview_with_total
    except Exception:
        from functions.lexical_search_service import search_lexical_overview_with_total

    _update_lexical_overview_progress(
        {
            "status": "running",
            "startedAt": _utc_iso_now(),
            "finishedAt": None,
            "term": term,
            "limit": limit,
            "totalIndexes": 0,
            "processedIndexes": 0,
            "currentIndexPosition": 0,
            "currentIndexId": "",
            "currentIndexLabel": "",
            "currentMatches": 0,
            "totalMatchesAccumulated": 0,
            "totalFound": 0,
            "groupsCount": 0,
            "topScore": None,
            "message": "Preparando Lexical Overview.",
            "error": None,
        },
        reset_events=True,
    )

    try:
        total_found, groups = search_lexical_overview_with_total(
            term=term,
            limit=limit,
            progress_callback=_update_lexical_overview_progress,
            mini_text_window=mini_text_window,
            source_ids=payload.sourceIds,
        )
        _update_lexical_overview_progress(
            {
                "status": "completed",
                "finishedAt": _utc_iso_now(),
                "processedIndexes": int(_snapshot_lexical_overview_progress().get("processedIndexes") or 0),
                "currentMatches": 0,
                "currentIndexId": "",
                "currentIndexLabel": "",
                "totalFound": total_found,
                "groupsCount": len(groups),
                "message": f"Lexical Overview concluido com {total_found} ocorrencias.",
                "event": {
                    "stage": "completed",
                    "matchesFound": total_found,
                    "totalMatchesAccumulated": total_found,
                    "note": f"{len(groups)} livros retornaram resultados no overview.",
                },
            }
        )
    except ValueError as exc:
        _update_lexical_overview_progress(
            {
                "status": "error",
                "finishedAt": _utc_iso_now(),
                "error": str(exc),
                "message": "Lexical Overview interrompido por erro de validacao.",
                "event": {
                    "stage": "error",
                    "note": str(exc),
                },
            }
        )
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        _update_lexical_overview_progress(
            {
                "status": "error",
                "finishedAt": _utc_iso_now(),
                "error": str(exc),
                "message": "Lexical Overview falhou durante o processamento.",
                "event": {
                    "stage": "error",
                    "note": str(exc),
                },
            }
        )
        raise HTTPException(status_code=500, detail=f"Falha ao executar lexical overview: {exc}")

    return {
        "ok": True,
        "result": {
            "term": term,
            "limit": limit,
            "totalBooks": int(_snapshot_lexical_overview_progress().get("totalIndexes") or len(groups)),
            "totalFound": total_found,
            "groups": groups,
        },
    }


@app.post("/api/apps/lexical/overview/export-docx")
def api_lexical_overview_export_docx(payload: LexicalOverviewSearchRequest) -> Response:
    term = (payload.term or "").strip()
    if not term:
        raise HTTPException(status_code=400, detail="Parametro 'term' e obrigatorio.")
    mini_text_window = max(0, min(int(payload.miniTextWindow), 20))

    try:
        from backend.functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_lexical_overview_docx
        from backend.functions.lexical_search_service import MAX_BOOK_SEARCH, search_lexical_overview_with_total
    except Exception:
        from functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_lexical_overview_docx
        from functions.lexical_search_service import MAX_BOOK_SEARCH, search_lexical_overview_with_total

    try:
        max_results_docx = _normalize_docx_result_limit(payload.maxResultsDocx, MAX_RESULTS_DOCX)
        total_found, groups = search_lexical_overview_with_total(
            term=term,
            limit=MAX_BOOK_SEARCH,
            progress_callback=None,
            mini_text_window=mini_text_window,
            source_ids=payload.sourceIds,
        )
        limited_groups, included_count, truncated = _limit_overview_groups_for_docx(groups, max_results_docx)
        safety_note = f"Exportacao ALL seguro: ate {MAX_BOOK_SEARCH} ocorrencias por livro e {max_results_docx} resultados totais no DOCX."
        if truncated:
            safety_note += f" O documento foi limitado aos {included_count} primeiros resultados coletados."
        document_bytes = build_lexical_overview_docx({
            "term": term,
            "totalBooks": len(limited_groups),
            "totalFound": total_found,
            "groups": limited_groups,
            "safetyNote": safety_note,
        })
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao exportar Lexical Overview em Word: {exc}")

    filename = build_docx_filename("lexical-overview", term)
    return Response(
        content=document_bytes,
        media_type=WORD_MIME_TYPE,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        },
    )


@app.post("/api/apps/lexical/overview/export-docx-from-payload")
def api_lexical_overview_export_docx_from_payload(payload: LexicalOverviewPayloadExportRequest) -> Response:
    term = (payload.term or "").strip()
    if not term:
        raise HTTPException(status_code=400, detail="Parametro 'term' e obrigatorio.")

    try:
        from backend.functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_lexical_overview_docx
    except Exception:
        from functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_lexical_overview_docx

    try:
        max_results_docx = _normalize_docx_result_limit(payload.maxResultsDocx, MAX_RESULTS_DOCX)
        limited_groups, included_count, truncated = _limit_overview_groups_for_docx(payload.groups, max_results_docx)
        safety_note = f"Exportacao do historico limitado em {max_results_docx} resultados."
        if truncated:
            safety_note += f" O documento foi limitado aos {included_count} primeiros resultados do historico."
        document_bytes = build_lexical_overview_docx({
            "term": term,
            "totalBooks": len(limited_groups),
            "totalFound": int(payload.totalFound or 0),
            "groups": limited_groups,
            "safetyNote": safety_note,
        })
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao exportar Lexical Overview em Word: {exc}")

    filename = build_docx_filename("lexical-overview", term)
    return Response(
        content=document_bytes,
        media_type=WORD_MIME_TYPE,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        },
    )


@app.post("/api/apps/lexical/citations/lookup")
def api_lexical_citations_lookup(payload: LexicalCitationLookupRequest) -> dict[str, Any]:
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Parametro 'text' e obrigatorio.")

    try:
        from backend.functions.lookup_citations_service import lookup_citations
    except Exception:
        from functions.lookup_citations_service import lookup_citations

    try:
        result = lookup_citations(
            text=text,
            paginas_antes=payload.paginasAntes,
            paginas_depois=payload.paginasDepois,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao localizar trechos: {exc}")

    return {"ok": True, "result": result}


@app.post("/api/apps/lexical/verbetes/search")
def api_lexical_verbete_search(payload: LexicalVerbeteSearchRequest) -> dict[str, Any]:
    author = (payload.author or "").strip()
    title = (payload.title or "").strip()
    area = (payload.area or "").strip()
    text = (payload.text or "").strip()
    if not author and not title and not area and not text:
        raise HTTPException(status_code=400, detail="Informe ao menos um campo de busca.")
    limit = max(1, min(int(payload.limit or 50), 200))

    try:
        from backend.functions.lexical_search_service import search_lexical_verbetes_with_total
    except Exception:
        from functions.lexical_search_service import search_lexical_verbetes_with_total

    try:
        total, matches = search_lexical_verbetes_with_total(
            author=author,
            title=title,
            area=area,
            text=text,
            limit=limit,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar busca em verbetes: {exc}")

    return {
        "ok": True,
        "result": {
            "query": {
                "author": author,
                "title": title,
                "area": area,
                "text": text,
            },
            "total": total,
            "matches": matches,
        },
    }


@app.get("/api/apps/semantic/indexes")
def api_semantic_indexes() -> dict[str, Any]:
    try:
        from backend.functions.semantic_search_service import list_semantic_indexes
    except Exception:
        from functions.semantic_search_service import list_semantic_indexes

    try:
        indexes = list_semantic_indexes()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao listar indices semanticos: {exc}")

    return {
        "ok": True,
        "result": {
            "indexes": indexes,
        },
    }


@app.post("/api/apps/semantic/search")
def api_semantic_search(payload: SemanticSearchRequest) -> dict[str, Any]:
    require_openai_key()
    index_id = (payload.indexId or "").strip()
    query = (payload.query or "").strip()
    if not index_id:
        raise HTTPException(status_code=400, detail="Parametro 'indexId' e obrigatorio.")
    if not query:
        raise HTTPException(status_code=400, detail="Parametro 'query' e obrigatorio.")
    limit = max(1, min(int(payload.limit or 10), 50))
    min_score = max(0.0, float(payload.minScore)) if payload.minScore is not None else None
    ignore_base_calibration = bool(payload.ignoreBaseCalibration or payload.minScore is not None)
    exclude_lexical_duplicates = bool(payload.excludeLexicalDuplicates)

    _update_semantic_search_progress(
        {
            "status": "running",
            "startedAt": _utc_iso_now(),
            "finishedAt": None,
            "term": query,
            "limit": limit,
            "minScore": min_score,
            "ignoreBaseCalibration": ignore_base_calibration,
            "usesCalibratedMinScores": not ignore_base_calibration,
            "excludeLexicalDuplicates": exclude_lexical_duplicates,
            "totalIndexes": 1,
            "processedIndexes": 0,
            "currentIndexPosition": 1,
            "currentIndexId": index_id,
            "currentIndexLabel": index_id.upper(),
            "currentMatches": 0,
            "totalMatchesAccumulated": 0,
            "totalFound": 0,
            "lexicalFilteredCount": 0,
            "groupsCount": 0,
            "topScore": None,
            "message": f"Processando busca semantica na base {index_id.upper()}.",
            "error": None,
            "ragContext": None,
            "event": {
                "stage": "started",
                "indexId": index_id,
                "indexLabel": index_id.upper(),
                "position": 1,
                "totalIndexes": 1,
            },
        },
        reset_events=True,
    )

    try:
        from backend.functions.semantic_search_service import search_semantic_index
    except Exception:
        from functions.semantic_search_service import search_semantic_index

    try:
        total, lexical_filtered_count, recommended_min_score, effective_min_score, rag_context, matches = search_semantic_index(
            index_id=index_id,
            query=query,
            limit=limit,
            api_key=get_openai_api_key(),
            min_score=min_score,
            exclude_lexical_duplicates=exclude_lexical_duplicates,
            use_rag_context=bool(payload.useRagContext),
            vector_store_ids=payload.vectorStoreIds,
            ignore_base_calibration=ignore_base_calibration,
            mini_text_window=max(0, min(int(payload.miniTextWindow or 0), 20)),
        )
    except FileNotFoundError as exc:
        _update_semantic_search_progress({
            "status": "error",
            "finishedAt": _utc_iso_now(),
            "error": str(exc),
            "message": "Semantic Search falhou ao carregar a base.",
            "event": {
                "stage": "error",
                "indexId": index_id,
                "indexLabel": index_id.upper(),
                "position": 1,
                "totalIndexes": 1,
                "note": str(exc),
            },
        })
        raise HTTPException(status_code=500, detail=str(exc))
    except ValueError as exc:
        _update_semantic_search_progress({
            "status": "error",
            "finishedAt": _utc_iso_now(),
            "error": str(exc),
            "message": "Semantic Search interrompido por erro de validacao.",
            "event": {
                "stage": "error",
                "indexId": index_id,
                "indexLabel": index_id.upper(),
                "position": 1,
                "totalIndexes": 1,
                "note": str(exc),
            },
        })
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        _update_semantic_search_progress({
            "status": "error",
            "finishedAt": _utc_iso_now(),
            "error": str(exc),
            "message": "Semantic Search falhou durante o processamento.",
            "event": {
                "stage": "error",
                "indexId": index_id,
                "indexLabel": index_id.upper(),
                "position": 1,
                "totalIndexes": 1,
                "note": str(exc),
            },
        })
        raise HTTPException(status_code=500, detail=f"Falha ao executar Semantic Search: {exc}")

    rag_llm_log = rag_context.get("llmLog") if isinstance(rag_context, dict) else None
    rag_context_payload = _sanitize_rag_context(rag_context)
    top_score = max((float(match.get("score") or 0.0) for match in matches), default=None)
    current_index_label = str(matches[0].get("index_label") or index_id).strip() if matches else index_id.upper()
    _update_semantic_search_progress({
        "status": "completed",
        "finishedAt": _utc_iso_now(),
        "processedIndexes": 1,
        "currentIndexPosition": 1,
        "currentIndexId": index_id,
        "currentIndexLabel": current_index_label,
        "currentMatches": total,
        "totalMatchesAccumulated": total,
        "totalFound": total,
        "lexicalFilteredCount": lexical_filtered_count,
        "topScore": top_score,
        "message": f"Semantic Search concluido com {total} resultados.",
        "ragContext": rag_context_payload,
        "event": {
            "stage": "completed",
            "indexId": index_id,
            "indexLabel": current_index_label,
            "position": 1,
            "totalIndexes": 1,
            "matchesFound": total,
            "totalMatchesAccumulated": total,
            "topScore": top_score,
            "note": f"{lexical_filtered_count} duplicados lexicos filtrados." + (f" RAG contextual aplicado via {len((rag_context_payload or {}).get('vectorStoreIds') or [])} vector store(s)." if (rag_context_payload or {}).get("usedRagContext") else ""),
        },
    })

    return {
        "ok": True,
        "result": {
            "indexId": index_id,
            "query": query,
            "total": total,
            "requestedMinScore": min_score,
            "recommendedMinScore": recommended_min_score,
            "minScore": effective_min_score,
            "ignoreBaseCalibration": ignore_base_calibration,
            "excludeLexicalDuplicates": exclude_lexical_duplicates,
            "lexicalFilteredCount": lexical_filtered_count,
            "ragContext": rag_context_payload,
            "ragLlmLog": rag_llm_log,
            "matches": matches,
        },
    }


@app.get("/api/apps/lexical/overview/progress")
def api_lexical_overview_progress() -> dict[str, Any]:
    return {
        "ok": True,
        "result": _snapshot_lexical_overview_progress(),
    }


@app.get("/api/apps/semantic/search/progress")
def api_semantic_search_progress() -> dict[str, Any]:
    return {
        "ok": True,
        "result": _snapshot_semantic_search_progress(),
    }


@app.post("/api/apps/semantic/overview")
def api_semantic_overview(payload: SemanticOverviewSearchRequest) -> dict[str, Any]:
    require_openai_key()
    term = (payload.term or "").strip()
    if not term:
        raise HTTPException(status_code=400, detail="Parametro 'term' e obrigatorio.")
    limit = max(1, min(int(payload.limit or 50), 100))
    min_score = max(0.0, float(payload.minScore)) if payload.minScore is not None else None
    exclude_lexical_duplicates = bool(payload.excludeLexicalDuplicates)

    try:
        from backend.functions.semantic_search_service import search_semantic_overview_with_total
    except Exception:
        from functions.semantic_search_service import search_semantic_overview_with_total

    _update_semantic_overview_progress(
        {
            "status": "running",
            "startedAt": _utc_iso_now(),
            "finishedAt": None,
            "term": term,
            "limit": limit,
            "minScore": min_score,
            "ignoreBaseCalibration": bool(payload.ignoreBaseCalibration or payload.minScore is not None),
            "usesCalibratedMinScores": not bool(payload.ignoreBaseCalibration or payload.minScore is not None),
            "excludeLexicalDuplicates": exclude_lexical_duplicates,
            "totalIndexes": 0,
            "processedIndexes": 0,
            "currentIndexPosition": 0,
            "currentIndexId": "",
            "currentIndexLabel": "",
            "currentMatches": 0,
            "totalMatchesAccumulated": 0,
            "totalFound": 0,
            "lexicalFilteredCount": 0,
            "groupsCount": 0,
            "topScore": None,
            "message": "Preparando Semantic Overview.",
            "error": None,
            "ragContext": None,
        },
        reset_events=True,
    )

    try:
        total_indexes, total_found, lexical_filtered_count, min_recommended_score, max_recommended_score, rag_context, groups = search_semantic_overview_with_total(
            term=term,
            limit=limit,
            api_key=get_openai_api_key(),
            progress_callback=_update_semantic_overview_progress,
            min_score=min_score,
            exclude_lexical_duplicates=exclude_lexical_duplicates,
            use_rag_context=bool(payload.useRagContext),
            vector_store_ids=payload.vectorStoreIds,
            source_ids=payload.sourceIds,
            ignore_base_calibration=bool(payload.ignoreBaseCalibration),
            mini_text_window=max(0, min(int(payload.miniTextWindow or 0), 20)),
        )
        rag_llm_log = rag_context.get("llmLog") if isinstance(rag_context, dict) else None
        rag_context_payload = _sanitize_rag_context(rag_context)
        top_score = max(
            (
                float(match.get("score") or 0.0)
                for group in groups
                for match in (group.get("matches") or [])
            ),
            default=None,
        )
        _update_semantic_overview_progress(
            {
                "status": "completed",
                "finishedAt": _utc_iso_now(),
                "processedIndexes": total_indexes,
                "currentMatches": 0,
                "currentIndexId": "",
                "currentIndexLabel": "",
                "totalFound": total_found,
                "lexicalFilteredCount": lexical_filtered_count,
                "groupsCount": len(groups),
                "topScore": top_score,
                "message": f"Semantic Overview concluido com {total_found} resultados.",
                "ragContext": rag_context_payload,
                "event": {
                    "stage": "completed",
                    "matchesFound": total_found,
                    "totalMatchesAccumulated": total_found,
                    "topScore": top_score,
                    "note": f"{len(groups)} bases entraram no top final; calibracao entre {min_recommended_score:.2f} e {max_recommended_score:.2f}; {lexical_filtered_count} duplicados lexicos filtrados." + (f" RAG contextual aplicado via {len((rag_context_payload or {}).get('vectorStoreIds') or [])} vector store(s)." if (rag_context_payload or {}).get("usedRagContext") else ""),
                },
            }
        )
    except ValueError as exc:
        _update_semantic_overview_progress(
            {
                "status": "error",
                "finishedAt": _utc_iso_now(),
                "error": str(exc),
                "message": "Semantic Overview interrompido por erro de validacao.",
                "ragContext": None,
                "event": {
                    "stage": "error",
                    "note": str(exc),
                },
            }
        )
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        _update_semantic_overview_progress(
            {
                "status": "error",
                "finishedAt": _utc_iso_now(),
                "error": str(exc),
                "message": "Semantic Overview falhou durante o processamento.",
                "ragContext": None,
                "event": {
                    "stage": "error",
                    "note": str(exc),
                },
            }
        )
        raise HTTPException(status_code=500, detail=f"Falha ao executar Semantic Overview: {exc}")

    return {
        "ok": True,
        "result": {
            "term": term,
            "limit": limit,
            "minScore": min_score,
            "recommendedMinScoreMin": min_recommended_score,
            "recommendedMinScoreMax": max_recommended_score,
            "usesCalibratedMinScores": not bool(payload.ignoreBaseCalibration or payload.minScore is not None),
            "ignoreBaseCalibration": bool(payload.ignoreBaseCalibration or payload.minScore is not None),
            "excludeLexicalDuplicates": exclude_lexical_duplicates,
            "ragContext": rag_context_payload,
            "ragLlmLog": rag_llm_log,
            "totalIndexes": total_indexes,
            "totalFound": total_found,
            "lexicalFilteredCount": lexical_filtered_count,
            "groups": groups,
        },
    }


@app.post("/api/apps/semantic/overview/export-docx")
def api_semantic_overview_export_docx(payload: SemanticOverviewSearchRequest) -> Response:
    require_openai_key()
    term = (payload.term or "").strip()
    if not term:
        raise HTTPException(status_code=400, detail="Parametro 'term' e obrigatorio.")
    min_score = max(0.0, float(payload.minScore)) if payload.minScore is not None else None
    exclude_lexical_duplicates = bool(payload.excludeLexicalDuplicates)
    ignore_base_calibration = bool(payload.ignoreBaseCalibration or payload.minScore is not None)

    try:
        from backend.functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_semantic_overview_docx
        from backend.functions.semantic_search_service import (
            SEMANTIC_OVERVIEW_EXPORT_LIMIT_PER_INDEX,
            search_semantic_overview_export_with_total,
        )
    except Exception:
        from functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_semantic_overview_docx
        from functions.semantic_search_service import (
            SEMANTIC_OVERVIEW_EXPORT_LIMIT_PER_INDEX,
            search_semantic_overview_export_with_total,
        )

    try:
        max_results_docx = _normalize_docx_result_limit(payload.maxResultsDocx, MAX_RESULTS_DOCX)
        total_indexes, total_found, lexical_filtered_count, min_recommended_score, max_recommended_score, rag_context, groups, safety = search_semantic_overview_export_with_total(
            term=term,
            api_key=get_openai_api_key(),
            min_score=min_score,
            exclude_lexical_duplicates=exclude_lexical_duplicates,
            use_rag_context=bool(payload.useRagContext),
            vector_store_ids=payload.vectorStoreIds,
            source_ids=payload.sourceIds,
            ignore_base_calibration=ignore_base_calibration,
            mini_text_window=max(0, min(int(payload.miniTextWindow or 0), 20)),
            per_index_limit=SEMANTIC_OVERVIEW_EXPORT_LIMIT_PER_INDEX,
            total_limit=max_results_docx,
        )
        effective_min_score = min_score if ignore_base_calibration and min_score is not None else min_recommended_score
        safety_note = (
            f"Exportacao ALL seguro: ate {safety.get('perIndexLimit')} resultados por base e {safety.get('totalLimit')} resultados totais."
        )
        if safety.get("truncated"):
            safety_note += f" O documento foi limitado aos {safety.get('includedCount')} resultados mais bem ranqueados."
        document_bytes = build_semantic_overview_docx({
            "term": term,
            "minScore": effective_min_score,
            "recommendedMinScoreMin": min_recommended_score,
            "recommendedMinScoreMax": max_recommended_score,
            "usesCalibratedMinScores": not ignore_base_calibration,
            "ignoreBaseCalibration": ignore_base_calibration,
            "excludeLexicalDuplicates": exclude_lexical_duplicates,
            "ragContext": _sanitize_rag_context(rag_context),
            "totalIndexes": total_indexes,
            "totalFound": total_found,
            "lexicalFilteredCount": lexical_filtered_count,
            "groups": groups,
            "safetyNote": safety_note,
        })
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao exportar Semantic Overview em Word: {exc}")

    filename = build_docx_filename("semantic-overview", term)
    return Response(
        content=document_bytes,
        media_type=WORD_MIME_TYPE,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        },
    )


@app.post("/api/apps/semantic/overview/export-docx-from-payload")
def api_semantic_overview_export_docx_from_payload(payload: SemanticOverviewPayloadExportRequest) -> Response:
    term = (payload.term or "").strip()
    if not term:
        raise HTTPException(status_code=400, detail="Parametro 'term' e obrigatorio.")

    try:
        from backend.functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_semantic_overview_docx
    except Exception:
        from functions.docx_export import MAX_RESULTS_DOCX, WORD_MIME_TYPE, build_docx_filename, build_semantic_overview_docx

    try:
        max_results_docx = _normalize_docx_result_limit(payload.maxResultsDocx, MAX_RESULTS_DOCX)
        limited_groups, included_count, truncated = _limit_overview_groups_for_docx(payload.groups, max_results_docx)
        safety_note = f"Exportacao do historico limitado em {max_results_docx} resultados."
        if truncated:
            safety_note += f" O documento foi limitado aos {included_count} resultados do historico."
        effective_min_score = (
            float(payload.minScore)
            if payload.ignoreBaseCalibration and payload.minScore is not None
            else float(payload.recommendedMinScoreMin or payload.minScore or 0)
        )
        document_bytes = build_semantic_overview_docx({
            "term": term,
            "minScore": effective_min_score,
            "recommendedMinScoreMin": payload.recommendedMinScoreMin,
            "recommendedMinScoreMax": payload.recommendedMinScoreMax,
            "usesCalibratedMinScores": payload.usesCalibratedMinScores,
            "ignoreBaseCalibration": payload.ignoreBaseCalibration,
            "excludeLexicalDuplicates": payload.excludeLexicalDuplicates,
            "ragContext": _sanitize_rag_context(payload.ragContext),
            "totalIndexes": int(payload.totalIndexes or len(limited_groups)),
            "totalFound": int(payload.totalFound or 0),
            "lexicalFilteredCount": int(payload.lexicalFilteredCount or 0),
            "groups": limited_groups,
            "safetyNote": safety_note,
        })
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao exportar Semantic Overview em Word: {exc}")

    filename = build_docx_filename("semantic-overview", term)
    return Response(
        content=document_bytes,
        media_type=WORD_MIME_TYPE,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        },
    )


@app.get("/api/apps/semantic/overview/progress")
def api_semantic_overview_progress() -> dict[str, Any]:
    return {
        "ok": True,
        "result": _snapshot_semantic_overview_progress(),
    }


@app.post("/api/apps/online-dictionary/search")
def api_online_dictionary_search(payload: OnlineDictionarySearchRequest) -> dict[str, Any]:
    term = validate_external_dictionary_term(payload.term or "", "term")

    try:
        result = search_online_dictionaries(term)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar Consulta Dict: {exc}")

    return {"ok": True, "result": result}


@app.get("/lexico")
def api_external_dictionary_lexico(palavra: str) -> dict[str, Any]:
    word = validate_external_dictionary_term(palavra)

    try:
        return run_lexical_pipeline(word)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar consulta lexical externa: {exc}")


@app.get("/analogico")
def api_external_dictionary_analogico(palavra: str) -> dict[str, Any]:
    word = validate_external_dictionary_term(palavra)

    try:
        return fetch_analogico_aulete(word)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar consulta analogica externa: {exc}")


@app.get("/etimologia")
def api_external_dictionary_etimologia(palavra: str) -> dict[str, Any]:
    word = validate_external_dictionary_term(palavra)

    try:
        return fetch_etimologia_dicionario_etimologico(word)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao executar consulta etimologica externa: {exc}")


@app.post("/api/files/upload")
async def api_files_upload(file: UploadFile = File(...)) -> dict[str, Any]:
    run_storage_gc()

    file_id = str(uuid.uuid4())
    ext = Path(file.filename or "").suffix.lower().replace(".", "")
    stored_name = f"{file_id}.{ext}" if ext else file_id
    full_path = UPLOADS_DIR / stored_name
    content = await file.read()
    full_path.write_bytes(content)

    metadata: dict[str, Any] = {"id": file_id, "originalName": file.filename, "storedName": stored_name, "mimeType": file.content_type or "application/octet-stream", "size": len(content), "ext": ext, "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())}

    if ext == "pdf":
        converted_name = f"{file_id}.docx"
        converted_path = UPLOADS_DIR / converted_name
        try:
            run_pdf_to_docx(full_path, converted_path)
            safe_unlink(full_path)
            metadata.update({"originalName": f"{Path(file.filename or 'document').stem}.docx", "storedName": converted_name, "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "size": converted_path.stat().st_size, "ext": "docx", "convertedFromPdf": True, "sourceExt": "pdf"})
        except Exception as exc:
            metadata.update({"convertedFromPdf": False, "sourceExt": "pdf", "conversionError": str(exc)})

    write_meta(file_id, metadata)
    return metadata


@app.post("/api/apps/verbetografia/open-table-word")
def api_verbetografia_open_table_word(_: VerbetografiaOpenTableRequest) -> dict[str, Any]:
    run_storage_gc()

    word_template_path = ROOT_DIR / "backend" / "Files" / "Verbetes" / "Tab_Verbete.docx"
    if not word_template_path.exists():
        raise HTTPException(status_code=500, detail="Arquivo base Tab_Verbete.docx nao encontrado em backend/Files/Verbetes.")

    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}.docx"
    target_path = UPLOADS_DIR / stored_name
    shutil.copyfile(word_template_path, target_path)

    try:
        open_file_in_local_word(target_path)
    except Exception as exc:
        safe_unlink(target_path)
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "ok": True,
        "result": {
            "id": file_id,
            "originalName": word_template_path.name,
            "storedName": stored_name,
            "path": str(target_path),
        },
    }


@app.post("/api/ai/files/upload")
async def api_ai_files_upload(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    require_openai_key()
    openai_api_key = get_openai_api_key()
    uploaded_files: list[dict[str, Any]] = []
    headers = {"Authorization": f"Bearer {openai_api_key}"}

    for upload in files:
        content = await upload.read()
        filename = Path(upload.filename or "arquivo").name or "arquivo"
        mime_type = upload.content_type or "application/octet-stream"
        upstream = requests.post(
            "https://api.openai.com/v1/files",
            headers=headers,
            data={"purpose": "user_data"},
            files={"file": (filename, content, mime_type)},
            timeout=120,
        )
        try:
            upstream.raise_for_status()
        except requests.HTTPError as exc:
            detail = (upstream.text or "").strip() or str(exc)
            raise HTTPException(status_code=upstream.status_code, detail=detail) from exc

        data = upstream.json()
        uploaded_files.append({
            "id": data.get("id"),
            "filename": data.get("filename") or filename,
            "bytes": data.get("bytes") or len(content),
            "purpose": data.get("purpose") or "user_data",
            "mimeType": mime_type,
        })

    return {"files": uploaded_files}


@app.post("/api/files/create-blank")
def api_files_create_blank(payload: CreateBlankFileRequest) -> dict[str, Any]:
    run_storage_gc()

    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}.docx"
    full_path = UPLOADS_DIR / stored_name
    docx_bytes = create_blank_docx_bytes()
    full_path.write_bytes(docx_bytes)

    title = (payload.title or "").strip() or "novo-documento.docx"
    if not title.lower().endswith(".docx"):
        title = f"{title}.docx"

    metadata: dict[str, Any] = {
        "id": file_id,
        "originalName": title,
        "storedName": stored_name,
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "size": len(docx_bytes),
        "ext": "docx",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "createdBlank": True,
    }

    write_meta(file_id, metadata)
    return metadata


@app.get("/api/files/{file_id}/content")
def api_file_content(file_id: str) -> Response:
    meta = read_meta(file_id)
    full_path = UPLOADS_DIR / meta["storedName"]
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado.")
    headers = {"Content-Disposition": f"inline; filename=\"{quote(meta.get('originalName') or '')}\""}
    ext = (meta.get("ext") or "").lower()
    saved_text = str(meta.get("editorText") or "")
    if ext == "docx" and saved_text:
        generated_docx = create_docx_bytes_from_text(saved_text)
        return Response(content=generated_docx, media_type=meta.get("mimeType") or "application/octet-stream", headers=headers)
    return Response(content=full_path.read_bytes(), media_type=meta.get("mimeType") or "application/octet-stream", headers=headers)


@app.get("/api/files/{file_id}/text")
def api_file_text(file_id: str) -> JSONResponse:
    meta = read_meta(file_id)
    full_path = UPLOADS_DIR / meta["storedName"]
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado.")
    ext = (meta.get("ext") or "").lower()

    saved_text = str(meta.get("editorText") or "")
    saved_html = str(meta.get("editorHtml") or "")
    if saved_text or saved_html:
        text = saved_text
        html = saved_html
    else:
        text = full_path.read_text(encoding="utf-8", errors="ignore") if ext in {"txt", "md"} else (extract_text_from_docx(full_path) if ext == "docx" else "")
        html = ""
    return JSONResponse(content={"id": meta["id"], "ext": meta.get("ext", ""), "text": text, "html": html, "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())}, headers={"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", "Pragma": "no-cache", "Expires": "0"})


@app.put("/api/files/{file_id}/text")
def api_file_save_text(file_id: str, payload: SaveFileTextRequest) -> dict[str, Any]:
    meta = read_meta(file_id)
    text = (payload.text or "").replace("\r\n", "\n")
    html = (payload.html or "").strip()
    meta["editorText"] = text
    meta["editorHtml"] = html
    meta["editorUpdatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    write_meta(file_id, meta)
    return {"ok": True, "id": file_id, "updatedAt": meta["editorUpdatedAt"]}


@app.post("/api/files/{file_id}/highlight")
def api_file_highlight(file_id: str, payload: HighlightRequest) -> dict[str, Any]:
    meta = read_meta(file_id)
    if (meta.get("ext") or "").lower() != "docx":
        raise HTTPException(status_code=400, detail="Highlight suportado apenas para DOCX.")
    term = payload.term.strip()
    if not term:
        raise HTTPException(status_code=400, detail="Termo obrigatorio.")
    full_path = UPLOADS_DIR / meta["storedName"]
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado.")
    updated, matches = highlight_term_in_docx(full_path, term, "yellow")
    return {"ok": True, "updated": updated, "matches": matches, "term": term, "color": "yellow"}


@app.post("/api/ai/execute")
def api_ai_execute(payload: ExecuteLLMRequest) -> dict[str, Any]:
    require_openai_key()
    openai_api_key = get_openai_api_key()
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages invalido.")
    try:
        from backend.functions.llm_gateway import execute_llm_request
    except Exception:
        from functions.llm_gateway import execute_llm_request
    try:
        result = execute_llm_request(
            api_key=openai_api_key,
            model=payload.model,
            messages=payload.messages,
            previous_response_id=payload.previousResponseId,
            system_prompt=payload.systemPrompt,
            temperature=payload.temperature,
            max_output_tokens=payload.maxOutputTokens,
            gpt5_verbosity=payload.gpt5Verbosity,
            gpt5_effort=payload.gpt5Effort,
            tools=payload.tools,
            vector_store_ids=payload.vectorStoreIds,
            input_file_ids=payload.inputFileIds,
            vector_max_results=max(1, min(int(payload.vectorMaxResults or 5), 20)),
        )
    except requests.HTTPError as exc:
        response = exc.response
        detail = ((response.text if response is not None else "") or "").strip() or str(exc)
        status_code = response.status_code if response is not None else 500
        raise HTTPException(status_code=status_code, detail=detail)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha na execucao LLM: {exc}")

    raw = result.get("raw") if isinstance(result, dict) else {}
    raw = raw if isinstance(raw, dict) else {}
    usage = raw.get("usage") if isinstance(raw.get("usage"), dict) else {}
    meta = {
        "id": raw.get("id"),
        "model": raw.get("model") or payload.model,
        "status": raw.get("status"),
        "created_at": raw.get("created_at"),
        "temperature_requested": payload.temperature,
        "max_output_tokens_requested": payload.maxOutputTokens,
        "gpt5_verbosity_requested": payload.gpt5Verbosity,
        "gpt5_effort_requested": payload.gpt5Effort,
        "usage": usage,
        "rag_references": result.get("references", []),
    }
    return {"content": result.get("content", ""), "meta": meta}


@app.get("/")
def root() -> PlainTextResponse:
    return PlainTextResponse("Parapreceptor FastAPI backend")
