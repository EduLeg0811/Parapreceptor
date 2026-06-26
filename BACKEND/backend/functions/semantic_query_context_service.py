from __future__ import annotations

import json
import re
from typing import Any

try:
    from backend.functions.llm_gateway import execute_llm_request
except Exception:
    from functions.llm_gateway import execute_llm_request


SEMANTIC_QUERY_CONTEXT_MODEL = "gpt-5.4-mini"
SEMANTIC_QUERY_CONTEXT_MAX_RESULTS = 5
SEMANTIC_QUERY_CONTEXT_MAX_OUTPUT_TOKENS = 500
SEMANTIC_QUERY_CONTEXT_GPT5_VERBOSITY = "low"
SEMANTIC_QUERY_CONTEXT_GPT5_EFFORT = "none"
SEMANTIC_CONTEXT_STOPWORDS = frozenset({
    "a",
    "ao",
    "aos",
    "as",
    "com",
    "como",
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
    "ou",
    "para",
    "por",
    "qual",
    "quais",
    "que",
    "sem",
    "sobre",
    "um",
    "uma",
})


def _dedupe_clean_strings(values: list[str] | None) -> list[str]:
    return list(dict.fromkeys(str(value or "").strip() for value in (values or []) if str(value or "").strip()))


def _extract_key_terms(raw_query: str) -> list[str]:
    query = (raw_query or "").strip()
    if not query:
        return []

    phrases = [match.group(1).strip() for match in re.finditer(r'"([^"]+)"', query) if match.group(1).strip()]
    normalized_query = re.sub(r'"[^"]+"', " ", query)
    tokens = [
        token.strip()
        for token in re.findall(r"[\w\-]{3,}", normalized_query, flags=re.UNICODE)
        if token.strip() and token.lower() not in SEMANTIC_CONTEXT_STOPWORDS
    ]
    return list(dict.fromkeys([*phrases, *tokens]))[:8]


def _extract_json_block(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {}

    candidates = [raw]
    fenced = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", raw, flags=re.DOTALL | re.IGNORECASE)
    candidates.extend(fenced)
    object_match = re.search(r"(\{.*\})", raw, flags=re.DOTALL)
    if object_match:
        candidates.append(object_match.group(1))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except Exception:
            continue
        if isinstance(parsed, dict):
            return parsed
    return {}


def _coerce_definitions(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    definitions: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        term = str(item.get("term") or "").strip()
        meaning = str(item.get("meaning") or "").strip()
        if not term or not meaning:
            continue
        definitions.append({"term": term, "meaning": meaning})
    return definitions[:8]


def _coerce_related_terms(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return _dedupe_clean_strings([str(item or "") for item in value])[:12]


def resolve_semantic_query_context(
    raw_query: str,
    *,
    api_key: str,
    vector_store_ids: list[str] | None,
    model: str = SEMANTIC_QUERY_CONTEXT_MODEL,
) -> dict[str, Any]:
    query = (raw_query or "").strip()
    cleaned_vector_store_ids = [value for value in _dedupe_clean_strings(vector_store_ids) if value.startswith("vs_")]
    key_terms = _extract_key_terms(query)

    empty_result = {
        "usedRagContext": False,
        "sourceQuery": query,
        "vectorStoreIds": cleaned_vector_store_ids,
        "keyTerms": key_terms,
        "definitions": [],
        "relatedTerms": [],
        "disambiguatedQuery": "",
        "references": [],
        "llmLog": None,
    }
    if not query or not cleaned_vector_store_ids:
        return empty_result

    prompt = (
        "Voce vai desambiguar uma query de busca semantica no contexto da Conscienciologia.\n"
        "Use exclusivamente o material recuperado do vector store.\n"
        "Nao use conhecimento geral se ele nao estiver apoiado nos resultados recuperados.\n"
        "Retorne SOMENTE JSON valido, sem markdown, sem comentarios, sem texto adicional.\n"
        'Formato exato:\n'
        '{\n'
        '  "definitions": [{"term": "string", "meaning": "string"}],\n'
        '  "related_terms": ["string"],\n'
        '  "disambiguated_query": "string"\n'
        '}\n'
        "Regras:\n"
        "- definitions: no maximo 4 itens.\n"
        "- meaning: definicao curta, objetiva e conscienciologica.\n"
        "- related_terms: no maximo 8 termos tecnicos ou expressoes fortemente relacionadas.\n"
        "- disambiguated_query: reformule a query original em portugues, preservando a intencao do usuario e explicitando o sentido conscienciologico dos termos-chave.\n"
        "- Se os resultados forem insuficientes, retorne arrays vazios e disambiguated_query vazio.\n"
    )
    user_message = (
        f"Query original: {query}\n"
        f"Termos-chave extraidos: {', '.join(key_terms) if key_terms else '(nenhum termo-chave identificado)'}\n"
        "Contextualize os termos no sentido conscienciologico."
    )

    result = execute_llm_request(
        api_key=api_key,
        model=model,
        messages=[{"role": "user", "content": user_message}],
        system_prompt=prompt,
        vector_store_ids=cleaned_vector_store_ids,
        vector_max_results=SEMANTIC_QUERY_CONTEXT_MAX_RESULTS,
        max_output_tokens=SEMANTIC_QUERY_CONTEXT_MAX_OUTPUT_TOKENS,
        gpt5_verbosity=SEMANTIC_QUERY_CONTEXT_GPT5_VERBOSITY,
        gpt5_effort=SEMANTIC_QUERY_CONTEXT_GPT5_EFFORT,
        timeout=60,
    )
    parsed = _extract_json_block(str(result.get("content") or ""))
    definitions = _coerce_definitions(parsed.get("definitions"))
    related_terms = _coerce_related_terms(parsed.get("related_terms"))
    disambiguated_query = str(parsed.get("disambiguated_query") or "").strip()
    references = _dedupe_clean_strings([str(item or "") for item in (result.get("references") or [])])[:12]
    raw_payload = result.get("raw") if isinstance(result.get("raw"), dict) else {}
    llm_log_response_meta = {
        **raw_payload,
        "rag_references": references,
    }
    llm_log = {
        "request": result.get("request") or {},
        "response": {
            "content": str(result.get("content") or "").strip(),
            "meta": llm_log_response_meta,
        },
    }

    return {
        "usedRagContext": bool(definitions or related_terms or disambiguated_query),
        "sourceQuery": query,
        "vectorStoreIds": cleaned_vector_store_ids,
        "keyTerms": key_terms,
        "definitions": definitions,
        "relatedTerms": related_terms,
        "disambiguatedQuery": disambiguated_query,
        "references": references,
        "llmLog": llm_log,
    }
