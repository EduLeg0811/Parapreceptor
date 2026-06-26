from __future__ import annotations

import re
import unicodedata
from typing import Any, Callable, Optional

try:
    from backend.functions.source_records import clear_source_document_cache, list_source_documents, load_source_document, resolve_source_entry
except Exception:
    from functions.source_records import clear_source_document_cache, list_source_documents, load_source_document, resolve_source_entry


_BOOL_OPS: dict[str, int] = {"!": 3, "&": 2, "|": 1}
BOOK_CODE_TO_FILE: dict[str, str] = {
    "PC": "PC",  # nao ha arquivo na base atual
    "PROJ": "PROJ",
    "EXP": "700EXP",
    "CCG": "CCG",
    "TNP": "TNP",
    "MP": "PROEXIS",
    "MDE": "DUPLA",
    "MRC": "MRC",  # nao ha arquivo na base atual
    "MMT": "MMT",  # nao ha arquivo na base atual
    "TC": "TEMAS",
    "TEAT": "200TEAT",
    "NE": "NE",  # nao ha arquivo na base atual
    "HSR": "HSR",
    "HSP": "HSP",
    "DNC": "DNC",  # nao ha arquivo na base atual
    "DAC": "DAC",
    "LO": "LO",
    "EC": "EC",
    "QUEST": "QUEST",
    "BLOG": "BLOG",
    "MINI_ARLINDO": "MINI_ARLINDO",
    "MINI_EDUNOTES": "MINI_EDUNOTES",
}
FILE_TO_BOOK_CODE: dict[str, str] = {filename: code for code, filename in BOOK_CODE_TO_FILE.items()}
BOOK_CODE_LABELS: dict[str, str] = {
    "PC": "Projecoes da Consciencia",
    "PROJ": "Projeciologia",
    "EXP": "700 Experimentos da Conscienciologia",
    "CCG": "Conscienciograma",
    "TNP": "Manual da Tenepes",
    "MP": "Manual da Proexis",
    "MDE": "Manual da Dupla Evolutiva",
    "MRC": "Manual de Redacao da Conscienciologia",
    "MMT": "Manual dos Megapensenes Trivocabulares",
    "TC": "Temas da Conscienciologia",
    "TEAT": "200 Teaticas da Conscienciologia",
    "NE": "Nossa Evolucao",
    "HSR": "Homo sapiens reurbanisatus",
    "HSP": "Homo sapiens pacificus",
    "DNC": "Dicionario de Neologismos da Conscienciologia",
    "DAC": "Dicionario de Argumentos da Conscienciologia",
    "LO": "Lexico de Ortopensatas",
    "EC": "Enciclopedia da Conscienciologia",
    "BLOG": "Blog Tertulias",
    "MINI_ARLINDO": "Minitertulia - Arlindo",
    "MINI_EDUNOTES": "Edunotes",
}

# Limite proprio do backend para buscas lexicais em livro.
# A varredura e interrompida quando atingir esse teto para evitar
# processamento excessivo em arquivos muito grandes.
MAX_BOOK_SEARCH = 200

# Janela padrao da base MINI_ARLINDO: quantidade de frases completas
# mantidas antes e depois da primeira frase que contem o termo encontrado.
# Ajuste este valor para expandir ou reduzir o contexto exibido nos cards.
JANELA_TEXTO_MINI = 3


def _sanitize_search_text(text: str) -> str:
    cleaned = (text or "").replace("\u00A0", " ")
    cleaned = re.sub(r"[\u200B-\u200D\u2060\uFEFF]", "", cleaned)
    cleaned = cleaned.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    return re.sub(r"\s+", " ", cleaned).strip()


def _normalize(text: str) -> str:
    base = unicodedata.normalize("NFD", _sanitize_search_text(text))
    return "".join(ch for ch in base if unicodedata.category(ch) != "Mn").lower().strip()


def _normalize_for_match(text: str) -> str:
    base = _normalize(text or "")
    return re.sub(r"[^\w\s\*]", "", base)


def _strip_markdown_simple(text: str) -> str:
    """
    Remove marcacoes markdown simples (* e **) para evitar ruido de match.
    """
    if not text:
        return ""
    return re.sub(r"(\*\*|\*)", "", text)


def _balanced_parentheses(query: str) -> bool:
    depth = 0
    for ch in query:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth < 0:
                return False
    return depth == 0


def _tokenize_query(query: str) -> list[str]:
    query = _sanitize_search_text(query)
    tokens: list[str] = []
    i, n = 0, len(query)
    while i < n:
        c = query[i]
        if c.isspace():
            i += 1
            continue
        if c in "()&|!":
            tokens.append(c)
            i += 1
            continue
        if c == '"':
            j = i + 1
            buf: list[str] = []
            while j < n and query[j] != '"':
                buf.append(query[j])
                j += 1
            tokens.append('"' + "".join(buf) + '"')
            i = j + 1 if j < n and query[j] == '"' else j
            continue
        j = i
        while j < n and (not query[j].isspace()) and query[j] not in "()&|!":
            j += 1
        tokens.append(query[i:j])
        i = j
    return tokens


def _shunting_yard(tokens: list[str]) -> list[str]:
    normalized_tokens: list[str] = []
    prev_token: str | None = None

    def _is_operand(token: str) -> bool:
        return token not in _BOOL_OPS and token not in {"(", ")"}

    for token in tokens:
        if prev_token is not None:
            prev_is_operand = _is_operand(prev_token) or prev_token == ")"
            next_starts_operand = _is_operand(token) or token == "(" or token == "!"
            if prev_is_operand and next_starts_operand:
                normalized_tokens.append("&")
        normalized_tokens.append(token)
        prev_token = token

    output: list[str] = []
    st: list[str] = []
    for t in normalized_tokens:
        if t in _BOOL_OPS:
            while st and st[-1] in _BOOL_OPS and _BOOL_OPS[st[-1]] >= _BOOL_OPS[t]:
                output.append(st.pop())
            st.append(t)
        elif t == "(":
            st.append(t)
        elif t == ")":
            while st and st[-1] != "(":
                output.append(st.pop())
            if st and st[-1] == "(":
                st.pop()
        else:
            output.append(t)
    while st:
        output.append(st.pop())
    return output


def _wildcard_pattern(term_raw: str) -> re.Pattern[str]:
    term = _normalize_for_match(term_raw)
    body = "".join(".*" if ch == "*" else re.escape(ch) for ch in term)
    return re.compile(rf"\b{body}\b", flags=re.IGNORECASE)


def _phrase_pattern(quoted_raw: str) -> re.Pattern[str]:
    core = quoted_raw[1:-1] if len(quoted_raw) >= 2 and quoted_raw[0] == '"' and quoted_raw[-1] == '"' else quoted_raw
    core_norm = _normalize_for_match(core)
    parts = [re.escape(p) for p in core_norm.split() if p]
    if not parts:
        return re.compile(r"(?!x)x")
    return re.compile(r"\b" + r"\s+".join(parts) + r"\b", flags=re.IGNORECASE)


def _compile_boolean_predicate(query: str) -> Callable[[str], bool]:
    q = _sanitize_search_text(query)
    if not q:
        return lambda _pnorm: True

    tokens = _tokenize_query(q)
    if not tokens:
        return lambda _pnorm: True
    if not _balanced_parentheses(q):
        return lambda pnorm: _normalize_for_match(q) in pnorm

    rpn = _shunting_yard(tokens)
    pat_cache: dict[str, re.Pattern[str] | str] = {}

    for token in tokens:
        if token in _BOOL_OPS or token in {"(", ")"}:
            continue
        if token.startswith('"') and token.endswith('"') and len(token) >= 2:
            pat_cache[token] = _phrase_pattern(token)
        elif "*" in token:
            pat_cache[token] = _wildcard_pattern(token)
        else:
            pat_cache[token] = _normalize_for_match(token)

    def _eval_token(token: str, pnorm: str) -> bool:
        compiled = pat_cache.get(token)
        if compiled is None:
            return False
        if isinstance(compiled, str):
            return bool(compiled) and compiled in pnorm
        return compiled.search(pnorm) is not None

    def _predicate(pnorm: str) -> bool:
        st: list[bool] = []
        for t in rpn:
            if t in _BOOL_OPS:
                if t == "!":
                    if not st:
                        return False
                    st.append(not st.pop())
                else:
                    if len(st) < 2:
                        return False
                    b = st.pop()
                    a = st.pop()
                    st.append(a and b if t == "&" else a or b)
            else:
                st.append(_eval_token(t, pnorm))
        return len(st) == 1 and st[0]

    return _predicate


def _compile_prefilter(query: str) -> Optional[Callable[[str], bool]]:
    q = _sanitize_search_text(query)
    if not q:
        return None

    tokens = _tokenize_query(q)
    if not tokens or "|" in tokens:
        return None

    must_have: list[str] = []
    must_not: list[str] = []
    negate_next = False

    for token in tokens:
        if token in {"(", ")", "&"}:
            continue
        if token == "!":
            negate_next = True
            continue
        if token == "|":
            return None
        if "*" in token:
            negate_next = False
            continue
        core = token[1:-1] if token.startswith('"') and token.endswith('"') and len(token) >= 2 else token
        lit = _normalize_for_match(core)
        if not lit:
            negate_next = False
            continue
        if negate_next:
            must_not.append(lit)
            negate_next = False
        else:
            must_have.append(lit)

    if not must_have and not must_not:
        return None

    def _prefilter(pnorm: str) -> bool:
        return all(lit in pnorm for lit in must_have) and all(lit not in pnorm for lit in must_not)

    return _prefilter


def _process_found_paragraph(paragraph: str, search_term: str) -> str:
    """
    Reestrutura paragrafos que usam '|' como agregador:
      - Se houver 2+ ocorrencias de '|': mantem o primeiro "cabecalho" e
        adiciona apenas subtrechos que contenham o termo de busca (normalizado).
      - Caso contrario, retorna o paragrafo original.
    """
    if not search_term:
        return paragraph

    sanitized_query = _sanitize_search_text(search_term)
    if not sanitized_query:
        return paragraph
    predicate = _compile_boolean_predicate(sanitized_query)

    if paragraph.count("|") >= 2:
        parts = paragraph.split("|")
        if not parts:
            return paragraph

        rebuilt: list[str] = [parts[0].strip()]
        for sub in parts[1:]:
            segment = sub.strip()
            if predicate(_normalize_for_match(segment)):
                rebuilt.append(segment)

        if len(rebuilt) == 1:
            return ""

        result = " ".join(rebuilt)
        return result.replace("|", "").replace("\\", "").replace("\n", "").strip()

    return paragraph


def _split_complete_sentences(text: str) -> list[str]:
    cleaned = _sanitize_search_text(text)
    if not cleaned:
        return []
    matches = list(re.finditer(r"[^.!?…]+(?:[.!?…]+(?:[\"')\]]+)?|$)", cleaned))
    sentences = [match.group(0).strip() for match in matches if match.group(0).strip()]
    return sentences or [cleaned]


def _mini_arlindo_windowed_text(paragraph: str, search_term: str, date: str, window: int = JANELA_TEXTO_MINI) -> str:
    sentences = _split_complete_sentences(paragraph)
    if not sentences:
        return f"**{date}**:" if date else ""

    predicate = _compile_boolean_predicate(search_term)
    match_index = next(
        (idx for idx, sentence in enumerate(sentences) if predicate(_normalize_for_match(_strip_markdown_simple(sentence)))),
        0,
    )
    safe_window = max(0, int(window))
    start = max(0, match_index - safe_window)
    end = min(len(sentences), match_index + safe_window + 1)
    excerpt = " ".join(sentences[start:end]).strip()
    return f"**{date}**: {excerpt}" if date else excerpt


def _split_search_segments(row_map: dict[str, Any]) -> list[str]:
    segments: list[str] = []

    for value in row_map.values():
        if not value:
            continue
        cleaned = _strip_markdown_simple(str(value))
        if not cleaned:
            continue
        parts = [part.strip() for part in cleaned.split("|")]
        segments.extend(part for part in parts if part)

    return segments


def _resolve_source_book_code(source: dict[str, Any]) -> str:
    book_code = str(source.get("book_code") or "").strip().upper()
    if book_code:
        return book_code
    file_stem = str(source.get("file_stem") or source.get("index_label") or source.get("index_id") or "").strip()
    return FILE_TO_BOOK_CODE.get(file_stem, file_stem).strip().upper()


def _resolve_source_book_name(source: dict[str, Any], book_code: str) -> str:
    return (
        str(source.get("book_name") or "").strip()
        or BOOK_CODE_LABELS.get(book_code)
        or str(source.get("index_label") or source.get("file_stem") or source.get("index_id") or "").strip()
        or book_code
    )


def list_lexical_books() -> list[str]:
    return [item["id"] for item in list_lexical_book_options()]


def list_lexical_book_options() -> list[dict[str, str]]:
    options: list[dict[str, str]] = []
    seen: set[str] = set()

    try:
        source_entries = list_source_documents()
    except Exception:
        return []

    for source in source_entries:
        book_code = _resolve_source_book_code(source)
        source_id = str(source.get("index_id") or source.get("file_stem") or book_code).strip()
        option_id = book_code if book_code in BOOK_CODE_TO_FILE else source_id
        if not option_id or option_id in seen:
            continue
        seen.add(option_id)
        options.append({
            "id": option_id,
            "label": _resolve_source_book_name(source, book_code),
            "indexId": str(source.get("index_id") or "").strip(),
            "fileStem": str(source.get("file_stem") or "").strip(),
        })
    return sorted(options, key=lambda item: (item["label"].casefold(), item["id"]))


def _iter_lexical_source_entries() -> list[dict[str, Any]]:
    return sorted(
        list_source_documents(),
        key=lambda item: str(item.get("file_stem") or item.get("index_label") or item.get("index_id") or "").upper(),
    )


def _filter_source_entries_by_ids(source_entries: list[dict[str, Any]], source_ids: list[str] | None) -> list[dict[str, Any]]:
    normalized_ids = {str(value or "").strip().lower() for value in (source_ids or []) if str(value or "").strip()}
    if not normalized_ids:
        return source_entries
    return [
        entry
        for entry in source_entries
        if str(entry.get("index_id") or "").strip().lower() in normalized_ids
    ]


def _resolve_book_identity(book: str) -> tuple[str, dict[str, Any], str]:
    book_code = (book or "").strip().upper()
    if not book_code:
        raise ValueError("Parametro 'book' e obrigatorio.")

    filename = BOOK_CODE_TO_FILE.get(book_code)
    if not filename:
        # Compatibilidade legada: aceita nome de arquivo/stem diretamente.
        filename = (book or "").strip()
    try:
        source_doc = load_source_document(filename)
    except FileNotFoundError:
        raise FileNotFoundError(f"Livro lexical nao encontrado: {book_code}.")
    file_stem = str(source_doc.get("file_stem") or filename).strip()
    book_code = _resolve_source_book_code(source_doc) or book_code
    return book_code, source_doc, file_stem


def _resolve_book_label(book_code: str, file_stem: str, source_doc: dict[str, Any] | None = None) -> str:
    normalized_code = (book_code or "").strip().upper()
    return _resolve_source_book_name(source_doc or {}, normalized_code) or file_stem or normalized_code


def _search_lexical_source_internal(
    source_doc: dict[str, Any],
    resolved_book_code: str,
    resolved_book_label: str,
    file_stem: str,
    term: str,
    limit: int = 50,
    mini_text_window: int = JANELA_TEXTO_MINI,
) -> tuple[int, list[dict[str, Any]]]:
    raw_term = _sanitize_search_text(term)
    if not raw_term:
        raise ValueError("Parametro 'term' e obrigatorio.")

    max_rows = max(1, min(int(limit or 50), MAX_BOOK_SEARCH))
    term_norm = _normalize_for_match(raw_term)
    if not term_norm:
        raise ValueError("Parametro 'term' invalido.")
    predicate = _compile_boolean_predicate(raw_term)
    prefilter = _compile_prefilter(raw_term)

    rows: list[dict[str, Any]] = []
    total_matches = 0
    for record in source_doc.get("records") or []:
        if not isinstance(record, dict):
            continue
        raw_row_map = record.get("data") if isinstance(record.get("data"), dict) else {}
        row_map = {
            str(key): _sanitize_search_text(str(value or ""))
            for key, value in raw_row_map.items()
        }
        if "text" not in row_map:
            row_map["text"] = _sanitize_search_text(str(record.get("text") or ""))

        segments = _split_search_segments(row_map)
        haystack = _normalize_for_match(" ".join(segments))
        normalized_segments = [_normalize_for_match(segment) for segment in segments]

        if prefilter is not None and not (
            prefilter(haystack) or any(prefilter(segment) for segment in normalized_segments)
        ):
            continue
        if not (
            predicate(haystack) or any(predicate(segment) for segment in normalized_segments)
        ):
            continue

        row_number_raw = row_map.get("number") or row_map.get("paragraph_number") or ""
        try:
            row_number = int(str(row_number_raw))
        except Exception:
            row_number = None

        # Mantem o markdown original da fonte canonica no payload de retorno.
        # A remocao de marcacoes serve apenas para o matching acima.
        raw_text = str(row_map.get("text") or record.get("text") or "").strip()
        if resolved_book_code == "MINI_ARLINDO":
            processed_text = _mini_arlindo_windowed_text(
                raw_text,
                raw_term,
                str(row_map.get("date") or "").strip(),
                window=mini_text_window,
            )
        else:
            processed_text = _process_found_paragraph(raw_text, raw_term) if raw_text else raw_text
        if raw_text and not processed_text:
            continue

        total_matches += 1
        if len(rows) < max_rows:
            rows.append(
                {
                    "book": resolved_book_code,
                    "book_label": resolved_book_label,
                    "file_stem": file_stem,
                    "row": int(record.get("row") or 0),
                    "number": row_number,
                    "title": str(row_map.get("title") or "").strip(),
                    "text": processed_text,
                    "pagina": str(row_map.get("pagina") or row_map.get("page") or "").strip(),
                    "data": row_map,
                }
            )
        if total_matches >= MAX_BOOK_SEARCH:
            break

    return total_matches, rows


def _search_lexical_book_internal(book: str, term: str, limit: int = 50, mini_text_window: int = JANELA_TEXTO_MINI) -> tuple[int, list[dict[str, Any]]]:
    book_code, source_doc, file_stem = _resolve_book_identity(book)
    book_label = _resolve_book_label(book_code, file_stem, source_doc)
    return _search_lexical_source_internal(
        source_doc=source_doc,
        resolved_book_code=book_code,
        resolved_book_label=book_label,
        file_stem=file_stem,
        term=term,
        limit=limit,
        mini_text_window=mini_text_window,
    )


def search_lexical_book(book: str, term: str, limit: int = 50, mini_text_window: int = JANELA_TEXTO_MINI) -> list[dict[str, Any]]:
    _, rows = _search_lexical_book_internal(book=book, term=term, limit=limit, mini_text_window=mini_text_window)
    return rows


def search_lexical_book_with_total(book: str, term: str, limit: int = 50, mini_text_window: int = JANELA_TEXTO_MINI) -> tuple[int, list[dict[str, Any]]]:
    return _search_lexical_book_internal(book=book, term=term, limit=limit, mini_text_window=mini_text_window)


def search_lexical_overview_with_total(
    term: str,
    limit: int = 50,
    progress_callback: Optional[Callable[[dict[str, Any]], None]] = None,
    mini_text_window: int = JANELA_TEXTO_MINI,
    source_ids: list[str] | None = None,
) -> tuple[int, list[dict[str, Any]]]:
    raw_term = _sanitize_search_text(term)
    if not raw_term:
        raise ValueError("Parametro 'term' e obrigatorio.")

    max_rows = max(1, min(int(limit or 50), MAX_BOOK_SEARCH))
    groups: list[dict[str, Any]] = []
    total_found = 0
    clear_source_document_cache()
    source_entries = _filter_source_entries_by_ids(list(_iter_lexical_source_entries()), source_ids)
    total_sources = len(source_entries)

    if progress_callback:
        progress_callback(
            {
                "totalIndexes": total_sources,
                "message": "Preparando Lexical Overview.",
                "event": {
                    "stage": "started",
                    "totalIndexes": total_sources,
                    "note": "Iniciando varredura das bases lexicais.",
                },
            }
    )

    for position, source_entry in enumerate(source_entries, start=1):
        source_id = str(source_entry.get("index_id") or source_entry.get("file_stem") or "").strip()
        source_doc = load_source_document(source_id, use_cache=False)
        file_stem = str(source_doc.get("file_stem") or source_entry.get("file_stem") or source_doc.get("index_label") or "").strip()
        resolved_book_code = _resolve_source_book_code(source_doc or source_entry)
        resolved_book_label = _resolve_book_label(resolved_book_code, file_stem, source_doc)
        if progress_callback:
            progress_callback(
                {
                    "currentIndexPosition": position,
                    "currentIndexId": resolved_book_code,
                    "currentIndexLabel": resolved_book_label,
                    "currentMatches": 0,
                    "message": f"Processando livro {resolved_book_label}.",
                    "event": {
                        "stage": "index_started",
                        "indexId": resolved_book_code,
                        "indexLabel": resolved_book_label,
                        "position": position,
                        "totalIndexes": total_sources,
                        "note": "Varrendo linhas do arquivo lexical.",
                    },
                }
            )
        group_total, matches = _search_lexical_source_internal(
            source_doc=source_doc,
            resolved_book_code=resolved_book_code,
            resolved_book_label=resolved_book_label,
            file_stem=file_stem,
            term=raw_term,
            limit=max_rows,
            mini_text_window=mini_text_window,
        )
        if group_total <= 0:
            if progress_callback:
                progress_callback(
                    {
                        "processedIndexes": position,
                        "currentMatches": 0,
                        "totalMatchesAccumulated": total_found,
                        "message": f"Livro {resolved_book_label} sem matches.",
                        "event": {
                            "stage": "index_completed",
                            "indexId": resolved_book_code,
                            "indexLabel": resolved_book_label,
                            "position": position,
                            "totalIndexes": total_sources,
                            "matchesFound": 0,
                            "totalMatchesAccumulated": total_found,
                            "note": "0 matches",
                        },
                    }
                )
            del source_doc
            continue

        total_found += group_total
        groups.append(
            {
                "bookCode": resolved_book_code,
                "bookLabel": resolved_book_label,
                "fileStem": file_stem,
                "totalFound": group_total,
                "shownCount": min(len(matches), max_rows),
                "matches": matches[:max_rows],
            }
        )
        if progress_callback:
            progress_callback(
                {
                    "processedIndexes": position,
                    "currentMatches": group_total,
                    "totalMatchesAccumulated": total_found,
                    "message": f"Livro {resolved_book_label} processado com {group_total} matches.",
                    "event": {
                        "stage": "index_completed",
                        "indexId": resolved_book_code,
                        "indexLabel": resolved_book_label,
                        "position": position,
                        "totalIndexes": total_sources,
                        "matchesFound": group_total,
                        "totalMatchesAccumulated": total_found,
                        "note": f"{min(len(matches), max_rows)} matches.",
                    },
                }
            )

        del source_doc

    return total_found, groups


def search_lexical_verbetes_with_total(
    author: str = "",
    title: str = "",
    area: str = "",
    text: str = "",
    limit: int = 50,
) -> tuple[int, list[dict[str, Any]]]:
    try:
        source_doc = load_source_document("EC")
    except FileNotFoundError:
        raise FileNotFoundError("Base de verbetes nao encontrada: EC.xlsx")

    filters = {
        "author": _sanitize_search_text(author),
        "title": _sanitize_search_text(title),
        "area": _sanitize_search_text(area),
        "text": _sanitize_search_text(text),
    }
    active_filters = {key: value for key, value in filters.items() if value}
    if not active_filters:
        raise ValueError("Informe ao menos um campo de busca.")

    normalized_filters = {key: _normalize_for_match(value) for key, value in active_filters.items()}
    max_rows = max(1, min(int(limit or 50), MAX_BOOK_SEARCH))

    rows: list[dict[str, Any]] = []
    total_matches = 0
    for record in source_doc.get("records") or []:
        if not isinstance(record, dict):
            continue
        raw_row_map = record.get("data") if isinstance(record.get("data"), dict) else {}
        row_map = {
            str(key): _sanitize_search_text(str(value or ""))
            for key, value in raw_row_map.items()
        }
        if "text" not in row_map:
            row_map["text"] = _sanitize_search_text(str(record.get("text") or ""))

        matched = True
        for field, needle in normalized_filters.items():
            field_value = _normalize_for_match(str(row_map.get(field) or ""))
            if not needle or needle not in field_value:
                matched = False
                break
        if not matched:
            continue

        row_number_raw = row_map.get("number") or ""
        try:
            row_number = int(str(row_number_raw))
        except Exception:
            row_number = None

        total_matches += 1
        if len(rows) < max_rows:
            rows.append(
                {
                    "row": int(record.get("row") or 0),
                    "number": row_number,
                    "title": str(row_map.get("title") or "").strip(),
                    "text": str(row_map.get("text") or "").strip(),
                    "link": str(row_map.get("link") or "").strip(),
                    "data": row_map,
                }
            )
        if total_matches >= MAX_BOOK_SEARCH:
            break

    return total_matches, rows
