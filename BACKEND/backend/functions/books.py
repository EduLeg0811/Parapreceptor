from __future__ import annotations

from pathlib import Path
from datetime import date
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from typing import Any


def _resolve_biblio_workbook(root: Path, filename: str) -> Path:
    preferred = root / "Files" / "Biblio" / filename
    if preferred.exists():
        return preferred
    return root / "Files" / filename

# CONFIG RAPIDA (ref_biblio)
# Sufixo anexado ao final da resposta "Bibliografia de Verbetes" (ref_biblio).
# Facil de localizar: procure por SUFIXO_BIBLIO_VERBETE neste arquivo.
SUFIXO_BIBLIO_VERBETE = "verbete; *In*: **Vieira**, Waldo; Org.; ***Enciclopédia da Conscienciologia***; vol. digital único (PDF); CCXL + 34.372 p.; 10a Ed. rev. e aum.; *Associação Internacional de Enciclopediologia Conscienciológica* (ENCYCLOSSAPIENS); & *Associação Internacional Editares*; Foz do Iguaçu, PR; 2023."
# Sufixo especifico para grupo de ref_biblio com data posterior a 06.12.2023.
# Facil de localizar: procure por SUFIXO_BIBLIO_VERBETE_NEW neste arquivo.
SUFIXO_BIBLIO_VERBETE_NEW = "verbete; *In*: **Vieira**, Waldo; Org.; ***Enciclopédia da Conscienciologia***; defendido no *Tertuliarium* do *Centro de Altos Estudos da Conscienciologia* (CEAEC); Foz do Iguaçu, PR; disponível em: <https://encyclossapiens.space/buscaverbete>; acesso em: "


def _norm(text: str) -> str:
    clean = unicodedata.normalize("NFKD", (text or "").strip().lower())
    clean = "".join(ch for ch in clean if not unicodedata.combining(ch))
    # Remove ruido de encoding/caracteres estranhos para estabilizar matching.
    clean = re.sub(r"[^a-z0-9\s\-\(\)\.]", " ", clean)
    clean = re.sub(r"\s+", " ", clean)
    return clean


def _col_to_index(col_ref: str) -> int:
    col = "".join(ch for ch in col_ref if ch.isalpha()).upper()
    idx = 0
    for ch in col:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx - 1


def _read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    path = "xl/sharedStrings.xml"
    if path not in zf.namelist():
        return []
    root = ET.fromstring(zf.read(path))
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values: list[str] = []
    for si in root.findall("x:si", ns):
        texts = [t.text or "" for t in si.findall(".//x:t", ns)]
        values.append("".join(texts))
    return values


def _read_books_table(xlsx_path: Path) -> list[dict[str, str]]:
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    rows_out: list[dict[str, str]] = []

    with zipfile.ZipFile(xlsx_path, "r") as zf:
        shared = _read_shared_strings(zf)
        sheet_path = "xl/worksheets/sheet1.xml"
        if sheet_path not in zf.namelist():
            return rows_out

        root = ET.fromstring(zf.read(sheet_path))
        header: list[str] = []

        for row in root.findall(".//x:sheetData/x:row", ns):
            cells: dict[int, str] = {}
            for c in row.findall("x:c", ns):
                ref = c.attrib.get("r", "")
                idx = _col_to_index(ref) if ref else len(cells)
                c_type = c.attrib.get("t", "")
                value = ""

                if c_type == "inlineStr":
                    t = c.find("x:is/x:t", ns)
                    value = t.text if t is not None and t.text is not None else ""
                else:
                    v = c.find("x:v", ns)
                    raw = v.text if v is not None and v.text is not None else ""
                    if c_type == "s" and raw.isdigit():
                        s_idx = int(raw)
                        value = shared[s_idx] if 0 <= s_idx < len(shared) else ""
                    else:
                        value = raw

                cells[idx] = value.strip()

            if not cells:
                continue

            max_idx = max(cells)
            row_vals = [cells.get(i, "") for i in range(max_idx + 1)]

            if not header:
                header = [_norm(v) for v in row_vals]
                continue

            row_dict: dict[str, str] = {}
            for i, key in enumerate(header):
                if key:
                    row_dict[key] = row_vals[i] if i < len(row_vals) else ""
            rows_out.append(row_dict)

    return rows_out


def bookName(book: str) -> str:
    code = _norm(book).upper().replace(" ", "")

    # Tabela final de codigos (interno) -> nome por extenso.
    code_to_title = {
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
        # Canonicos para codigo unico.
        "LO": "Lexico de Ortopensatas (2a ed.)",
        "EC": "Enciclopedia da Conscienciologia (10 ed.)",
    }

    if code in code_to_title:
        return code_to_title[code]

    # Compatibilidade: se vier nome antigo, tenta mapear por aproximacao.
    raw = _norm(book)
    if "projec" in raw and "consc" in raw:
        return code_to_title["PC"]
    if "projeciologia" in raw:
        return code_to_title["PROJ"]
    if "700" in raw and "experimentos" in raw:
        return code_to_title["EXP"]
    if "conscienciograma" in raw:
        return code_to_title["CCG"]
    if "tenepes" in raw:
        return code_to_title["TNP"]
    if "proex" in raw:
        return code_to_title["MP"]
    if "dupla" in raw and "evolutiva" in raw:
        return code_to_title["MDE"]
    if "redac" in raw:
        return code_to_title["MRC"]
    if "megapensenes" in raw:
        return code_to_title["MMT"]
    if "temas" in raw and "conscienciologia" in raw:
        return code_to_title["TC"]
    if "200" in raw and "teat" in raw:
        return code_to_title["TEAT"]
    if "nossa" in raw and "evolu" in raw:
        return code_to_title["NE"]
    if "reurbanisatus" in raw or raw.endswith("hsr"):
        return code_to_title["HSR"]
    if "pacificus" in raw or raw.endswith("hsp"):
        return code_to_title["HSP"]
    if "neolog" in raw:
        return code_to_title["DNC"]
    if "argument" in raw and "dicion" in raw:
        return code_to_title["DAC"]
    if "lexico" in raw and "ortopensatas" in raw:
        return code_to_title["LO"]
    if "enciclop" in raw:
        return code_to_title["EC"]

    return "Livro nao identificado"


def find_book_reference_by_mode(book: str, mode: str = "bee", xlsx_path: Path | None = None) -> str:
    title = bookName(book)
    if title == "Livro nao identificado":
        raise ValueError(f"Livro nao identificado: {book}")
    selected_mode = (mode or "bee").strip().lower()
    if selected_mode not in {"bee", "simples"}:
        raise ValueError("Modo invalido. Use 'bee' ou 'simples'.")

    root = Path(__file__).resolve().parents[1]
    workbook = xlsx_path or _resolve_biblio_workbook(root, "BooksWV.xlsx")
    if not workbook.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {workbook}")

    wanted = _norm(title)
    rows = _read_books_table(workbook)

    for row in rows:
        row_title = _norm(row.get("titulo", ""))
        if row_title == wanted:
            reference = row.get(selected_mode, "").strip()
            if reference:
                return reference
            raise ValueError(f"Livro encontrado sem conteudo na coluna '{selected_mode}': {title}")

    partial_matches: list[dict[str, str]] = []
    for row in rows:
        row_title = _norm(row.get("titulo", ""))
        if not row_title:
            continue
        if wanted in row_title or row_title in wanted:
            partial_matches.append(row)

    if partial_matches:
        raw_book = _norm(book)
        if "1a ed" in raw_book:
            partial_matches.sort(key=lambda r: int((r.get("ano") or "0").strip() or "0"))
        elif "2a ed" in raw_book:
            partial_matches.sort(key=lambda r: int((r.get("ano") or "0").strip() or "0"), reverse=True)

        picked = partial_matches[0]
        reference = (picked.get(selected_mode) or "").strip()
        if reference:
            return reference
        raise ValueError(f"Livro encontrado sem conteudo na coluna '{selected_mode}': {picked.get('titulo') or title}")

    raise ValueError(f"Titulo nao encontrado na planilha: {title}")


def find_simple_by_book(book: str, xlsx_path: Path | None = None) -> str:
    return find_book_reference_by_mode(book, mode="simples", xlsx_path=xlsx_path)


def find_refs_by_titles(titles: list[str], xlsx_path: Path | None = None) -> dict[str, str]:
    cutoff_new_ref_biblio = date(2023, 12, 6)

    clean_titles = [t.strip() for t in titles if (t or "").strip()]
    if not clean_titles:
        raise ValueError("Informe ao menos um verbete.")

    deduped_titles: list[str] = []
    seen_titles: set[str] = set()
    for item in clean_titles:
        key = _norm(item)
        if not key or key in seen_titles:
            continue
        seen_titles.add(key)
        deduped_titles.append(item)

    root = Path(__file__).resolve().parents[1]
    workbook = xlsx_path or _resolve_biblio_workbook(root, "EC.xlsx")
    if not workbook.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {workbook}")

    rows = _read_books_table(workbook)
    if not rows:
        return {"ref_list": "", "ref_biblio": ""}

    by_title: dict[str, dict[str, str]] = {}
    for row in rows:
        norm_title = _norm(row.get("titulo", ""))
        if norm_title and norm_title not in by_title:
            by_title[norm_title] = row

    items: list[dict[str, Any]] = []

    def _row_get(row: dict[str, str], *keys: str) -> str:
        for key in keys:
            value = row.get(key)
            if value is not None:
                return str(value)
        return ""

    def _extract_number_from_text(text: str) -> int | None:
        m = re.search(r"\bn\.\s*(\d+)\b", text or "", flags=re.IGNORECASE)
        if m:
            return int(m.group(1))
        return None

    def _extract_number(row: dict[str, str]) -> int | None:
        raw_number = _row_get(row, "numero", "number").strip()
        if raw_number.isdigit():
            return int(raw_number)
        return _extract_number_from_text(
            _row_get(row, "ref_list", "ref list") + "\n" + _row_get(row, "ref_biblio", "ref biblio")
        )

    def _extract_author_prefix(ref_biblio_value: str) -> str | None:
        m = re.match(r"^\s*(\*\*[^*]+\*\*,\s*[^;]+);\s*", ref_biblio_value or "")
        if m:
            return m.group(1).strip()
        return None

    def _extract_title_block(ref_biblio_value: str) -> str | None:
        m = re.search(r"(\*\*\*[\s\S]*?\*\*\*\s*\(n\.\s*\d+[\s\S]*?\))", ref_biblio_value or "", flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
        return None

    def _extract_br_date_from_text(text: str) -> date | None:
        m = re.search(r"\b(\d{2})\.(\d{2})\.(\d{4})\b", text or "")
        if not m:
            return None
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            return None

    def _append_suffix(line: str, suffix: str) -> str:
        base = (line or "").strip()
        sfx = (suffix or "").strip()
        if not base:
            return sfx
        if not sfx:
            return base
        return f"{base}; {sfx}"

    def _quantified_suffix(suffix: str, refs_count: int) -> str:
        sfx = (suffix or "").strip()
        if not sfx:
            return sfx
        target_word = "verbetes" if refs_count > 1 else "verbete"
        if re.match(r"^\s*verbetes?\b", sfx, flags=re.IGNORECASE):
            return re.sub(r"^\s*verbetes?\b", target_word, sfx, count=1, flags=re.IGNORECASE)
        return f"{target_word}; {sfx}"

    for requested in deduped_titles:
        norm_requested = _norm(requested)
        if not norm_requested:
            continue

        matched = by_title.get(norm_requested)
        if not matched:
            for norm_title, row in by_title.items():
                if norm_requested in norm_title or norm_title in norm_requested:
                    matched = row
                    break

        if matched:
            ref_list_value = _row_get(matched, "ref_list", "ref list").strip()
            ref_biblio_value = _row_get(matched, "ref_biblio", "ref biblio").strip()
            items.append({
                "input": requested,
                "number": _extract_number(matched),
                "ref_list": ref_list_value or f"**{requested}**: sem conteudo em `ref_list`.",
                "ref_biblio": ref_biblio_value or f"**{requested}**: sem conteudo em `ref_biblio`.",
                "author_prefix": _extract_author_prefix(ref_biblio_value),
                "title_block": _extract_title_block(ref_biblio_value),
            })
        else:
            items.append({
                "input": requested,
                "number": None,
                "ref_list": f"**{requested}**: verbete nao encontrado.",
                "ref_biblio": f"**{requested}**: verbete nao encontrado.",
                "author_prefix": None,
                "title_block": None,
            })

    indexed_items = list(enumerate(items))
    indexed_items.sort(key=lambda pair: (pair[1]["number"] is None, pair[1]["number"] if pair[1]["number"] is not None else 0, pair[0]))
    sorted_items = [item for _, item in indexed_items]

    new_ref_biblio_items: list[dict[str, Any]] = []
    regular_items: list[dict[str, Any]] = []
    for item in sorted_items:
        item_date = _extract_br_date_from_text(item.get("ref_biblio") or "")
        if item_date and item_date > cutoff_new_ref_biblio:
            new_ref_biblio_items.append(item)
        else:
            regular_items.append(item)

    biblio_groups: list[str] = []
    group_order: list[str] = []
    grouped_titles: dict[str, list[str]] = {}
    grouped_fallback_lines: dict[str, list[str]] = {}

    for item in regular_items:
        author_prefix = item.get("author_prefix")
        title_block = item.get("title_block")
        if author_prefix and title_block:
            if author_prefix not in grouped_titles:
                grouped_titles[author_prefix] = []
                group_order.append(author_prefix)
            grouped_titles[author_prefix].append(title_block)
        else:
            key = f"__fallback__{len(grouped_fallback_lines)}"
            grouped_fallback_lines[key] = [item["ref_biblio"]]
            group_order.append(key)

    for key in group_order:
        if key.startswith("__fallback__"):
            biblio_groups.extend(grouped_fallback_lines.get(key, []))
            continue
        titles = grouped_titles.get(key, [])
        titles_joined = "; ".join(titles)
        suffix = _quantified_suffix(SUFIXO_BIBLIO_VERBETE, len(titles))
        biblio_groups.append(_append_suffix(f"{key}; {titles_joined}", suffix))

    # Regras para ref_biblio com data posterior a 06.12.2023:
    # - consolidar por autor (mesma regra dos anteriores)
    # - manter ordem crescente pelo numero (ja garantida por sorted_items/new_ref_biblio_items)
    # - aplicar sufixo proprio SUFIXO_BIBLIO_VERBETE_NEW
    if new_ref_biblio_items:
        new_group_order: list[str] = []
        new_grouped_titles: dict[str, list[str]] = {}
        new_grouped_fallback_lines: dict[str, list[str]] = {}

        for item in new_ref_biblio_items:
            author_prefix = item.get("author_prefix")
            title_block = item.get("title_block")
            if author_prefix and title_block:
                if author_prefix not in new_grouped_titles:
                    new_grouped_titles[author_prefix] = []
                    new_group_order.append(author_prefix)
                new_grouped_titles[author_prefix].append(title_block)
            else:
                key = f"__new_fallback__{len(new_grouped_fallback_lines)}"
                new_grouped_fallback_lines[key] = [item["ref_biblio"]]
                new_group_order.append(key)

        new_lines: list[str] = []
        for key in new_group_order:
            if key.startswith("__new_fallback__"):
                new_lines.extend(new_grouped_fallback_lines.get(key, []))
                continue
            titles = new_grouped_titles.get(key, [])
            titles_joined = "; ".join(titles)
            suffix = _quantified_suffix(SUFIXO_BIBLIO_VERBETE_NEW, len(titles))
            new_lines.append(_append_suffix(f"{key}; {titles_joined}", suffix))

        biblio_groups.extend(line for line in new_lines if (line or "").strip())

    ref_list_final = "\n\n".join(item["ref_list"] for item in sorted_items)
    ref_biblio_final = "\n\n".join(biblio_groups)

    return {
        "ref_list": ref_list_final,
        "ref_biblio": ref_biblio_final,
    }
