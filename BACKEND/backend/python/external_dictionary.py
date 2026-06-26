from __future__ import annotations

import copy
import html
import re
import time
import unicodedata
from functools import lru_cache
from typing import Any, Callable
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup


FRONTEND_ORIGINS = ["*"]
INDEX_FILE = ""


class FileResponse(str):
    def __new__(cls, path: str) -> "FileResponse":
        return str.__new__(cls, path)


def Query(default: str, **_: Any) -> str:
    return default


class FastAPI:
    def __init__(self, **_: Any) -> None:
        pass

    def add_middleware(self, *_: Any, **__: Any) -> None:
        pass

    def get(self, *_: Any, **__: Any) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            return func

        return decorator


class CORSMiddleware:
    pass


USER_AGENT = "DictioLexico/1.1 (+local dev lexical pipeline)"
REQUEST_TIMEOUT = 12

SOURCE_PRECEDENCE = (
    "Aulete",
    "Priberam",
    "Michaelis",
    "Wiktionary",
    "Dicio",
)

app = FastAPI(
    title="Dictio Lexical Pipeline",
    version="1.1.0",
    description="Mini-sistema backend + frontend para consulta de dicionários com fallback, score, cache e indexacao RAG.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in FRONTEND_ORIGINS else FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


def strip_html(value: str | None) -> str:
    if not value:
        return ""
    unescaped = html.unescape(value)
    if "<" in unescaped and ">" in unescaped:
        return BeautifulSoup(unescaped, "html.parser").get_text(" ", strip=True)
    return unescaped


def clean_text(value: str | None) -> str:
    normalized = strip_html(value)
    if not normalized:
        return ""
    normalized = unicodedata.normalize("NFKC", normalized)
    normalized = re.sub(r"\[[^\]]+\]", " ", normalized)
    normalized = re.sub(r"\(\s*editar\s*\)", " ", normalized, flags=re.I)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip(" -\n\t\r")


def strip_accents(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return clean_text(without_marks)


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        cleaned = clean_text(value)
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


GRAMMAR_LABEL_RE = re.compile(
    r"^(?:s\.?\s*f\.?|s\.?\s*m\.?|sf\.?|sm\.?|adj\.?|adv\.?|v\.?|vtd\.?|vti\.?|vi\.?|pron\.?|prep\.?)$",
    re.I,
)
UPPERCASE_BLOCK_RE = r"[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{3,}(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{3,})*"


def normalize_uppercase_block(block: str) -> str:
    parts = [clean_text(part).lower() for part in block.split() if clean_text(part)]
    return ", ".join(parts)


def is_uppercase_gloss(value: str) -> bool:
    candidate = clean_text(value)
    if not candidate:
        return False
    if len(candidate.split()) > 4:
        return False
    letters = [char for char in candidate if char.isalpha()]
    if not letters:
        return False
    return candidate == candidate.upper()


def cleanup_definition_text(value: str) -> str:
    cleaned = clean_text(value)
    if not cleaned:
        return ""

    cleaned = re.sub(r"^(?:\d+\.\s*)+", "", cleaned)
    cleaned = re.sub(r"^(?:ca\.\s*)+", "", cleaned, flags=re.I)
    if GRAMMAR_LABEL_RE.match(cleaned):
        return ""

    cleaned = re.sub(
        rf"({UPPERCASE_BLOCK_RE})\s*:\s*",
        lambda match: f" Sinonimos: {normalize_uppercase_block(match.group(1))}. ",
        cleaned,
    )
    cleaned = re.sub(
        rf"\s+({UPPERCASE_BLOCK_RE})$",
        lambda match: f". Sinonimo: {normalize_uppercase_block(match.group(1))}.",
        cleaned,
    )

    cleaned = re.sub(r"\s+\.\s*", ". ", cleaned)
    cleaned = re.sub(r"\s+,", ",", cleaned)
    cleaned = re.sub(r"\s+:", ":", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    cleaned = cleaned.strip(" .")
    if not cleaned:
        return ""
    return cleaned[0].upper() + cleaned[1:]


def split_senses(value: str) -> list[str]:
    cleaned = clean_text(value)
    if not cleaned:
        return []

    numbered = re.split(r"(?=(?:^|\s)\d+\.)", cleaned)
    pieces = [clean_text(piece) for piece in numbered if clean_text(piece)]
    if len(pieces) > 1:
        return pieces

    semi_split = [clean_text(piece) for piece in re.split(r"\s*;\s+", cleaned) if clean_text(piece)]
    if len(semi_split) > 1:
        return semi_split

    return [cleaned]


def normalize_definitions(definitions: list[str]) -> list[str]:
    normalized: list[str] = []
    for definition in definitions:
        for piece in split_senses(definition):
            cleaned = cleanup_definition_text(piece)
            if cleaned:
                if is_uppercase_gloss(cleaned):
                    if normalized:
                        normalized[-1] = f"{normalized[-1]}. Sinonimo: {cleaned.lower()}."
                    continue
                if cleaned.lower().startswith("sinonimos:") or cleaned.lower().startswith("sinonimo:"):
                    if normalized:
                        normalized[-1] = f"{normalized[-1]} {cleaned}"
                    continue
                normalized.append(cleaned)
    return dedupe(normalized)


@lru_cache(maxsize=512)
def fetch_html_cached(url: str) -> tuple[str, str]:
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6"},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.text, str(response.url)


def fetch_html(url: str) -> tuple[str, str, bool]:
    before = fetch_html_cached.cache_info()
    html_text, final_url = fetch_html_cached(url)
    after = fetch_html_cached.cache_info()
    return html_text, final_url, after.hits > before.hits


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
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    definitions = normalize_definitions(definitions or [])
    synonyms = dedupe(synonyms or [])
    examples = dedupe(examples or [])
    etymology = clean_text(etymology) or None
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 1)

    return {
        "source": source,
        "ok": ok,
        "url": url,
        "elapsed_ms": elapsed_ms,
        "error": error,
        "data": {
            "definitions": definitions,
            "synonyms": synonyms,
            "etymology": etymology,
            "examples": examples,
            "definition_count": len(definitions),
            "synonym_count": len(synonyms),
            "sense_count": len(definitions),
        },
        "extra": extra or {},
    }


def extract_examples_from_text(text: str) -> list[str]:
    return re.findall(r"[“\"]([^”\"]{12,180})[”\"]", text)


def fetch_aulete(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    url = f"https://www.aulete.com.br/{quote(word)}"
    try:
        html_text, final_url, cache_hit = fetch_html(url)
        soup = BeautifulSoup(html_text, "html.parser")
        paragraphs = [clean_text(node.get_text(" ", strip=True)) for node in soup.select("p")]
        definitions = [
            text for text in paragraphs
            if re.match(r"^\d+\.", text) or text.startswith("sf.") or text.startswith("sm.")
        ]
        etymology = next(
            (text for text in paragraphs if "Do lat." in text or "Do gr." in text or "Etim" in text),
            None,
        )
        return build_stage(
            "Aulete",
            started_at,
            ok=bool(definitions),
            url=final_url,
            definitions=definitions[:10],
            etymology=etymology,
            examples=extract_examples_from_text(" ".join(definitions[:4])),
            error=None if definitions else "nenhuma definicao extraida",
            extra={"raw_paragraphs": len(paragraphs), "cache_hit": cache_hit},
        )
    except Exception as exc:
        return build_stage("Aulete", started_at, ok=False, url=url, error=str(exc))


def parse_analogico_keyword(keyword: Any) -> tuple[dict[str, Any] | None, int]:
    title_node = keyword.find("h2")
    title = clean_text(title_node.get_text(" ", strip=True) if title_node else "")
    if not title:
        return None, 0

    classes: list[dict[str, Any]] = []
    current_class: dict[str, Any] | None = None
    empty_headings_dropped = 0

    for child in keyword.children:
        tag_name = getattr(child, "name", None)
        if tag_name == "h3":
            label = clean_text(child.get_text(" ", strip=True))
            if current_class is not None:
                if current_class["terms"]:
                    current_class["term_count"] = len(current_class["terms"])
                    current_class["group_count"] = len(current_class["groups"])
                    classes.append(current_class)
                else:
                    empty_headings_dropped += 1
            current_class = {
                "label": label or "Sem classe",
                "group_count": 0,
                "term_count": 0,
                "groups": [],
                "terms": [],
            }
        elif tag_name == "span" and "analog_group" in (child.get("class") or []):
            if current_class is None:
                current_class = {
                    "label": "Sem classe",
                    "group_count": 0,
                    "term_count": 0,
                    "groups": [],
                    "terms": [],
                }

            group_terms = dedupe(
                [
                    clean_text(word_node.get_text(" ", strip=True))
                    for word_node in child.select(".word")
                ]
            )
            if group_terms:
                current_class["groups"].append(group_terms)
                current_class["terms"] = dedupe(current_class["terms"] + group_terms)

    if current_class is not None:
        if current_class["terms"]:
            current_class["term_count"] = len(current_class["terms"])
            current_class["group_count"] = len(current_class["groups"])
            classes.append(current_class)
        else:
            empty_headings_dropped += 1

    if not classes:
        return None, empty_headings_dropped

    sense = {
        "title": title,
        "term_count": sum(item["term_count"] for item in classes),
        "classes": classes,
    }
    return sense, empty_headings_dropped


def clean_aulete_entry_segment(value: str) -> str:
    cleaned = strip_html(value)
    if not cleaned:
        return ""
    cleaned = unicodedata.normalize("NFKC", cleaned)
    cleaned = re.sub(r"\(\s*editar\s*\)", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"\s+([,.;:)\]])", r"\1", cleaned)
    cleaned = re.sub(r"([(\[])\s+", r"\1", cleaned)
    cleaned = re.sub(r"(?<=[^\s])\[(?=[A-Za-z])", " [", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip(" -")


def parse_aulete_updated_entry(soup: BeautifulSoup, word: str) -> dict[str, Any]:
    copy_node = soup.select_one("#copy")
    raw_text = clean_aulete_entry_segment(copy_node.get_text(" ", strip=True) if copy_node else "")
    if not raw_text:
        return {
            "found": False,
            "label": "Verbete Atualizado",
            "term": word,
            "pronunciation": "",
            "grammar": "",
            "sense_count": 0,
            "definitions": [],
            "etymology": None,
        }

    pronunciation = ""
    body = raw_text
    pronunciation_match = re.match(r"^\(([^)]+)\)\s*(.*)$", body)
    if pronunciation_match:
        pronunciation = clean_text(pronunciation_match.group(1))
        body = pronunciation_match.group(2)

    grammar = ""
    first_sense_match = re.search(r"(?<!\d)(\d+)\.\s*", body)
    if first_sense_match:
        grammar = clean_aulete_entry_segment(body[:first_sense_match.start()])
        body = body[first_sense_match.start():]

    etymology = None
    etymology_index = body.lower().rfind("[f.:")
    if etymology_index != -1:
        etymology_end = body.find("]", etymology_index)
        if etymology_end != -1:
            etymology = clean_aulete_entry_segment(body[etymology_index + 4:etymology_end])
            body = body[:etymology_index]

    matches = list(re.finditer(r"(?<!\d)(\d+)\.\s*", body))
    definitions: list[dict[str, Any]] = []
    if matches:
        for index, match in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
            text = clean_aulete_entry_segment(body[match.end():end])
            if text:
                definitions.append({"index": int(match.group(1)), "text": text})
    else:
        text = clean_aulete_entry_segment(body)
        if text:
            definitions.append({"index": 1, "text": text})

    return {
        "found": bool(definitions),
        "label": "Verbete Atualizado",
        "term": word,
        "pronunciation": pronunciation,
        "grammar": grammar,
        "sense_count": len(definitions),
        "definitions": definitions,
        "etymology": etymology,
    }


def fetch_analogico_aulete(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    url = f"https://www.aulete.com.br/{quote(word)}"
    html_text, final_url, cache_hit = fetch_html(url)
    soup = BeautifulSoup(html_text, "html.parser")
    hidden_content = soup.select_one("#analogico_aulete #hidden_content")
    keywords = hidden_content.select(".keyword") if hidden_content else []

    senses: list[dict[str, Any]] = []
    empty_headings_dropped = 0
    for keyword in keywords:
        sense, dropped = parse_analogico_keyword(keyword)
        empty_headings_dropped += dropped
        if sense is not None:
            senses.append(sense)
    updated_entry = parse_aulete_updated_entry(soup, word)

    found = bool(senses)
    message = None if found else f'Nenhuma relacao de ideias afins foi encontrada para "{word}".'

    return {
        "input": {
            "term": word,
            "normalized_term": word.casefold(),
            "accentless_term": strip_accents(word),
        },
        "source": {
            "name": "Aulete Analogico",
            "url": final_url,
            "cache_hit": cache_hit,
        },
        "entry": updated_entry,
        "result": {
            "term": word,
            "found": found,
            "sense_count": len(senses),
            "term_count": sum(sense["term_count"] for sense in senses),
            "senses": senses,
        },
        "debug": {
            "elapsed_ms": round((time.perf_counter() - started_at) * 1000, 1),
            "raw_keyword_count": len(keywords),
            "empty_headings_dropped": empty_headings_dropped,
            "message": message,
        },
    }


def extract_etymology_paragraphs(soup: BeautifulSoup) -> list[str]:
    origin_heading = soup.find(
        lambda tag: (
            getattr(tag, "name", None) in {"h2", "h3"}
            and "origem da palavra" in clean_text(tag.get_text(" ", strip=True)).casefold()
        )
    )
    if origin_heading is None:
        return []

    paragraphs: list[str] = []
    cursor = origin_heading.find_next_sibling()
    while cursor is not None:
        tag_name = getattr(cursor, "name", None)
        text = clean_text(cursor.get_text(" ", strip=True) if hasattr(cursor, "get_text") else str(cursor))
        lowered = text.casefold()
        if tag_name in {"h1", "h2", "h3"} or lowered.startswith("veja tambem") or lowered.startswith("veja também"):
            break
        if tag_name == "p" and text:
            paragraphs.append(text)
        cursor = cursor.find_next_sibling()
    return dedupe(paragraphs)


def clean_etymology_text(value: str) -> str:
    cleaned = clean_text(value)
    cleaned = re.sub(r"\s+([,.;:!?])", r"\1", cleaned)
    cleaned = re.sub(r"([(\[])\s+", r"\1", cleaned)
    cleaned = re.sub(r"\s+([)\]])", r"\1", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def fetch_etimologia_dicionario_etimologico(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    url = f"https://www.dicionarioetimologico.com.br/{quote(word)}/"
    html_text, final_url, cache_hit = fetch_html(url)
    soup = BeautifulSoup(html_text, "html.parser")

    title = clean_text(soup.select_one("h1").get_text(" ", strip=True) if soup.select_one("h1") else word)
    paragraphs = [clean_etymology_text(paragraph) for paragraph in extract_etymology_paragraphs(soup)]
    found = bool(paragraphs)
    etymology = "\n\n".join(paragraphs)

    return {
        "input": {
            "term": word,
            "normalized_term": word.casefold(),
            "accentless_term": strip_accents(word),
        },
        "source": {
            "name": "Dicionario Etimologico",
            "url": final_url,
            "cache_hit": cache_hit,
        },
        "result": {
            "term": word,
            "title": title,
            "found": found,
            "paragraph_count": len(paragraphs),
            "etymology": etymology if found else None,
            "paragraphs": paragraphs,
        },
        "debug": {
            "elapsed_ms": round((time.perf_counter() - started_at) * 1000, 1),
            "message": None if found else f'Nenhuma etimologia foi encontrada para "{word}".',
        },
    }


def fetch_dicio(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    url = f"https://www.dicio.com.br/{quote(word)}/"
    try:
        html_text, final_url, cache_hit = fetch_html(url)
        soup = BeautifulSoup(html_text, "html.parser")
        definitions = [clean_text(node.get_text(" ", strip=True)) for node in soup.select("p.significado")]
        examples = [clean_text(node.get_text(" ", strip=True)) for node in soup.select("q, cite, em")]

        synonyms: list[str] = []
        for node in soup.select("p.adicional.sinonimos"):
            text = clean_text(node.get_text(" ", strip=True))
            if ":" in text:
                text = text.split(":", 1)[1]
            synonyms.extend(piece.strip() for piece in text.split(",") if piece.strip())

        etymology_node = soup.find(string=re.compile(r"Etimologia", re.I))
        etymology = None
        if etymology_node and etymology_node.parent:
            etymology = clean_text(etymology_node.parent.get_text(" ", strip=True))

        if not definitions:
            raise ValueError("nenhuma definicao extraida")

        return build_stage(
            "Dicio",
            started_at,
            ok=True,
            url=final_url,
            definitions=definitions,
            synonyms=synonyms,
            etymology=etymology,
            examples=examples,
            extra={"cache_hit": cache_hit},
        )
    except Exception as exc:
        return build_stage("Dicio", started_at, ok=False, url=url, error=str(exc))


def fetch_wiktionary(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    url = f"https://pt.wiktionary.org/wiki/{quote(word)}"
    try:
        html_text, final_url, cache_hit = fetch_html(url)
        soup = BeautifulSoup(html_text, "html.parser")
        content = soup.select_one("#mw-content-text")
        if content is None:
            raise ValueError("conteudo principal nao encontrado")

        definitions: list[str] = []
        examples: list[str] = []
        for item in content.select("ol > li"):
            text = clean_text(item.get_text(" ", strip=True))
            if len(text) < 20:
                continue
            definitions.append(text)
            for nested in item.select("ul li"):
                example = clean_text(nested.get_text(" ", strip=True))
                if example:
                    examples.append(example)

        etymology = None
        etymology_marker = content.find(string=re.compile(r"Etimologia", re.I))
        if etymology_marker:
            section = etymology_marker.find_parent(["h2", "h3", "h4"])
            cursor = section.find_next_sibling() if section else None
            snippets: list[str] = []
            while cursor and cursor.name not in {"h2", "h3", "h4"}:
                text = clean_text(cursor.get_text(" ", strip=True))
                if text:
                    snippets.append(text)
                cursor = cursor.find_next_sibling()
            etymology = " ".join(snippets[:2])

        return build_stage(
            "Wiktionary",
            started_at,
            ok=bool(definitions),
            url=final_url,
            definitions=definitions[:10],
            etymology=etymology,
            examples=examples[:5],
            error=None if definitions else "nenhuma definicao extraida",
            extra={"cache_hit": cache_hit},
        )
    except Exception as exc:
        return build_stage("Wiktionary", started_at, ok=False, url=url, error=str(exc))


def fetch_priberam(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    url = f"https://dicionario.priberam.org/{quote(word)}"
    try:
        html_text, final_url, cache_hit = fetch_html(url)
        soup = BeautifulSoup(html_text, "html.parser")
        paragraphs = [clean_text(node.get_text(" ", strip=True)) for node in soup.select("p")]

        definitions: list[str] = []
        examples: list[str] = []
        etymology = None
        collecting = False

        for text in paragraphs:
            lowered = text.casefold()
            if lowered.startswith(("nome ", "substantivo ", "adjetivo ", "verbo ")):
                collecting = True
                continue
            if "etimologia" in lowered:
                etymology = text
            if collecting and re.match(r"^\d+\.", text):
                definitions.append(text)
            elif collecting and text and len(text) > 30 and not definitions:
                definitions.append(text)
            if "exemplo" in lowered or "ex.:" in lowered:
                examples.append(text)

        if not definitions:
            raise ValueError("nenhuma definicao extraida")

        return build_stage(
            "Priberam",
            started_at,
            ok=True,
            url=final_url,
            definitions=definitions[:10],
            etymology=etymology,
            examples=examples[:4],
            extra={"raw_paragraphs": len(paragraphs), "cache_hit": cache_hit},
        )
    except Exception as exc:
        return build_stage("Priberam", started_at, ok=False, url=url, error=str(exc))


def fetch_michaelis(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    url = f"https://michaelis.uol.com.br/busca?r=0&f=0&t=0&palavra={quote(word)}"
    try:
        html_text, final_url, cache_hit = fetch_html(url)
        soup = BeautifulSoup(html_text, "html.parser")
        entry = soup.select_one("div.verbete")
        if entry is None:
            raise ValueError("verbete principal nao encontrado")

        definitions: list[str] = []
        examples: list[str] = []
        synonyms: list[str] = []

        for node in entry.select("acn"):
            number = clean_text(node.get_text(" ", strip=True))
            parts: list[str] = []
            sibling = node.next_sibling
            while sibling:
                sibling_name = getattr(sibling, "name", None)
                if sibling_name == "acn":
                    break
                if sibling_name == "abt":
                    sample = clean_text(sibling.get_text(" ", strip=True))
                    if sample:
                        examples.append(sample)
                if sibling_name and hasattr(sibling, "get_text"):
                    text = clean_text(sibling.get_text(" ", strip=True))
                else:
                    text = clean_text(str(sibling))
                if text:
                    parts.append(text)
                sibling = sibling.next_sibling

            definition = clean_text(f"{number}. {' '.join(parts)}")
            definition = re.sub(r"\s+\.\s+", ". ", definition)
            if definition:
                definitions.append(definition)

        related = soup.select_one(".col-md-4, .col-lg-4")
        if related:
            related_text = clean_text(related.get_text(" ", strip=True))
            related_text = related_text.replace("Veja também", "").replace("Veja tambem", "")
            synonyms.extend(piece for piece in re.split(r"[,\s]+", related_text) if len(piece) > 2)

        if not definitions:
            raise ValueError("nenhuma definicao extraida")

        return build_stage(
            "Michaelis",
            started_at,
            ok=True,
            url=final_url,
            definitions=definitions[:10],
            synonyms=synonyms[:10],
            examples=examples[:4],
            extra={"cache_hit": cache_hit},
        )
    except Exception as exc:
        return build_stage("Michaelis", started_at, ok=False, url=url, error=str(exc))


def fetch_with_accent_fallback(source_fetcher: Callable[[str], dict[str, Any]], word: str) -> dict[str, Any]:
    primary = copy.deepcopy(source_fetcher(word))
    accentless = strip_accents(word)

    if accentless == word:
        primary["extra"]["query_term"] = word
        primary["extra"]["retry_without_accents"] = False
        return primary

    if primary["ok"] and primary["data"]["definitions"]:
        primary["extra"]["query_term"] = word
        primary["extra"]["retry_without_accents"] = False
        return primary

    retry = copy.deepcopy(source_fetcher(accentless))
    retry["extra"]["query_term"] = accentless
    retry["extra"]["retry_without_accents"] = True
    retry["extra"]["original_term"] = word
    retry["extra"]["first_attempt"] = {
        "ok": primary["ok"],
        "error": primary["error"],
        "definition_count": primary["data"]["definition_count"],
        "url": primary["url"],
    }

    if retry["ok"] and retry["data"]["definitions"]:
        retry["extra"]["resolved_with_accent_fallback"] = True
        return retry

    primary["extra"]["query_term"] = word
    primary["extra"]["retry_without_accents"] = True
    primary["extra"]["accentless_term"] = accentless
    primary["extra"]["fallback_attempt"] = {
        "ok": retry["ok"],
        "error": retry["error"],
        "definition_count": retry["data"]["definition_count"],
        "url": retry["url"],
    }
    return primary


def source_priority(source: str) -> int:
    try:
        return SOURCE_PRECEDENCE.index(source)
    except ValueError:
        return len(SOURCE_PRECEDENCE)


def order_stages(stages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(stages, key=lambda stage: (source_priority(stage["source"]), stage["source"]))


def normalize_payload(word: str, stages: list[dict[str, Any]]) -> dict[str, Any]:
    ordered_stages = order_stages(stages)
    working = [stage for stage in ordered_stages if stage["ok"]]

    definitions: list[str] = []
    synonyms: list[str] = []
    examples: list[str] = []
    etymology = None

    for stage in working:
        definitions.extend(stage["data"]["definitions"])
        synonyms.extend(stage["data"]["synonyms"])
        examples.extend(stage["data"]["examples"])
        if not etymology and stage["data"]["etymology"]:
            etymology = stage["data"]["etymology"]

    definitions = dedupe(definitions)
    synonyms = dedupe(synonyms)
    examples = dedupe(examples)
    return {
        "term": word,
        "lang": "pt-BR",
        "summary": {
            "definitions": definitions[:12],
            "synonyms": synonyms[:14],
            "examples": examples[:6],
            "etymology": etymology,
        },
        "sources_ok": [stage["source"] for stage in working],
        "sources_failed": [stage["source"] for stage in ordered_stages if not stage["ok"]],
    }


def run_lexical_pipeline(word: str) -> dict[str, Any]:
    started_at = time.perf_counter()
    pipeline = [
        fetch_with_accent_fallback(fetch_aulete, word),
        fetch_with_accent_fallback(fetch_priberam, word),
        fetch_with_accent_fallback(fetch_michaelis, word),
        fetch_with_accent_fallback(fetch_wiktionary, word),
        fetch_with_accent_fallback(fetch_dicio, word),
    ]
    pipeline = order_stages(pipeline)
    normalized = normalize_payload(word, pipeline)
    ok_count = sum(1 for stage in pipeline if stage["ok"])
    accent_retry_count = sum(1 for stage in pipeline if stage["extra"].get("retry_without_accents"))

    return {
        "input": {
            "term": word,
            "normalized_term": word.casefold(),
            "accentless_term": strip_accents(word),
        },
        "pipeline": pipeline,
        "result": normalized,
        "debug": {
            "sources_total": len(pipeline),
            "sources_ok": ok_count,
            "sources_failed": len(pipeline) - ok_count,
            "elapsed_ms": round((time.perf_counter() - started_at) * 1000, 1),
            "fallback_used": ok_count < len(pipeline),
            "accent_retry_count": accent_retry_count,
            "cache": {
                "html_cache": fetch_html_cached.cache_info()._asdict(),
            },
            "source_details": [
                {
                    "source": stage["source"],
                    "ok": stage["ok"],
                    "accent_retry": bool(stage["extra"].get("retry_without_accents")),
                    "query_term": stage["extra"].get("query_term", word),
                    "definition_count": stage["data"]["definition_count"],
                }
                for stage in pipeline
            ],
        },
    }


@app.get("/", response_class=FileResponse)
def home() -> dict[str, Any]:
    return {
        "status": "ok",
        "message": "external_dictionary.py carregado como modulo do backend atual.",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "html_cache": fetch_html_cached.cache_info()._asdict(),
    }


@app.get("/lexico")
def lexico(palavra: str = Query(..., min_length=1, max_length=80)) -> dict[str, Any]:
    word = clean_text(palavra)
    if not word:
        raise ValueError("Parametro 'palavra' e obrigatorio.")
    if len(word) > 80:
        raise ValueError("Parametro 'palavra' deve ter no maximo 80 caracteres.")
    return run_lexical_pipeline(word)


@app.get("/analogico")
def analogico(palavra: str = Query(..., min_length=1, max_length=80)) -> dict[str, Any]:
    word = clean_text(palavra)
    if not word:
        raise ValueError("Parametro 'palavra' e obrigatorio.")
    if len(word) > 80:
        raise ValueError("Parametro 'palavra' deve ter no maximo 80 caracteres.")
    return fetch_analogico_aulete(word)


@app.get("/etimologia")
def etimologia(palavra: str = Query(..., min_length=1, max_length=80)) -> dict[str, Any]:
    word = clean_text(palavra)
    if not word:
        raise ValueError("Parametro 'palavra' e obrigatorio.")
    if len(word) > 80:
        raise ValueError("Parametro 'palavra' deve ter no maximo 80 caracteres.")
    return fetch_etimologia_dicionario_etimologico(word)
