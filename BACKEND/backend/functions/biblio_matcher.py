import re
import unicodedata
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional

import pandas as pd


# =========================================================
# Normalização
# =========================================================

_WORD_RE = re.compile(r"[a-z0-9]+")
TITLE_STOPWORDS = {
    "a", "as", "o", "os", "de", "do", "da", "dos", "das", "e", "em", "no", "na", "nos", "nas", "um", "uma",
}


def normalize_text(text: Optional[str]) -> str:
    """
    Lowercase + remove acentos + remove pontuação + normaliza espaços.
    """

    if text is None:
        return ""

    text = str(text).strip().lower()

    if not text:
        return ""

    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))

    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def tokenize(text: Optional[str]) -> List[str]:
    return _WORD_RE.findall(normalize_text(text))


# =========================================================
# Similaridades heurísticas
# =========================================================

def seq_ratio(a: str, b: str) -> float:

    a = normalize_text(a)
    b = normalize_text(b)

    if not a or not b:
        return 0.0

    return SequenceMatcher(None, a, b).ratio()


def whole_word_overlap_score(query: str, candidate: str) -> float:

    q_tokens = tokenize(query)
    c_tokens = set(tokenize(candidate))

    if not q_tokens:
        return 0.0

    hits = sum(1 for t in q_tokens if t in c_tokens)

    return hits / len(q_tokens)


def partial_token_score(query: str, candidate: str) -> float:

    q_tokens = tokenize(query)
    candidate_norm = normalize_text(candidate)

    if not q_tokens or not candidate_norm:
        return 0.0

    hits = sum(1 for t in q_tokens if t in candidate_norm)

    return hits / len(q_tokens)


def fuzzy_token_recall_score(query: str, candidate: str, min_ratio: float = 0.82) -> float:
    """
    Mede cobertura dos tokens da query por melhor token do candidato (fuzzy).
    Funciona melhor para typos leves em autor/titulo.
    """
    q_tokens = tokenize(query)
    c_tokens = tokenize(candidate)
    if not q_tokens or not c_tokens:
        return 0.0

    hits = 0.0
    for qt in q_tokens:
        best = 0.0
        for ct in c_tokens:
            ratio = SequenceMatcher(None, qt, ct).ratio()
            if ratio > best:
                best = ratio
            if best >= 1.0:
                break
        if best >= min_ratio:
            hits += 1.0
        else:
            # crédito parcial para similaridade quase correta
            hits += best * 0.5
    return hits / len(q_tokens)


def author_last_name_score(query_author: str, candidate_author: str) -> float:
    """
    Valoriza coincidência do sobrenome principal.
    """
    q_tokens = tokenize(query_author)
    c_tokens = set(tokenize(candidate_author))
    if not q_tokens or not c_tokens:
        return 0.0
    q_last = q_tokens[-1]
    if q_last in c_tokens:
        return 1.0
    best = max((SequenceMatcher(None, q_last, ct).ratio() for ct in c_tokens), default=0.0)
    return best if best >= 0.85 else 0.0


def year_score(query_year: str, candidate_year) -> float:
    """
    Score de proximidade de ano.
    """

    q = normalize_text(query_year)
    q = re.sub(r"[^0-9]", "", q)

    if not q:
        return 0.0

    try:
        q_val = int(q)
    except ValueError:
        return 0.0

    try:
        if pd.isna(candidate_year):
            return 0.0

        c_val = int(float(candidate_year))
    except Exception:
        return 0.0

    if q_val == c_val:
        return 1.0

    if abs(q_val - c_val) == 1:
        return 0.6

    if abs(q_val - c_val) <= 3:
        return 0.3

    return 0.0


def field_score(query: str, candidate: str) -> float:
    """
    Combina similaridade global + palavra inteira + parcial.
    """

    if not query or not str(query).strip():
        return 0.0

    s_seq = seq_ratio(query, candidate)
    s_whole = whole_word_overlap_score(query, candidate)
    s_part = partial_token_score(query, candidate)

    return max(
        s_seq,
        0.70 * s_whole + 0.30 * s_seq,
        0.55 * s_whole + 0.25 * s_seq + 0.20 * s_part
    )


def title_score(query: str, candidate: str) -> float:
    if not query or not str(query).strip():
        return 0.0
    base = field_score(query, candidate)
    fuzzy = fuzzy_token_recall_score(query, candidate, min_ratio=0.80)

    # ignora stopwords para um sinal de precisão lexical
    q_tokens = [t for t in tokenize(query) if t not in TITLE_STOPWORDS]
    c_tokens = set(tokenize(candidate))
    exact_hits = sum(1 for t in q_tokens if t in c_tokens)
    lexical = (exact_hits / len(q_tokens)) if q_tokens else 0.0
    return 0.55 * base + 0.35 * fuzzy + 0.10 * lexical


def author_score(query: str, candidate: str) -> float:
    if not query or not str(query).strip():
        return 0.0
    base = field_score(query, candidate)
    fuzzy = fuzzy_token_recall_score(query, candidate, min_ratio=0.84)
    lname = author_last_name_score(query, candidate)
    return 0.50 * base + 0.30 * fuzzy + 0.20 * lname


# =========================================================
# Penalizações
# =========================================================

def apply_author_penalty(
    score: float,
    author_score: float,
    title_score: float,
    author_query: str,
    factor: float
) -> float:
    """
    Penaliza quando título bate forte e autor não.
    """

    if not author_query.strip():
        return score

    TITLE_STRONG = 0.70
    AUTHOR_WEAK = 0.30

    if title_score >= TITLE_STRONG and author_score <= AUTHOR_WEAK:

        penalty = (1 - author_score) * factor
        score -= penalty

    return max(score, 0.0)


def apply_year_penalty(
    score: float,
    year_score_value: float,
    year_query: str,
    factor: float,
    author_score_value: float = 0.0,
    title_score_value: float = 0.0,
) -> float:
    """
    Penaliza quando ano foi informado e não bateu.
    """

    if not year_query.strip():
        return score

    if year_score_value == 0:
        confidence = max(author_score_value, title_score_value)
        score -= factor * (1.0 + 0.5 * confidence)

    return max(score, 0.0)


# =========================================================
# Score total ponderado
# =========================================================

def total_score(
    q_author,
    q_title,
    q_year,
    q_extra,
    row,
    use_author_penalty=True,
    author_penalty_factor=0.25,
    use_year_penalty=True,
    year_penalty_factor=0.15
):
    base_weights = {
        "author": 0.55,
        "title": 0.30,
        "year": 0.12,
        "extra": 0.03,
    }
    present = {
        "title": bool(str(q_title).strip()),
        "author": bool(str(q_author).strip()),
        "year": bool(str(q_year).strip()),
        "extra": bool(str(q_extra).strip()),
    }
    active_total = sum(w for k, w in base_weights.items() if present[k])
    if active_total <= 0:
        return 0.0
    weights = {k: (base_weights[k] / active_total if present[k] else 0.0) for k in base_weights}

    s_title = title_score(q_title, row.get("titulo", ""))
    s_author = author_score(q_author, row.get("autor", ""))
    s_year = year_score(q_year, row.get("ano"))
    s_extra = field_score(q_extra, row.get("extra", ""))

    score = (
        weights["title"] * s_title
        + weights["author"] * s_author
        + weights["year"] * s_year
        + weights["extra"] * s_extra
    )

    # Penalizações
    if use_author_penalty:
        score = apply_author_penalty(
            score,
            s_author,
            s_title,
            q_author,
            author_penalty_factor
        )

    if use_year_penalty:
        score = apply_year_penalty(
            score,
            s_year,
            q_year,
            year_penalty_factor,
            s_author,
            s_title,
        )

    return score


# =========================================================
# Classe Matcher
# =========================================================

class BibliographyMatcher:

    REQUIRED_COLS = ["autor", "titulo", "tipo", "extra", "ano", "ref"]

    def __init__(self, excel_path: str):
        self.df = self._load_excel(excel_path)

    def _load_excel(self, path: str) -> pd.DataFrame:

        df = pd.read_excel(path)
        df.columns = [str(c).strip().lower() for c in df.columns]

        missing = [c for c in self.REQUIRED_COLS if c not in df.columns]

        if missing:
            raise ValueError(
                f"Colunas ausentes: {missing}. Esperado: {self.REQUIRED_COLS}"
            )

        for c in ["autor", "titulo", "tipo", "extra", "ref"]:
            df[c] = df[c].fillna("").astype(str)

        return df

    # =====================================================
    # FUNÇÃO PRINCIPAL
    # =====================================================

    def search(
        self,
        author: str = "",
        title: str = "",
        year: str = "",
        extra: str = "",
        top_k: int = 10,
        use_author_penalty: bool = True,
        author_penalty_factor: float = 0.25,
        use_year_penalty: bool = True,
        year_penalty_factor: float = 0.15
    ) -> List[Dict[str, Any]]:
        """
        Busca bibliográfica heurística com:
        - Prioridade para livros
        - Penalização opcional de autor
        - Penalização opcional de ano
        """

        matches = []

        for _, row in self.df.iterrows():

            sc = total_score(
                author,
                title,
                year,
                extra,
                row,
                use_author_penalty,
                author_penalty_factor,
                use_year_penalty,
                year_penalty_factor
            )

            if sc <= 0.03:
                continue

            tipo_norm = normalize_text(row.get("tipo", ""))
            is_book = 1 if tipo_norm == "livro" else 0

            matches.append({
                "score": round(sc, 4),
                "is_book": is_book,
                "ref": row.get("ref", "")
            })

        # Ordenação hierárquica
        BOOK_BOOST = 0.08

        for m in matches:
            m["score"] += m["is_book"] * BOOK_BOOST

        matches.sort(
            key=lambda x: x["score"],
            reverse=True
        )

        return matches[:top_k]


def search_bibliography(
    excel_path: str,
    author: str = "",
    title: str = "",
    year: str = "",
    extra: str = "",
    top_k: int = 10,
) -> List[Dict[str, Any]]:
    matcher = BibliographyMatcher(excel_path=excel_path)
    return matcher.search(author=author, title=title, year=year, extra=extra, top_k=top_k)
