from __future__ import annotations

import json
import gc
import re
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np
import requests

try:
    from backend.functions.semantic_index_calibration import DEFAULT_MIN_SCORE
    from backend.functions.lexical_search_service import JANELA_TEXTO_MINI, _mini_arlindo_windowed_text
    from backend.functions.semantic_query_context_service import resolve_semantic_query_context
    from backend.functions.semantic_query_expansion import build_semantic_query_variants
    from backend.functions.source_records import clear_source_document_cache, load_source_document, source_path_for, strip_markdown
except Exception:
    from functions.semantic_index_calibration import DEFAULT_MIN_SCORE
    from functions.lexical_search_service import JANELA_TEXTO_MINI, _mini_arlindo_windowed_text
    from functions.semantic_query_context_service import resolve_semantic_query_context
    from functions.semantic_query_expansion import build_semantic_query_variants
    from functions.source_records import clear_source_document_cache, load_source_document, source_path_for, strip_markdown


SEMANTIC_DIR = Path(__file__).resolve().parents[1] / "Files" / "Semantic"
EMBEDDINGS_API_URL = "https://api.openai.com/v1/embeddings"
_EMBEDDINGS_SESSION = requests.Session()
_SEMANTIC_INDEX_CACHE: dict[str, dict[str, Any]] = {}
_SEMANTIC_INDEX_CACHE_LOCK = Lock()
RERANK_CANDIDATE_MULTIPLIER = 4
RERANK_CANDIDATE_CAP = 40
SEMANTIC_OVERVIEW_EXPORT_LIMIT_PER_INDEX = 200
SEMANTIC_OVERVIEW_EXPORT_TOTAL_LIMIT = 200
RERANK_SEMANTIC_WEIGHT = 0.82
RERANK_ALIGNMENT_WEIGHT = 0.18
RERANK_QUERY_STOPWORDS = frozenset({
    "a",
    "ao",
    "aos",
    "as",
    "com",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "na",
    "nas",
    "no",
    "nos",
    "o",
    "os",
    "para",
    "por",
    "sem",
    "um",
    "uma",
    "uns",
    "umas",
})


def _normalize_index_id(value: str) -> str:
    return (value or "").strip().lower()


def _index_dir(index_id: str) -> Path:
    path = SEMANTIC_DIR / _normalize_index_id(index_id)
    if not path.exists():
        raise FileNotFoundError(f"Indice semantico nao encontrado: {index_id}")
    return path


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _resolve_recommended_min_score(manifest: dict[str, Any] | None, index_id: str) -> float:
    manifest_min_score = None if not isinstance(manifest, dict) else manifest.get("recommended_min_score")
    try:
        if manifest_min_score is not None:
            return max(0.0, min(1.0, float(manifest_min_score)))
    except (TypeError, ValueError):
        pass

    return float(DEFAULT_MIN_SCORE)


def _file_signature(path: Path) -> tuple[int, int]:
    stat = path.stat()
    return stat.st_mtime_ns, stat.st_size


def _normalize_match_text(text: str) -> str:
    try:
        from backend.functions.lexical_search_service import _normalize_for_match, _sanitize_search_text, _strip_markdown_simple
    except Exception:
        from functions.lexical_search_service import _normalize_for_match, _sanitize_search_text, _strip_markdown_simple

    return _normalize_for_match(_strip_markdown_simple(_sanitize_search_text(text or "")))


def _build_lexical_duplicate_filter(raw_query: str) -> Any | None:
    sanitized_query = (raw_query or "").strip()
    if not sanitized_query:
        return None

    try:
        from backend.functions.lexical_search_service import _compile_boolean_predicate, _compile_prefilter
    except Exception:
        from functions.lexical_search_service import _compile_boolean_predicate, _compile_prefilter

    predicate = _compile_boolean_predicate(sanitized_query)
    prefilter = _compile_prefilter(sanitized_query)

    def _is_duplicate(normalized_text: str) -> bool:
        if not normalized_text:
            return False
        if prefilter is not None and not prefilter(normalized_text):
            return False
        return predicate(normalized_text)

    return _is_duplicate


def _row_search_text(row: Any) -> str:
    if not isinstance(row, dict):
        return ""
    return _normalize_match_text(strip_markdown(str(row.get("text") or "")))


def _record_row_number(record: Any) -> int | None:
    if not isinstance(record, dict):
        return None
    try:
        row_number = int(record.get("row") or 0)
    except Exception:
        return None
    return row_number if row_number > 0 else None


def _build_source_records_by_row(source_doc: dict[str, Any]) -> dict[int, dict[str, Any]]:
    records_by_row: dict[int, dict[str, Any]] = {}
    for record in source_doc.get("records") or []:
        row_number = _record_row_number(record)
        if row_number is not None:
            records_by_row[row_number] = record
    return records_by_row


def _loaded_source_records_by_row(loaded: dict[str, Any]) -> dict[int, dict[str, Any]]:
    source_records_by_row = loaded.get("source_records_by_row")
    return source_records_by_row if isinstance(source_records_by_row, dict) else {}


def _semantic_row_source_number(row: dict[str, Any], metadata: dict[str, Any]) -> int | None:
    for value in (metadata.get("source_row"), row.get("source_row"), row.get("row")):
        try:
            row_number = int(value or 0)
        except Exception:
            continue
        if row_number > 0:
            return row_number
    return None


def _format_semantic_match_text(
    row: dict[str, Any],
    metadata: dict[str, Any],
    source_records_by_row: dict[int, dict[str, Any]],
    query: str,
    mini_text_window: int,
) -> str:
    fallback_text = str(row.get("text") or "").strip()
    date = str(metadata.get("date") or row.get("date") or "").strip()
    if not date:
        return fallback_text

    source_row = _semantic_row_source_number(row, metadata)
    source_record = source_records_by_row.get(source_row or -1)
    source_data = source_record.get("data") if isinstance(source_record, dict) and isinstance(source_record.get("data"), dict) else {}
    source_text = str(
        source_data.get("text")
        or (source_record.get("text") if isinstance(source_record, dict) else "")
        or fallback_text
    ).strip()
    return _mini_arlindo_windowed_text(source_text, query, date, window=mini_text_window)


def _extract_rerank_terms(raw_query: str) -> tuple[str, tuple[str, ...]]:
    normalized_query = _normalize_match_text(raw_query)
    if not normalized_query:
        return "", ()

    query_terms = tuple(dict.fromkeys(
        token
        for token in re.findall(r"\w+", normalized_query)
        if len(token) >= 2 and token not in RERANK_QUERY_STOPWORDS
    ))
    return normalized_query, query_terms


def _collect_metadata_text(value: Any, collector: list[str], depth: int = 0) -> None:
    if value is None or depth > 2 or len(collector) >= 16:
        return

    if isinstance(value, dict):
        for nested in value.values():
            _collect_metadata_text(nested, collector, depth + 1)
        return

    if isinstance(value, (list, tuple, set)):
        for nested in value:
            _collect_metadata_text(nested, collector, depth + 1)
        return

    text = _normalize_match_text(str(value))
    if text:
        collector.append(text)


def _metadata_search_text(metadata: Any) -> str:
    collector: list[str] = []
    _collect_metadata_text(metadata, collector)
    return " ".join(collector[:16]).strip()


def _term_coverage_ratio(query_terms: tuple[str, ...], normalized_text: str) -> float:
    if not query_terms or not normalized_text:
        return 0.0

    text_tokens = set(re.findall(r"\w+", normalized_text))
    if not text_tokens:
        return 0.0

    hits = sum(1 for term in query_terms if term in text_tokens)
    return hits / len(query_terms)


def _ordered_term_ratio(query_terms: tuple[str, ...], normalized_text: str) -> float:
    if not query_terms or not normalized_text:
        return 0.0

    hits = 0
    position = 0
    for term in query_terms:
        found_at = normalized_text.find(term, position)
        if found_at < 0:
            continue
        hits += 1
        position = found_at + len(term)

    return hits / len(query_terms)


def _phrase_hit(normalized_query: str, normalized_text: str) -> float:
    if not normalized_query or not normalized_text:
        return 0.0
    return 1.0 if normalized_query in normalized_text else 0.0


def _alignment_score(normalized_query: str, query_terms: tuple[str, ...], search_text: str, metadata: Any) -> float:
    if not normalized_query and not query_terms:
        return 0.0

    metadata_text = _metadata_search_text(metadata)
    text_coverage = _term_coverage_ratio(query_terms, search_text)
    text_order = _ordered_term_ratio(query_terms, search_text)
    text_phrase = _phrase_hit(normalized_query, search_text)
    metadata_coverage = _term_coverage_ratio(query_terms, metadata_text)
    metadata_phrase = _phrase_hit(normalized_query, metadata_text)

    return min(
        1.0,
        (0.44 * text_coverage)
        + (0.18 * text_order)
        + (0.24 * text_phrase)
        + (0.10 * metadata_coverage)
        + (0.04 * metadata_phrase),
    )


def _load_semantic_index(index_id: str, *, use_cache: bool = True) -> dict[str, Any]:
    base_dir = _index_dir(index_id)
    manifest_path = base_dir / "manifest.json"
    chunks_path = base_dir / "chunks.json"
    embeddings_path = base_dir / "embeddings.npy"
    source_path = source_path_for(index_id)

    if not manifest_path.exists() or not chunks_path.exists() or not embeddings_path.exists() or not source_path.exists():
        raise FileNotFoundError(f"Arquivos do indice semantico incompletos: {base_dir}")

    signature = {
        "manifest": _file_signature(manifest_path),
        "chunks": _file_signature(chunks_path),
        "embeddings": _file_signature(embeddings_path),
        "source": _file_signature(source_path),
    }
    normalized_index_id = _normalize_index_id(index_id)

    if use_cache:
        with _SEMANTIC_INDEX_CACHE_LOCK:
            cached = _SEMANTIC_INDEX_CACHE.get(normalized_index_id)
            if cached and cached.get("signature") == signature:
                return cached["payload"]

    manifest = _load_json(manifest_path)
    metadata = _load_json(chunks_path)
    embeddings = np.load(embeddings_path, mmap_mode="r")
    source_doc = load_source_document(normalized_index_id, use_cache=use_cache)
    source_records_by_row = _build_source_records_by_row(source_doc)

    if not isinstance(metadata, list):
        raise ValueError(f"Registros semanticos invalidos para o indice {index_id}")
    if len(metadata) != int(getattr(embeddings, "shape", [0])[0]):
        raise ValueError(f"Quantidade de embeddings inconsistente no indice {index_id}")

    payload = {
        "manifest": manifest,
        "metadata": metadata,
        "embeddings": embeddings,
        "source_records_by_row": source_records_by_row,
        "search_texts": tuple(_row_search_text(row) for row in metadata),
        "recommended_min_score": _resolve_recommended_min_score(manifest, normalized_index_id),
    }

    if use_cache:
        with _SEMANTIC_INDEX_CACHE_LOCK:
            _SEMANTIC_INDEX_CACHE[normalized_index_id] = {
                "signature": signature,
                "payload": payload,
            }

    return payload


def list_semantic_indexes() -> list[dict[str, Any]]:
    if not SEMANTIC_DIR.exists():
        return []

    indexes: list[dict[str, Any]] = []
    for item in sorted(SEMANTIC_DIR.iterdir(), key=lambda path: path.name.lower()):
        if not item.is_dir():
            continue
        manifest_path = item / "manifest.json"
        if not manifest_path.exists():
            continue
        try:
            source_path_for(item.name)
        except FileNotFoundError:
            continue
        manifest = _load_json(manifest_path)
        indexes.append({
            "id": item.name,
            "label": str(manifest.get("index_label") or item.name).strip(),
            "sourceFile": str(manifest.get("source_file") or "").strip(),
            "sourceRows": int(manifest.get("source_rows") or 0),
            "model": str(manifest.get("model") or "").strip(),
            "dimensions": int(manifest.get("dimensions") or 0),
            "embeddingDtype": str(manifest.get("embedding_dtype") or "").strip(),
            "suggestedMinScore": _resolve_recommended_min_score(manifest, item.name),
        })
    return indexes


def _filter_semantic_indexes_by_ids(indexes: list[dict[str, Any]], source_ids: list[str] | None) -> list[dict[str, Any]]:
    normalized_ids = {_normalize_index_id(str(value or "")) for value in (source_ids or []) if str(value or "").strip()}
    if not normalized_ids:
        return indexes
    return [
        index
        for index in indexes
        if _normalize_index_id(str(index.get("id") or "")) in normalized_ids
    ]


def _build_contextual_query_variants(raw_query: str, semantic_context: dict[str, Any] | None) -> list[tuple[str, float]]:
    variants = build_semantic_query_variants(raw_query)
    if not semantic_context:
        return variants

    contextual_variants = list(variants)
    disambiguated_query = str(semantic_context.get("disambiguatedQuery") or "").strip()
    related_terms = [str(item or "").strip() for item in (semantic_context.get("relatedTerms") or []) if str(item or "").strip()]
    definitions = [
        f"{str(item.get('term') or '').strip()}: {str(item.get('meaning') or '').strip()}"
        for item in (semantic_context.get("definitions") or [])
        if isinstance(item, dict) and str(item.get("term") or "").strip() and str(item.get("meaning") or "").strip()
    ]

    if disambiguated_query:
        contextual_variants.append((disambiguated_query, 0.90))
    if related_terms:
        contextual_variants.append((", ".join(related_terms[:8]), 0.72))
    if definitions:
        contextual_variants.append((" | ".join(definitions[:4]), 0.64))

    deduped: list[tuple[str, float]] = []
    seen: set[str] = set()
    for text, weight in contextual_variants:
        normalized_text = _normalize_match_text(text)
        if not normalized_text or normalized_text in seen:
            continue
        seen.add(normalized_text)
        deduped.append((text.strip(), float(weight)))
    return deduped[:6]


def _get_semantic_query_vector(
    raw_query: str,
    *,
    api_key: str,
    model: str,
    cache: dict[str, np.ndarray] | None = None,
    semantic_context: dict[str, Any] | None = None,
) -> np.ndarray:
    model_name = (model or "").strip() or "text-embedding-3-small"
    query_variants = _build_contextual_query_variants(raw_query, semantic_context)
    cache_key = model_name if not query_variants else f"{model_name}::{'||'.join(text for text, _ in query_variants)}"
    if cache is not None and cache_key in cache:
        return cache[cache_key]

    inputs = [text for text, _ in query_variants] or [raw_query]

    response = _EMBEDDINGS_SESSION.post(
        EMBEDDINGS_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model_name,
            "input": inputs,
        },
        timeout=60,
    )
    if not response.ok:
        raise RuntimeError(f"Falha ao gerar embedding da query: HTTP {response.status_code} {response.text}")

    payload = response.json()
    data = payload.get("data") or []
    if not data:
        raise RuntimeError("Resposta de embeddings vazia.")

    vectors = np.asarray([item.get("embedding") or [] for item in data], dtype=np.float32)
    if vectors.ndim == 1:
        vectors = vectors.reshape(1, -1)
    if vectors.shape[0] != len(inputs):
        raise RuntimeError("Quantidade de embeddings retornada difere da quantidade de queries enviadas.")

    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.where(norms > 0, norms, 1.0)
    normalized_vectors = vectors / norms
    weights = np.asarray([weight for _, weight in query_variants], dtype=np.float32) if query_variants else np.ones((normalized_vectors.shape[0],), dtype=np.float32)
    weighted_vector = np.average(normalized_vectors, axis=0, weights=weights)
    vector = np.asarray(weighted_vector, dtype=np.float32)
    final_norm = np.linalg.norm(vector)
    if final_norm > 0:
        vector = vector / final_norm

    if cache is not None:
        cache[cache_key] = vector
    return vector


def _score_matches(
    metadata: list[dict[str, Any]],
    embeddings: np.ndarray,
    source_records_by_row: dict[int, dict[str, Any]],
    search_texts: tuple[str, ...],
    query_vector: np.ndarray,
    index_id: str,
    index_label: str,
    limit: int,
    min_score: float,
    exclude_lexical_duplicates: bool,
    lexical_query: str,
    mini_text_window: int = JANELA_TEXTO_MINI,
) -> dict[str, Any]:
    if embeddings.ndim != 2:
        raise ValueError(f"Embeddings invalidos no indice {index_id}")

    scores = embeddings @ query_vector
    if scores.ndim != 1:
        scores = np.asarray(scores).reshape(-1)

    eligible_mask = np.isfinite(scores)
    if min_score > 0:
        eligible_mask &= scores >= np.float32(min_score)

    lexical_filtered_count = 0
    lexical_filter = _build_lexical_duplicate_filter(lexical_query) if exclude_lexical_duplicates else None
    if lexical_filter is not None:
        lexical_mask = np.fromiter(
            (lexical_filter(search_text) for search_text in search_texts),
            dtype=np.bool_,
            count=len(search_texts),
        )
        lexical_filtered_count = int(np.count_nonzero(eligible_mask & lexical_mask))
        eligible_mask &= ~lexical_mask

    eligible_positions = np.flatnonzero(eligible_mask)
    total_found = int(eligible_positions.size)
    if total_found <= 0:
        return {
            "total_found": 0,
            "lexical_filtered_count": lexical_filtered_count,
            "matches": [],
        }

    top_count = min(max(1, int(limit or 1)), total_found)
    candidate_count = min(
        total_found,
        max(
            top_count,
            min(RERANK_CANDIDATE_CAP, max(top_count, top_count * RERANK_CANDIDATE_MULTIPLIER)),
        ),
    )
    eligible_scores = scores[eligible_positions]
    if candidate_count >= total_found:
        ranked_positions = eligible_positions[np.argsort(eligible_scores)[::-1]]
    else:
        top_local_positions = np.argpartition(eligible_scores, -candidate_count)[-candidate_count:]
        ranked_positions = eligible_positions[top_local_positions[np.argsort(eligible_scores[top_local_positions])[::-1]]]

    normalized_query, query_terms = _extract_rerank_terms(lexical_query)
    matches: list[dict[str, Any]] = []
    for position in ranked_positions:
        row = metadata[int(position)]
        semantic_score = float(scores[int(position)])
        match_metadata = row.get("metadata") if isinstance(row, dict) else {}
        alignment_score = _alignment_score(
            normalized_query,
            query_terms,
            search_texts[int(position)],
            match_metadata,
        )
        final_score = min(
            1.0,
            (RERANK_SEMANTIC_WEIGHT * semantic_score) + (RERANK_ALIGNMENT_WEIGHT * alignment_score),
        )
        display_text = _format_semantic_match_text(
            row,
            match_metadata if isinstance(match_metadata, dict) else {},
            source_records_by_row,
            lexical_query,
            mini_text_window,
        )
        matches.append({
            "book": str(row.get("book") or index_id).strip().upper(),
            "index_id": index_id,
            "index_label": index_label,
            "row": int(row.get("row") or 0),
            "text": display_text,
            "metadata": match_metadata if isinstance(match_metadata, dict) else {},
            "score": final_score,
            "semantic_score": semantic_score,
            "alignment_score": alignment_score,
        })

    matches.sort(
        key=lambda item: (
            float(item.get("score") or 0.0),
            float(item.get("semantic_score") or 0.0),
            -int(item.get("row") or 0),
        ),
        reverse=True,
    )
    return {
        "total_found": total_found,
        "lexical_filtered_count": lexical_filtered_count,
        "matches": matches[:top_count],
    }


def search_semantic_index(
    index_id: str,
    query: str,
    limit: int,
    api_key: str,
    min_score: float | None = None,
    exclude_lexical_duplicates: bool = True,
    use_rag_context: bool = False,
    vector_store_ids: list[str] | None = None,
    ignore_base_calibration: bool = False,
    mini_text_window: int = JANELA_TEXTO_MINI,
) -> tuple[int, int, float, float, dict[str, Any], list[dict[str, Any]]]:
    normalized_index_id = _normalize_index_id(index_id)
    loaded = _load_semantic_index(normalized_index_id)
    manifest = loaded["manifest"]
    model = str(manifest.get("model") or "").strip()
    index_label = str(manifest.get("index_label") or normalized_index_id).strip()
    rag_context = {
        "usedRagContext": False,
        "sourceQuery": query,
        "vectorStoreIds": [value for value in (vector_store_ids or []) if str(value or "").strip()],
        "keyTerms": [],
        "definitions": [],
        "relatedTerms": [],
        "disambiguatedQuery": "",
        "references": [],
    }
    if use_rag_context:
        try:
            rag_context = resolve_semantic_query_context(
                query,
                api_key=api_key,
                vector_store_ids=vector_store_ids,
            )
        except Exception as exc:
            rag_context["error"] = str(exc)
    query_vector = _get_semantic_query_vector(
        query,
        api_key=api_key,
        model=model,
        semantic_context=rag_context if rag_context.get("usedRagContext") else None,
    )
    requested_min_score = None if min_score is None else max(0.0, float(min_score))
    recommended_min_score = float(loaded.get("recommended_min_score") or DEFAULT_MIN_SCORE)
    should_ignore_base_calibration = ignore_base_calibration or (requested_min_score is not None and requested_min_score > 0)
    effective_min_score = requested_min_score if should_ignore_base_calibration and requested_min_score is not None else recommended_min_score
    ranked = _score_matches(
        loaded["metadata"],
        loaded["embeddings"],
        _loaded_source_records_by_row(loaded),
        loaded["search_texts"],
        query_vector,
        normalized_index_id,
        index_label,
        limit=limit,
        min_score=effective_min_score,
        exclude_lexical_duplicates=exclude_lexical_duplicates,
        lexical_query=query,
        mini_text_window=mini_text_window,
    )
    return (
        ranked["total_found"],
        ranked["lexical_filtered_count"],
        recommended_min_score,
        effective_min_score,
        rag_context,
        ranked["matches"],
    )


def search_semantic_overview_with_total(
    term: str,
    limit: int,
    api_key: str,
    progress_callback: Any | None = None,
    min_score: float | None = None,
    exclude_lexical_duplicates: bool = True,
    use_rag_context: bool = False,
    vector_store_ids: list[str] | None = None,
    source_ids: list[str] | None = None,
    ignore_base_calibration: bool = False,
    mini_text_window: int = JANELA_TEXTO_MINI,
) -> tuple[int, int, int, float, float, dict[str, Any], list[dict[str, Any]]]:
    indexes = _filter_semantic_indexes_by_ids(list_semantic_indexes(), source_ids)
    if not indexes:
        return 0, 0, 0, DEFAULT_MIN_SCORE, DEFAULT_MIN_SCORE, {
            "usedRagContext": False,
            "sourceQuery": term,
            "vectorStoreIds": [value for value in (vector_store_ids or []) if str(value or "").strip()],
            "keyTerms": [],
            "definitions": [],
            "relatedTerms": [],
            "disambiguatedQuery": "",
            "references": [],
        }, []

    query_cache: dict[str, np.ndarray] = {}
    collected: list[dict[str, Any]] = []
    total_found = 0
    total_lexical_filtered = 0
    total_indexes = len(indexes)
    group_totals: dict[str, int] = {}
    min_recommended_used: float | None = None
    max_recommended_used: float | None = None
    rag_context = {
        "usedRagContext": False,
        "sourceQuery": term,
        "vectorStoreIds": [value for value in (vector_store_ids or []) if str(value or "").strip()],
        "keyTerms": [],
        "definitions": [],
        "relatedTerms": [],
        "disambiguatedQuery": "",
        "references": [],
    }
    clear_source_document_cache()
    with _SEMANTIC_INDEX_CACHE_LOCK:
        _SEMANTIC_INDEX_CACHE.clear()
    if use_rag_context:
        try:
            rag_context = resolve_semantic_query_context(
                term,
                api_key=api_key,
                vector_store_ids=vector_store_ids,
            )
        except Exception as exc:
            rag_context["error"] = str(exc)

    for position, index_meta in enumerate(indexes, start=1):
        index_id = _normalize_index_id(str(index_meta.get("id") or ""))
        index_label = str(index_meta.get("label") or index_id).strip()
        loaded: dict[str, Any] | None = None
        ranked: dict[str, Any] | None = None
        query_vector: np.ndarray | None = None
        try:
            if progress_callback:
                progress_callback({
                    "currentIndexPosition": position,
                    "totalIndexes": total_indexes,
                    "currentIndexId": index_id,
                    "currentIndexLabel": index_label,
                    "message": f"Processando base {index_label}.",
                    "event": {
                        "stage": "index_started",
                        "indexId": index_id,
                        "indexLabel": index_label,
                        "position": position,
                        "totalIndexes": total_indexes,
                    },
                })

            loaded = _load_semantic_index(index_id, use_cache=False)
            manifest = loaded["manifest"]
            recommended_min_score = float(loaded.get("recommended_min_score") or DEFAULT_MIN_SCORE)
            min_recommended_used = recommended_min_score if min_recommended_used is None else min(min_recommended_used, recommended_min_score)
            max_recommended_used = recommended_min_score if max_recommended_used is None else max(max_recommended_used, recommended_min_score)
            query_vector_params = {
                "api_key": api_key,
                "model": str(manifest.get("model") or "").strip(),
                "cache": query_cache,
            }
            if rag_context.get("usedRagContext"):
                query_vector_params["semantic_context"] = rag_context
            query_vector = _get_semantic_query_vector(term, **query_vector_params)
            requested_min_score = None if min_score is None else max(0.0, float(min_score))
            should_ignore_base_calibration = ignore_base_calibration or (requested_min_score is not None and requested_min_score > 0)
            ranked = _score_matches(
                loaded["metadata"],
                loaded["embeddings"],
                _loaded_source_records_by_row(loaded),
                loaded["search_texts"],
                query_vector,
                index_id,
                index_label,
                limit=limit,
                min_score=requested_min_score if should_ignore_base_calibration and requested_min_score is not None else recommended_min_score,
                exclude_lexical_duplicates=exclude_lexical_duplicates,
                lexical_query=term,
                mini_text_window=mini_text_window,
            )
            index_total_found = int(ranked["total_found"])
            index_lexical_filtered = int(ranked["lexical_filtered_count"])
            top_matches = ranked["matches"]
            total_found += index_total_found
            total_lexical_filtered += index_lexical_filtered
            group_totals[index_id] = index_total_found
            collected.extend(top_matches)
            collected.sort(key=lambda item: item["score"], reverse=True)
            collected = collected[:limit]

            if progress_callback:
                progress_callback({
                    "processedIndexes": position,
                    "currentMatches": index_total_found,
                    "totalMatchesAccumulated": total_found,
                    "topScore": collected[0]["score"] if collected else None,
                    "message": f"Processando base {index_label}.",
                    "event": {
                        "stage": "index_completed" if index_total_found > 0 else "index_skipped",
                        "indexId": index_id,
                        "indexLabel": index_label,
                        "position": position,
                        "totalIndexes": total_indexes,
                        "matchesFound": index_total_found,
                        "totalMatchesAccumulated": total_found,
                        "topScore": collected[0]["score"] if collected else None,
                        "note": f"{index_lexical_filtered} duplicados lexicos filtrados." if index_lexical_filtered > 0 else None,
                    },
                })
        except Exception as exc:
            if progress_callback:
                progress_callback({
                    "processedIndexes": position,
                    "message": f"Falha ao processar base {index_label}.",
                    "event": {
                        "stage": "error",
                        "indexId": index_id,
                        "indexLabel": index_label,
                        "position": position,
                        "totalIndexes": total_indexes,
                        "note": str(exc),
                    },
                })
            continue
        finally:
            loaded = None
            ranked = None
            query_vector = None
            gc.collect()

    if not collected:
        return (
            total_indexes,
            total_found,
            total_lexical_filtered,
            float(min_recommended_used if min_recommended_used is not None else DEFAULT_MIN_SCORE),
            float(max_recommended_used if max_recommended_used is not None else DEFAULT_MIN_SCORE),
            rag_context,
            [],
        )

    grouped: dict[str, dict[str, Any]] = {}
    for match in collected:
        group = grouped.setdefault(match["index_id"], {
            "indexId": match["index_id"],
            "indexLabel": match["index_label"],
            "totalFound": 0,
            "shownCount": 0,
            "matches": [],
        })
        group["matches"].append(match)

    groups = list(grouped.values())
    for group in groups:
        group["totalFound"] = int(group_totals.get(group["indexId"], 0))
        group["shownCount"] = len(group["matches"])

    groups.sort(key=lambda item: max((match["score"] for match in item["matches"]), default=0.0), reverse=True)
    return (
        total_indexes,
        total_found,
        total_lexical_filtered,
        float(min_recommended_used if min_recommended_used is not None else DEFAULT_MIN_SCORE),
        float(max_recommended_used if max_recommended_used is not None else DEFAULT_MIN_SCORE),
        rag_context,
        groups,
    )


def search_semantic_overview_export_with_total(
    term: str,
    api_key: str,
    min_score: float | None = None,
    exclude_lexical_duplicates: bool = True,
    use_rag_context: bool = False,
    vector_store_ids: list[str] | None = None,
    source_ids: list[str] | None = None,
    ignore_base_calibration: bool = False,
    mini_text_window: int = JANELA_TEXTO_MINI,
    per_index_limit: int = SEMANTIC_OVERVIEW_EXPORT_LIMIT_PER_INDEX,
    total_limit: int = SEMANTIC_OVERVIEW_EXPORT_TOTAL_LIMIT,
) -> tuple[int, int, int, float, float, dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    indexes = _filter_semantic_indexes_by_ids(list_semantic_indexes(), source_ids)
    if not indexes:
        return 0, 0, 0, DEFAULT_MIN_SCORE, DEFAULT_MIN_SCORE, {
            "usedRagContext": False,
            "sourceQuery": term,
            "vectorStoreIds": [value for value in (vector_store_ids or []) if str(value or "").strip()],
            "keyTerms": [],
            "definitions": [],
            "relatedTerms": [],
            "disambiguatedQuery": "",
            "references": [],
        }, [], {
            "perIndexLimit": per_index_limit,
            "totalLimit": total_limit,
            "includedCount": 0,
            "truncated": False,
        }

    query_cache: dict[str, np.ndarray] = {}
    collected: list[dict[str, Any]] = []
    total_found = 0
    total_lexical_filtered = 0
    total_indexes = len(indexes)
    group_totals: dict[str, int] = {}
    group_labels: dict[str, str] = {}
    min_recommended_used: float | None = None
    max_recommended_used: float | None = None
    per_index_limit = max(1, min(int(per_index_limit or SEMANTIC_OVERVIEW_EXPORT_LIMIT_PER_INDEX), SEMANTIC_OVERVIEW_EXPORT_LIMIT_PER_INDEX))
    total_limit = max(1, min(int(total_limit or SEMANTIC_OVERVIEW_EXPORT_TOTAL_LIMIT), SEMANTIC_OVERVIEW_EXPORT_TOTAL_LIMIT))
    rag_context = {
        "usedRagContext": False,
        "sourceQuery": term,
        "vectorStoreIds": [value for value in (vector_store_ids or []) if str(value or "").strip()],
        "keyTerms": [],
        "definitions": [],
        "relatedTerms": [],
        "disambiguatedQuery": "",
        "references": [],
    }

    clear_source_document_cache()
    with _SEMANTIC_INDEX_CACHE_LOCK:
        _SEMANTIC_INDEX_CACHE.clear()
    if use_rag_context:
        try:
            rag_context = resolve_semantic_query_context(
                term,
                api_key=api_key,
                vector_store_ids=vector_store_ids,
            )
        except Exception as exc:
            rag_context["error"] = str(exc)

    for index_meta in indexes:
        index_id = _normalize_index_id(str(index_meta.get("id") or ""))
        index_label = str(index_meta.get("label") or index_id).strip()
        loaded: dict[str, Any] | None = None
        ranked: dict[str, Any] | None = None
        query_vector: np.ndarray | None = None
        try:
            loaded = _load_semantic_index(index_id, use_cache=False)
            manifest = loaded["manifest"]
            recommended_min_score = float(loaded.get("recommended_min_score") or DEFAULT_MIN_SCORE)
            min_recommended_used = recommended_min_score if min_recommended_used is None else min(min_recommended_used, recommended_min_score)
            max_recommended_used = recommended_min_score if max_recommended_used is None else max(max_recommended_used, recommended_min_score)
            query_vector_params = {
                "api_key": api_key,
                "model": str(manifest.get("model") or "").strip(),
                "cache": query_cache,
            }
            if rag_context.get("usedRagContext"):
                query_vector_params["semantic_context"] = rag_context
            query_vector = _get_semantic_query_vector(term, **query_vector_params)
            requested_min_score = None if min_score is None else max(0.0, float(min_score))
            should_ignore_base_calibration = ignore_base_calibration or (requested_min_score is not None and requested_min_score > 0)
            ranked = _score_matches(
                loaded["metadata"],
                loaded["embeddings"],
                _loaded_source_records_by_row(loaded),
                loaded["search_texts"],
                query_vector,
                index_id,
                index_label,
                limit=per_index_limit,
                min_score=requested_min_score if should_ignore_base_calibration and requested_min_score is not None else recommended_min_score,
                exclude_lexical_duplicates=exclude_lexical_duplicates,
                lexical_query=term,
                mini_text_window=mini_text_window,
            )
            index_total_found = int(ranked["total_found"])
            total_found += index_total_found
            total_lexical_filtered += int(ranked["lexical_filtered_count"])
            group_totals[index_id] = index_total_found
            group_labels[index_id] = index_label
            collected.extend(ranked["matches"])
        except Exception:
            continue
        finally:
            loaded = None
            ranked = None
            query_vector = None
            gc.collect()

    collected.sort(
        key=lambda item: (
            float(item.get("score") or 0.0),
            float(item.get("semantic_score") or 0.0),
            -int(item.get("row") or 0),
        ),
        reverse=True,
    )
    truncated = len(collected) > total_limit
    included = collected[:total_limit]

    grouped: dict[str, dict[str, Any]] = {}
    for match in included:
        index_id = str(match.get("index_id") or "").strip()
        group = grouped.setdefault(index_id, {
            "indexId": index_id,
            "indexLabel": str(match.get("index_label") or group_labels.get(index_id) or index_id).strip(),
            "totalFound": int(group_totals.get(index_id, 0)),
            "shownCount": 0,
            "matches": [],
        })
        group["matches"].append(match)
        group["shownCount"] = len(group["matches"])

    groups = list(grouped.values())
    groups.sort(key=lambda item: max((match["score"] for match in item["matches"]), default=0.0), reverse=True)
    return (
        total_indexes,
        total_found,
        total_lexical_filtered,
        float(min_recommended_used if min_recommended_used is not None else DEFAULT_MIN_SCORE),
        float(max_recommended_used if max_recommended_used is not None else DEFAULT_MIN_SCORE),
        rag_context,
        groups,
        {
            "perIndexLimit": per_index_limit,
            "totalLimit": total_limit,
            "includedCount": len(included),
            "truncated": truncated,
        },
    )
