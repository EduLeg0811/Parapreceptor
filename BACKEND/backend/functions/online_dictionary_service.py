from __future__ import annotations

import hashlib
import time
from typing import Any, Callable

try:
    from backend.python.external_dictionary import (
        clean_text,
        dedupe,
        normalize_definitions,
        strip_accents,
    )
    from backend.python import external_dictionary as external_dictionary_module
except Exception:
    from python.external_dictionary import (
        clean_text,
        dedupe,
        normalize_definitions,
        strip_accents,
    )
    import python.external_dictionary as external_dictionary_module


SOURCE_SCORES = {
    "Aulete": 1.00,
    "Michaelis": 0.96,
    "Priberam": 0.92,
    "Wiktionary": 0.76,
    "Dicio": 0.66,
}


def stage_quality_score(source: str, definition_count: int, synonym_count: int, has_etymology: bool) -> float:
    base = SOURCE_SCORES.get(source, 0.5) * 100
    richness = min(definition_count, 10) * 2.2 + min(synonym_count, 8) * 0.8
    etymology_bonus = 3.0 if has_etymology else 0.0
    return round(base + richness + etymology_bonus, 2)


def build_stage(
    source: str,
    started_at: float,
    *,
    ok: bool,
    url: str | None = None,
    definitions: list[str] | None = None,
    synonyms: list[str] | None = None,
    etymology: str | None = None,
    examples: list[str] | None = None,
    error: str | None = None,
    query_term: str | None = None,
    retry_without_accents: bool = False,
) -> dict[str, Any]:
    definitions = normalize_definitions(definitions or [])
    synonyms = dedupe(synonyms or [])
    examples = dedupe(examples or [])
    etymology = clean_text(etymology) or None
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 1)
    quality_score = stage_quality_score(source, len(definitions), len(synonyms), bool(etymology))
    return {
        "source": source,
        "ok": ok and bool(definitions),
        "url": url,
        "elapsed_ms": elapsed_ms,
        "quality_score": quality_score,
        "definitions": definitions,
        "synonyms": synonyms,
        "examples": examples,
        "etymology": etymology,
        "query_term": query_term,
        "retry_without_accents": retry_without_accents,
        "error": None if ok and definitions else (error or "nenhuma definicao extraida"),
    }


def _legacy_stage_from_external(stage: dict[str, Any], fallback_term: str) -> dict[str, Any]:
    data = stage.get("data", {})
    extra = stage.get("extra", {})
    definitions = data.get("definitions", [])
    synonyms = data.get("synonyms", [])
    etymology = data.get("etymology")
    return {
        "source": stage.get("source"),
        "ok": bool(stage.get("ok")),
        "url": stage.get("url"),
        "elapsed_ms": stage.get("elapsed_ms"),
        "quality_score": stage_quality_score(
            str(stage.get("source") or ""),
            len(definitions),
            len(synonyms),
            bool(etymology),
        ),
        "definitions": definitions,
        "synonyms": synonyms,
        "examples": data.get("examples", []),
        "etymology": etymology,
        "query_term": extra.get("query_term", fallback_term),
        "retry_without_accents": bool(extra.get("retry_without_accents")),
        "error": stage.get("error"),
    }


def fetch_aulete(word: str) -> dict[str, Any]:
    return _legacy_stage_from_external(external_dictionary_module.fetch_aulete(word), word)


def fetch_dicio(word: str) -> dict[str, Any]:
    return _legacy_stage_from_external(external_dictionary_module.fetch_dicio(word), word)


def fetch_wiktionary(word: str) -> dict[str, Any]:
    return _legacy_stage_from_external(external_dictionary_module.fetch_wiktionary(word), word)


def fetch_priberam(word: str) -> dict[str, Any]:
    return _legacy_stage_from_external(external_dictionary_module.fetch_priberam(word), word)


def fetch_michaelis(word: str) -> dict[str, Any]:
    return _legacy_stage_from_external(external_dictionary_module.fetch_michaelis(word), word)


def fetch_with_accent_fallback(source_fetcher: Callable[[str], dict[str, Any]], word: str) -> dict[str, Any]:
    primary = source_fetcher(word)
    accentless = strip_accents(word)

    if accentless == word:
        primary["query_term"] = word
        primary["retry_without_accents"] = False
        return primary

    if primary["ok"] and primary["definitions"]:
        primary["query_term"] = word
        primary["retry_without_accents"] = False
        return primary

    retry = source_fetcher(accentless)
    retry["query_term"] = accentless
    retry["retry_without_accents"] = True
    retry["error"] = retry["error"] or primary["error"]
    if retry["ok"] and retry["definitions"]:
        return retry

    primary["query_term"] = word
    primary["retry_without_accents"] = True
    return primary


def rank_results(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        results,
        key=lambda item: (
            item["ok"],
            item["quality_score"],
            len(item["definitions"]),
        ),
        reverse=True,
    )


def build_summary(results: list[dict[str, Any]]) -> dict[str, Any]:
    working = [result for result in results if result["ok"]]
    definitions: list[str] = []
    synonyms: list[str] = []
    examples: list[str] = []
    etymology = None

    for result in working:
        definitions.extend(result["definitions"])
        synonyms.extend(result["synonyms"])
        examples.extend(result["examples"])
        if not etymology and result["etymology"]:
            etymology = result["etymology"]

    return {
        "definitions": dedupe(definitions),
        "synonyms": dedupe(synonyms),
        "examples": dedupe(examples),
        "etymology": etymology,
    }


def search_online_dictionaries(term: str) -> dict[str, Any]:
    normalized_term = clean_text(term)
    if not normalized_term:
        raise ValueError("Parametro 'term' e obrigatorio.")
    if len(normalized_term) > 80:
        raise ValueError("Parametro 'term' deve ter no maximo 80 caracteres.")

    started_at = time.perf_counter()
    legacy_results = rank_results([
        fetch_with_accent_fallback(fetch_aulete, normalized_term),
        fetch_with_accent_fallback(fetch_michaelis, normalized_term),
        fetch_with_accent_fallback(fetch_priberam, normalized_term),
        fetch_with_accent_fallback(fetch_wiktionary, normalized_term),
        fetch_with_accent_fallback(fetch_dicio, normalized_term),
    ])
    sources_ok = sum(1 for item in legacy_results if item["ok"])

    return {
        "term": normalized_term,
        "sources_total": len(legacy_results),
        "sources_ok": sources_ok,
        "sources_failed": len(legacy_results) - sources_ok,
        "elapsed_ms": round((time.perf_counter() - started_at) * 1000, 1),
        "summary": build_summary(legacy_results),
        "results": legacy_results,
        "request_id": hashlib.blake2b(normalized_term.encode("utf-8"), digest_size=8).hexdigest(),
    }
