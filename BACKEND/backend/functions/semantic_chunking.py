from __future__ import annotations

import re
from typing import Any

try:
    from backend.functions.source_records import strip_markdown
except Exception:
    from functions.source_records import strip_markdown


DEFAULT_CHUNK_TARGET_CHARS = 280
DEFAULT_CHUNK_MAX_CHARS = 420
DEFAULT_CHUNK_MIN_CHARS = 110
SPLIT_SENTENCE_RE = re.compile(r"(?<=[\.\!\?\:\;])\s+")
SPLIT_STRUCTURAL_RE = re.compile(r"\n{2,}|\s+\|\s+|\s+[\u2022\u00B7]\s+")


def normalize_chunk_text(text: str) -> str:
    cleaned = (text or "").replace("\u00A0", " ")
    cleaned = cleaned.replace("\r", "\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _split_long_sentence(text: str, max_chars: int) -> list[str]:
    text = text.strip()
    if len(text) <= max_chars:
        return [text] if text else []

    parts = re.split(r"(?<=[,])\s+|(?<=[)])\s+|(?<=[-])\s+", text)
    if len(parts) <= 1:
        words = text.split()
        hard_chunks: list[str] = []
        current: list[str] = []
        current_len = 0
        for word in words:
            projected = current_len + len(word) + (1 if current else 0)
            if current and projected > max_chars:
                hard_chunks.append(" ".join(current))
                current = [word]
                current_len = len(word)
            else:
                current.append(word)
                current_len = projected
        if current:
            hard_chunks.append(" ".join(current))
        return hard_chunks

    chunks: list[str] = []
    current = ""
    for part in parts:
        piece = part.strip()
        if not piece:
            continue
        candidate = f"{current} {piece}".strip() if current else piece
        if current and len(candidate) > max_chars:
            chunks.extend(_split_long_sentence(current, max_chars))
            current = piece
        else:
            current = candidate
    if current:
        chunks.extend(_split_long_sentence(current, max_chars) if len(current) > max_chars else [current])
    return chunks


def _merge_small_chunks(chunks: list[str], max_chars: int, min_chars: int) -> list[str]:
    if len(chunks) <= 1:
        return chunks

    merged: list[str] = []
    for chunk in chunks:
        text = chunk.strip()
        if not text:
            continue
        if merged and len(text) < min_chars and len(merged[-1]) + 1 + len(text) <= max_chars:
            merged[-1] = f"{merged[-1]} {text}".strip()
            continue
        merged.append(text)
    return merged


def chunk_semantic_text(
    text: str,
    *,
    target_chars: int = DEFAULT_CHUNK_TARGET_CHARS,
    max_chars: int = DEFAULT_CHUNK_MAX_CHARS,
    min_chars: int = DEFAULT_CHUNK_MIN_CHARS,
) -> list[str]:
    normalized = normalize_chunk_text(text)
    if not normalized:
        return []
    if len(normalized) <= max_chars:
        return [normalized]

    structural_parts = [part.strip() for part in SPLIT_STRUCTURAL_RE.split(normalized) if part and part.strip()]
    if not structural_parts:
        structural_parts = [normalized]

    chunks: list[str] = []
    for part in structural_parts:
        if len(part) <= max_chars:
            chunks.append(part)
            continue

        sentences = [item.strip() for item in SPLIT_SENTENCE_RE.split(part) if item and item.strip()]
        if not sentences:
            chunks.extend(_split_long_sentence(part, max_chars))
            continue

        current = ""
        for sentence in sentences:
            if len(sentence) > max_chars:
                if current:
                    chunks.append(current.strip())
                    current = ""
                chunks.extend(_split_long_sentence(sentence, max_chars))
                continue

            candidate = f"{current} {sentence}".strip() if current else sentence
            if current and len(candidate) > target_chars:
                chunks.append(current.strip())
                current = sentence
            else:
                current = candidate

        if current:
            chunks.append(current.strip())

    cleaned_chunks = [chunk.strip() for chunk in chunks if chunk and chunk.strip()]
    return _merge_small_chunks(cleaned_chunks, max_chars=max_chars, min_chars=min_chars)


def build_embedding_text(index_label: str, chunk_text: str, metadata: dict[str, Any] | None = None) -> str:
    metadata = metadata if isinstance(metadata, dict) else {}
    prefix_parts = [str(index_label or "").strip()]
    for key in ("title", "theme", "area", "author", "number"):
        value = str(metadata.get(key) or "").strip()
        if value:
            prefix_parts.append(value)
    prefix = " | ".join(part for part in prefix_parts if part)
    return f"{prefix} | {chunk_text}".strip(" |")


def rechunk_semantic_rows(
    rows: list[dict[str, Any]],
    *,
    index_label: str,
    target_chars: int = DEFAULT_CHUNK_TARGET_CHARS,
    max_chars: int = DEFAULT_CHUNK_MAX_CHARS,
    min_chars: int = DEFAULT_CHUNK_MIN_CHARS,
) -> list[dict[str, Any]]:
    rebuilt: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue

        original_text = strip_markdown(str(row.get("text") or ""))
        if not original_text:
            continue

        metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
        chunks = chunk_semantic_text(
            original_text,
            target_chars=target_chars,
            max_chars=max_chars,
            min_chars=min_chars,
        )
        chunk_total = len(chunks) or 1

        if chunk_total == 1:
            rebuilt.append({
                "row": int(row.get("row") or 0),
                "text": str(row.get("text") or original_text).strip(),
                "metadata": metadata,
                "embedding_text": build_embedding_text(index_label, original_text, metadata),
            })
            continue

        for chunk_index, chunk_text in enumerate(chunks, start=1):
            chunk_metadata = dict(metadata)
            chunk_metadata["source_row"] = int(row.get("row") or 0)
            chunk_metadata["chunk_index"] = chunk_index
            chunk_metadata["chunk_total"] = chunk_total
            rebuilt.append({
                "row": int(row.get("row") or 0),
                "text": chunk_text,
                "metadata": chunk_metadata,
                "embedding_text": build_embedding_text(index_label, chunk_text, chunk_metadata),
            })

    return rebuilt
