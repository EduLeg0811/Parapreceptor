from __future__ import annotations

import re
import unicodedata


SEMANTIC_QUERY_ALIAS_MAP: dict[str, tuple[str, ...]] = {
    "recin": ("reciclagem intraconsciencial",),
    "recins": ("reciclagens intraconscienciais", "reciclagem intraconsciencial"),
    "recexis": ("reciclagem existencial",),
    "recinex": ("reciclagem intraconsciencial", "reciclagem existencial"),
    "invexis": ("inversao existencial",),
    "invexes": ("inversoes existenciais", "inversao existencial"),
    "tenepes": ("tarefa energetica pessoal",),
    "gescon": ("gestacao consciencial",),
    "gescons": ("gestacoes conscienciais", "gestacao consciencial"),
    "proexis": ("programacao existencial",),
    "proexes": ("programacoes existenciais", "programacao existencial"),
    "complexis": ("completismo existencial",),
    "compléxis": ("completismo existencial",),
    "duplismo": ("dupla evolutiva",),
    "duplistas": ("dupla evolutiva",),
    "holopensene": ("holopensene pessoal",),
    "holopensenes": ("holopensenes pessoais", "holopensene pessoal"),
    "ortopensata": ("ortopensata", "pensene ortopensenico"),
    "ortopensatas": ("ortopensatas", "pensenes ortopensenicos"),
}

SEMANTIC_QUERY_PHRASE_MAP: dict[str, tuple[str, ...]] = {
    "curso intermissivo": ("intermissao", "periodo intermissivo"),
    "estado vibracional": ("ev", "vibracao energetica consciencial"),
    "dupla evolutiva": ("duplismo",),
}


def _normalize(text: str) -> str:
    base = unicodedata.normalize("NFD", (text or "").strip().lower())
    collapsed = "".join(ch for ch in base if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", collapsed).strip()


def _dedupe_texts(items: list[tuple[str, float]]) -> list[tuple[str, float]]:
    unique: list[tuple[str, float]] = []
    seen: set[str] = set()
    for text, weight in items:
        normalized = _normalize(text)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique.append((text.strip(), float(weight)))
    return unique


def build_semantic_query_variants(raw_query: str, max_variants: int = 4) -> list[tuple[str, float]]:
    query = (raw_query or "").strip()
    if not query:
        return []

    normalized_query = _normalize(query)
    tokens = re.findall(r"\w+", normalized_query)
    expansions: list[str] = []

    for token in tokens:
        expansions.extend(SEMANTIC_QUERY_ALIAS_MAP.get(token, ()))

    for phrase, aliases in SEMANTIC_QUERY_PHRASE_MAP.items():
        if phrase in normalized_query:
            expansions.extend(aliases)

    deduped_expansions: list[str] = []
    seen_expansions: set[str] = set()
    for expansion in expansions:
        normalized_expansion = _normalize(expansion)
        if not normalized_expansion or normalized_expansion in seen_expansions:
            continue
        seen_expansions.add(normalized_expansion)
        deduped_expansions.append(expansion)

    variants: list[tuple[str, float]] = [(query, 1.0)]
    if deduped_expansions:
        variants.append((f"{query}. Termos relacionados: {', '.join(deduped_expansions[:4])}.", 0.84))
        variants.append((", ".join(deduped_expansions[:6]), 0.72))

    return _dedupe_texts(variants)[: max(1, int(max_variants or 1))]
