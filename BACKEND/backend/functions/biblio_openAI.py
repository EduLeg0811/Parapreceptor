import os
import re
import json
import requests
from pathlib import Path
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import List, Optional, Dict, Tuple


# ============================================================
# MODELOS
# ============================================================

@dataclass
class Autor:
    sobrenome: str
    nome: str


@dataclass
class Bibliografia:
    autores: List[Autor]
    titulo: str
    ano: str
    editora: Optional[str]
    local: Optional[str]
    paginas_totais: Optional[str]
    revista: Optional[str]
    tipo: str  # "livro" ou "artigo"


# ============================================================
# SERVIÇO PRINCIPAL
# ============================================================


PROMPTS_DIR = Path(__file__).resolve().parents[2] / "shared" / "prompts"
SYSTEM_PROMPT_TEXTO_LIVRE = (PROMPTS_DIR / "biblio_externa_system_prompt.txt").read_text(encoding="utf-8").strip()











SYSTEM_PROMPT_TEXTO_LIVRE_Backup = """
Você é um assistente especializado em identificação bibliográfica e reconstrução de referências completas a partir de strings livres, incompletas ou desordenadas.
Receberá uma string bibliográfica não estruturada. Essa string pode conter qualquer combinação de informações, como: nome de autor, parte do título, ano, editora, cidade, páginas, idioma, tipo de obra ou outros fragmentos textuais. A ordem dos elementos pode estar incorreta, incompleta ou conter erros de digitação.
Seu objetivo é identificar a obra mais provável e reconstruir sua referência bibliográfica.

Procedimento geral

1. Interpretação da string

Analise a string recebida e extraia possíveis pistas bibliográficas, como:
- autor(es)
- título ou parte do título
- ano
- editora
- cidade
- páginas
- idioma
- tipo de obra

Ignore palavras irrelevantes ou ruído textual.

2. Identificação da obra

Utilize as pistas extraídas para localizar a obra mais provável em bases bibliográficas reconhecidas, por exemplo:
- catálogos editoriais
- Google Books
- WorldCat
- CrossRef
- bases acadêmicas
- bibliotecas universitárias
- IMDb (para filmes)

3. Critério mínimo de identificação

Identifique uma obra apenas quando houver evidência suficiente, como:

- coincidência de autor + parte significativa do título
ou
- coincidência de título + ano aproximado
ou
- coincidência de autor + editora ou contexto temático

Se a correspondência for baseada apenas em fragmentos muito genéricos, não identifique.

Nesse caso responda exatamente:

NÃO IDENTIFICADO

4. Desambiguação

Se múltiplas obras possíveis forem encontradas, aplique os seguintes critérios de prioridade:

1. maior correspondência de título
2. coincidência de autor
3. proximidade do ano
4. coincidência de editora
5. relevância bibliográfica da obra

Se ainda houver ambiguidade significativa, responda:

NÃO IDENTIFICADO

5. Número de resultados

Se apenas uma obra corresponder claramente, retorne apenas essa referência.

Se houver múltiplas correspondências plausíveis, retorne no máximo três referências prováveis.

As referências devem ser apresentadas em ordem decrescente de confiança (da mais provável para a menos provável).

6. Determinação do tipo de obra

Classifique a obra como um dos seguintes tipos documentais:

livro; artigo científico; capítulo de livro; site; página web; filme; tese; dissertação; relatório; outro tipo documental.

7. Completação dos dados

Quando disponíveis, inclua:

- tipo de encadernação (brochura, capa dura etc.)
- número total de páginas
- número da edição
- editora
- cidade
- estado ou país
- ano de publicação

Não invente dados inexistentes.

Se algum dado não puder ser confirmado, omita completamente o campo correspondente e também o delimitador associado no formato final.

Não utilize placeholders, colchetes, traços ou expressões como “desconhecido” ou “não informado”.

Normalização dos autores

Formate cada autor no padrão:

**Sobrenome**, Nome

Exemplo:

**Azevedo**, Eduardo

Em caso de múltiplos autores, liste-os na ordem canônica da obra e separe cada autor por "; ".

Normalização do título

O título deve ser reproduzido exatamente como publicado.

Não traduza o título.
Não resuma o título.
Não simplifique o título.

Mantenha subtítulos após dois pontos (:), quando existirem.

Formato obrigatório da resposta

Cada referência deve aparecer em uma linha separada e seguir exatamente esta ordem de campos:

autor(es); título da obra; tipo da obra; tipo de encadernação; número total de páginas; número da edição; editora; cidade, estado ou país; ano; páginas citadas.

Regras obrigatórias do formato final

- A resposta deve conter apenas as referências finais formatadas, sem explicações.
- Cada referência deve ocupar uma única linha.
- Os campos presentes devem ser separados por ponto e vírgula seguido de espaço.
- A ordem dos campos nunca deve ser alterada.
- Omitir completamente qualquer campo não confirmado, sem deixar delimitadores vazios.
- O campo de autor deve ser formatado como **Sobrenome**, Nome.
- Em múltiplos autores, repetir esse formato para cada autor.
- Apenas o sobrenome deve estar em negrito.
- O título da obra deve estar em negrito e itálico no formato ***título da obra***.
- Se o campo páginas citadas estiver presente, utilizar o formato: p. 12, 15, 50-60.
- Ordenar páginas citadas em ordem crescente.

Exemplo

Entrada:
Tocci Digital Systems Principles 2011

Saída:
**Tocci**, Ronald J.; ***Digital Systems: Principles and Applications***; livro; brochura; 912 p.; 11ª ed.; Pearson; Upper Saddle River, NJ; 2011.
""".strip()

class BibliografiaService:

    def __init__(
        self,
        api_key: Optional[str] = None,
        llm_model: Optional[str] = None,
        llm_temperature: Optional[float] = None,
        llm_max_output_tokens: Optional[int] = None,
        llm_gpt5_verbosity: Optional[str] = None,
        llm_gpt5_effort: Optional[str] = None,
        llm_system_prompt: Optional[str] = None,
    ):
        self.api_key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
        self.llm_model = (llm_model or "").strip() or None
        self.llm_temperature = llm_temperature
        self.llm_max_output_tokens = llm_max_output_tokens
        self.llm_gpt5_verbosity = (llm_gpt5_verbosity or "").strip() or None
        self.llm_gpt5_effort = (llm_gpt5_effort or "").strip() or None
        self.llm_system_prompt = (llm_system_prompt or "").strip() or None

        raw_max = (
            os.getenv("MAX_BILBLIO_RESULTS")
            or os.getenv("MAX_BIBLIO_RESULTS")
            or "5"
        ).strip()
        try:
            self.max_results = max(1, min(int(raw_max), 20))
        except ValueError:
            self.max_results = 5

        # Performance / limites internos
        raw_enrich = (os.getenv("MAX_LLM_ENRICH") or "3").strip()
        try:
            self.max_llm_enrich = max(0, min(int(raw_enrich), 8))
        except ValueError:
            self.max_llm_enrich = 3

        self._llm_cache: Dict[str, dict] = {}  # cache simples em memória (por processo)
        self._last_llm_log: Dict[str, object] | None = None
        self._llm_logs: List[Dict[str, object]] = []

    def _push_llm_log(self, request_payload: object, response_payload: object) -> None:
        log = {"request": request_payload, "response": response_payload}
        self._last_llm_log = log
        self._llm_logs.append(log)






    def identificar_por_texto_livre(self, free_text: str) -> Dict:
        texto = (free_text or "").strip()
        if not texto:
            raise ValueError("Campo 'Texto Livre' vazio.")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY não configurada.")

        try:
            try:
                from backend.functions.llm_gateway import execute_llm_request
            except Exception:
                from functions.llm_gateway import execute_llm_request


            final_system_prompt = self.llm_system_prompt or SYSTEM_PROMPT_TEXTO_LIVRE
            result = execute_llm_request(
                api_key=self.api_key,
                model=self.llm_model or "",
                messages=[{"role": "user", "content": texto}],
                system_prompt=final_system_prompt,
                temperature=self.llm_temperature if self.llm_temperature is not None else 0,
                max_output_tokens=self.llm_max_output_tokens if self.llm_max_output_tokens is not None else 1000,
                gpt5_effort=self.llm_gpt5_effort or "none",
                gpt5_verbosity=self.llm_gpt5_verbosity or "low",
                tools=[{"type": "web_search"}],
                vector_store_ids=[],
                timeout=60,
                previous_response_id=None,
            )
            self._push_llm_log(result.get("request"), result.get("raw"))
        except requests.HTTPError as exc:
            response = exc.response
            detail = ((response.text if response is not None else "") or "").strip() or str(exc)
            raise RuntimeError(f"Falha na consulta LLM por Texto Livre: {detail}")
        except Exception as exc:
            raise RuntimeError(f"Falha na consulta LLM por Texto Livre: {exc}")

        referencia = str(result.get("content") or "").strip()
        if not referencia:
            referencia = "NÃO IDENTIFICADO"
        return {
            "referencia": referencia,
            "matches": [referencia],
            "max_results": 1,
            "score": None,
            "llm_log": self._last_llm_log,
            "llm_logs": self._llm_logs,
        }




    # ============================================================
    # DETECÇÃO AUTOMÁTICA LIVRO VS ARTIGO
    # ============================================================

    def _detectar_tipo(self, consulta: str) -> str:
        termos_artigo = ["doi", "issn", "journal", "revista", "article", "volume", "vol.", "n.", "issue"]
        cl = consulta.lower()
        return "artigo" if any(t in cl for t in termos_artigo) else "livro"

    def _detectar_tipo_campos(self, criterios: Dict[str, str], consulta: str) -> str:
        if (criterios.get("identifier") or "").strip():
            ident = (criterios.get("identifier") or "").lower()
            if "10." in ident or "doi" in ident or "issn" in ident:
                return "artigo"
            if "isbn" in ident:
                return "livro"
        if (criterios.get("journal") or "").strip():
            return "artigo"
        return self._detectar_tipo(consulta or "")

    # ============================================================
    # NORMALIZAÇÕES
    # ============================================================

    def _norm(self, s: str) -> str:
        s = (s or "").strip().lower()
        s = re.sub(r"\s+", " ", s)
        # remove pontuação leve para chaves
        s = re.sub(r"[^\w\sÀ-ÿ-]", "", s)
        return s

    def _richness_score(self, b: Bibliografia) -> float:
        s = 0.0
        if b.editora:
            s += 2.0
        if b.local:
            s += 1.2
        if b.paginas_totais:
            s += 1.5
        if b.revista:
            s += 1.0
        if self._ano_int(b.ano):
            s += 0.5
        if b.autores:
            s += 0.5
        return s

    def _normalize_title_for_score(self, s: str) -> str:
        t = self._norm(s or "")
        if not t:
            return ""
        # Remove artigos iniciais comuns para reduzir variações por idioma.
        t = re.sub(r"^(o|a|os|as|the|el|la|los|las|le|les|l)\s+", "", t)
        # Remove subtítulos comuns após delimitadores.
        t = re.split(r"\s*[:\-|]\s*", t)[0].strip()
        return t

    def _mediana(self, values: List[float]) -> float:
        vals = sorted(values)
        if not vals:
            return 0.0
        n = len(vals)
        mid = n // 2
        if n % 2 == 1:
            return vals[mid]
        return (vals[mid - 1] + vals[mid]) / 2.0

    def _ano_int(self, s: str) -> int:
        try:
            a = int((s or "").strip()[:4])
            if 1500 <= a <= 2100:
                return a
        except Exception:
            pass
        return 0

    def _tokens(self, s: str) -> List[str]:
        stop = {
            "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos",
            "the", "of", "el", "la", "los", "las", "un", "una", "y", "en",
        }
        txt = self._norm(s)
        toks = [t for t in re.split(r"\s+", txt) if t and t not in stop and len(t) > 1]
        return toks

    def _key_obra(self, b: Bibliografia) -> str:
        autor0 = self._norm(b.autores[0].sobrenome) if b.autores else ""
        titulo = self._norm(b.titulo)
        # chave de obra: autor principal + título “raiz”
        return f"{autor0}::{titulo}"

    def _filtrar_por_criterios_estritos(self, lista: List[Bibliografia], criterios: Dict[str, str]) -> List[Bibliografia]:
        c_author = (criterios.get("author") or "").strip()
        c_title = (criterios.get("title") or "").strip()
        if not c_author and not c_title:
            return lista

        author_tokens = self._tokens(c_author)
        title_tokens = self._tokens(c_title)
        blocking_terms = {
            "trivia", "summary", "resumo", "workbook", "guide", "guia",
            "analysis", "study", "comentado", "comentarios", "adaptação", "adaptacao",
        }

        def author_ok(b: Bibliografia) -> bool:
            if not author_tokens:
                return True
            surnames = [self._norm(a.sobrenome) for a in b.autores if (a.sobrenome or "").strip()]
            if not surnames:
                return False
            # Exige ao menos 1 sobrenome relevante do autor pesquisado.
            rel = [t for t in author_tokens if len(t) >= 3]
            if not rel:
                rel = author_tokens[-1:]
            for q in rel:
                for sn in surnames:
                    if q == sn or self._similaridade(q, sn) >= 0.86:
                        return True
            return False

        def title_ok(b: Bibliografia) -> bool:
            t = self._norm(b.titulo)
            if not t:
                return False
            if any(bt in t for bt in blocking_terms):
                return False
            if not title_tokens:
                return True
            cand_tokens = set(self._tokens(t))
            if not cand_tokens:
                return False
            overlap = sum(1 for tok in title_tokens if tok in cand_tokens)
            coverage = overlap / max(1, len(set(title_tokens)))
            # Exigência mais forte quando título foi informado.
            return coverage >= 0.6 or self._similaridade(t, self._norm(c_title)) >= 0.62

        filtered = [b for b in lista if author_ok(b) and title_ok(b)]
        if filtered:
            return filtered
        if c_title:
            return []
        if c_author:
            by_author = [b for b in lista if author_ok(b)]
            if by_author:
                return by_author
        return []

    # ============================================================
    # GOOGLE BOOKS (BUSCA AMPLA, MENOS RESTRITIVA)
    # ============================================================

    def _buscar_google_books(self, consulta: str, lang: Optional[str] = None) -> List[Bibliografia]:
        url = "https://www.googleapis.com/books/v1/volumes"

        # Busca ampla (sem intitle/inauthor rígidos), mas com printType books.
        params = {"q": consulta, "maxResults": min(self.max_results * 2, 40), "printType": "books"}
        if lang:
            params["langRestrict"] = lang

        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        resultados: List[Bibliografia] = []
        for item in data.get("items", []):
            info = item.get("volumeInfo", {})

            autores_api = info.get("authors", []) or []
            autores: List[Autor] = []
            for nome in autores_api[:6]:
                partes = str(nome).split()
                if not partes:
                    continue
                sobrenome = partes[-1]
                nome_restante = " ".join(partes[:-1])
                autores.append(Autor(sobrenome, nome_restante))

            resultados.append(
                Bibliografia(
                    autores=autores,
                    titulo=str(info.get("title") or ""),
                    ano=str(info.get("publishedDate") or "")[:4],
                    editora=info.get("publisher"),
                    local=None,
                    paginas_totais=f"{info.get('pageCount')} p." if info.get("pageCount") else None,
                    revista=None,
                    tipo="livro",
                )
            )

        return resultados

    def _buscar_google_books_por_isbn(self, identifier: str, lang: Optional[str] = None) -> List[Bibliografia]:
        ident = (identifier or "").strip()
        if not ident:
            return []
        digits = re.sub(r"[^0-9Xx]", "", ident)
        if len(digits) not in (10, 13):
            return []
        return self._buscar_google_books(f"isbn:{digits}", lang=lang)

    def _buscar_google_books_por_titulo(self, title: str, author: str = "", lang: Optional[str] = None) -> List[Bibliografia]:
        t = (title or "").strip()
        if not t:
            return []
        a = (author or "").strip()
        q = f"intitle:{t}"
        if a:
            q += f" inauthor:{a}"
        return self._buscar_google_books(q, lang=lang)

    def _enriquecer_com_google_books(self, itens: List[Bibliografia], lang: Optional[str] = None, max_items: int = 5) -> List[Bibliografia]:
        out: List[Bibliografia] = []
        for i, b in enumerate(itens):
            if i >= max_items or b.tipo != "livro":
                out.append(b)
                continue
            needs = (not b.editora) or (not b.paginas_totais) or (not self._ano_int(b.ano))
            if not needs or not b.titulo:
                out.append(b)
                continue
            try:
                autor_hint = f" inauthor:{b.autores[0].sobrenome}" if b.autores and b.autores[0].sobrenome else ""
                q = f"intitle:{b.titulo}{autor_hint}"
                candidates = self._buscar_google_books(q, lang=lang)
                if not candidates:
                    out.append(b)
                    continue
                best = max(
                    candidates,
                    key=lambda c: (self._similaridade(self._norm(c.titulo), self._norm(b.titulo)) + self._richness_score(c)),
                )
                if not b.editora and best.editora:
                    b.editora = best.editora
                if not b.paginas_totais and best.paginas_totais:
                    b.paginas_totais = best.paginas_totais
                if (not self._ano_int(b.ano)) and self._ano_int(best.ano):
                    b.ano = best.ano
            except Exception:
                pass
            out.append(b)
        return out

    # ============================================================
    # OPENLIBRARY
    # ============================================================

    def _buscar_openlibrary(self, consulta: str) -> List[Bibliografia]:
        url = "https://openlibrary.org/search.json"
        params = {"q": consulta, "limit": min(self.max_results * 2, 40)}
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        resultados: List[Bibliografia] = []
        for doc in data.get("docs", []):
            autores: List[Autor] = []
            for nome in (doc.get("author_name") or [])[:6]:
                partes = str(nome).split()
                if not partes:
                    continue
                autores.append(Autor(partes[-1], " ".join(partes[:-1])))

            ano = str(doc.get("first_publish_year") or "")

            resultados.append(
                Bibliografia(
                    autores=autores,
                    titulo=str(doc.get("title") or ""),
                    ano=ano,
                    editora=None,
                    local=None,
                    paginas_totais=None,
                    revista=None,
                    tipo="livro",
                )
            )

        return resultados

    def _buscar_openlibrary_por_titulo(self, title: str, author: str = "") -> List[Bibliografia]:
        t = (title or "").strip()
        if not t:
            return []
        url = "https://openlibrary.org/search.json"
        params = {"title": t, "limit": min(self.max_results * 2, 40)}
        a = (author or "").strip()
        if a:
            params["author"] = a
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        resultados: List[Bibliografia] = []
        for doc in data.get("docs", []):
            autores: List[Autor] = []
            for nome in (doc.get("author_name") or [])[:6]:
                partes = str(nome).split()
                if not partes:
                    continue
                autores.append(Autor(partes[-1], " ".join(partes[:-1])))

            resultados.append(
                Bibliografia(
                    autores=autores,
                    titulo=str(doc.get("title") or ""),
                    ano=str(doc.get("first_publish_year") or ""),
                    editora=None,
                    local=None,
                    paginas_totais=None,
                    revista=None,
                    tipo="livro",
                )
            )
        return resultados

    # ============================================================
    # CROSSREF (ARTIGOS)
    # ============================================================

    def _buscar_crossref(self, consulta: str) -> List[Bibliografia]:
        url = "https://api.crossref.org/works"
        params = {"query": consulta, "rows": min(self.max_results * 2, 40)}
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        resultados: List[Bibliografia] = []
        for item in data.get("message", {}).get("items", []):
            autores: List[Autor] = []
            for a in (item.get("author") or [])[:10]:
                autores.append(Autor(str(a.get("family") or ""), str(a.get("given") or "")))

            ano = ""
            issued = item.get("issued") or {}
            parts = issued.get("date-parts") or []
            if parts and parts[0] and parts[0][0]:
                ano = str(parts[0][0])

            resultados.append(
                Bibliografia(
                    autores=autores,
                    titulo=(item.get("title") or [""])[0] if isinstance(item.get("title"), list) else str(item.get("title") or ""),
                    ano=ano,
                    editora=item.get("publisher"),
                    local=None,
                    paginas_totais=None,
                    revista=(item.get("container-title") or [""])[0] if isinstance(item.get("container-title"), list) else str(item.get("container-title") or ""),
                    tipo="artigo",
                )
            )

        return resultados

    def _buscar_crossref_por_doi(self, identifier: str) -> List[Bibliografia]:
        ident = (identifier or "").strip().lower()
        if not ident:
            return []
        if "doi.org/" in ident:
            ident = ident.split("doi.org/", 1)[1].strip()
        ident = ident.replace("doi:", "").strip()
        if not ident.startswith("10."):
            return []
        return self._buscar_crossref(f"doi:{ident}")

    # ============================================================
    # RANKING (autor+título, penalidades e bônus)
    # ============================================================

    def _similaridade(self, a: str, b: str) -> float:
        return SequenceMatcher(None, str(a).lower(), str(b).lower()).ratio()

    def _rankear(self, consulta: str, lista: List[Bibliografia], criterios: Optional[Dict[str, str]] = None, tipo_desejado: Optional[str] = None) -> List[Bibliografia]:
        cl = consulta.lower()
        criterios = criterios or {}
        c_author = (criterios.get("author") or "").strip().lower()
        c_title = (criterios.get("title") or "").strip().lower()
        c_year = (criterios.get("year") or "").strip()
        c_journal = (criterios.get("journal") or "").strip().lower()
        c_publisher = (criterios.get("publisher") or "").strip().lower()
        c_identifier = (criterios.get("identifier") or "").strip().lower()

        # penalizar itens “secundários” e armadilhas comuns
        penal = [
            "resumo", "summary", "baseado", "based on", "adaptação", "adaptação gráfica", "hq",
            "graphic", "mangá", "manga", "study", "analysis", "crítica", "critica", "leitura",
            "comentado", "comentários", "guia", "workbook", "livro de atividades"
        ]

        def score(b: Bibliografia) -> float:
            s = 0.0

            t = (b.titulo or "").lower()
            s += self._similaridade(t, cl) * 6.0

            a0 = (b.autores[0].sobrenome if b.autores else "").lower()
            s += self._similaridade(a0, cl) * 5.0

            # bônus por ter editora/páginas/ano
            if b.editora:
                s += 0.5
            if b.paginas_totais:
                s += 0.3
            ai = self._ano_int(b.ano)
            if ai:
                s += ai / 10000.0  # bônus leve por recência

            # penalidades por palavras “suspeitas”
            for p in penal:
                if p in t:
                    s -= 2.5

            # artigo: valorizar presença de revista
            if b.tipo == "artigo" and b.revista:
                s += 0.6
            s += self._richness_score(b) * 1.1

            # Matching dirigido por campos estruturados
            if c_title:
                s += self._similaridade(t, c_title) * 8.0
            if c_author:
                author_blob = " ".join([f"{a.nome} {a.sobrenome}".strip() for a in b.autores]).lower()
                s += self._similaridade(author_blob, c_author) * 7.0
                a0 = (b.autores[0].sobrenome if b.autores else "").lower()
                s += self._similaridade(a0, c_author) * 3.0
            if c_title and c_author:
                # Prioriza fortemente a combinação autor+título quando ambos estão informados.
                title_sim = self._similaridade(t, c_title)
                author_blob = " ".join([f"{a.nome} {a.sobrenome}".strip() for a in b.autores]).lower()
                author_sim = self._similaridade(author_blob, c_author)
                combined = (title_sim * 0.6) + (author_sim * 0.4)
                s += combined * 10.0
                if title_sim < 0.45 or author_sim < 0.35:
                    s -= 4.0
            if c_year and self._ano_int(b.ano) and self._ano_int(c_year):
                delta = abs(self._ano_int(b.ano) - self._ano_int(c_year))
                s += 3.0 if delta == 0 else max(0.0, 1.5 - (delta * 0.3))
            if c_journal:
                s += self._similaridade((b.revista or "").lower(), c_journal) * 6.0
            if c_publisher:
                s += self._similaridade((b.editora or "").lower(), c_publisher) * 4.0

            if c_identifier:
                # Apenas Crossref costuma trazer DOI no título/subtitle nesse fluxo atual.
                id_blob = f"{t} {(b.revista or '').lower()} {(b.editora or '').lower()}"
                if c_identifier in id_blob:
                    s += 10.0

            if tipo_desejado:
                s += 2.0 if b.tipo == tipo_desejado else -1.5

            return s

        lista.sort(key=score, reverse=True)
        return lista

    # ============================================================
    # DEDUP + PRIORIZAR EDIÇÃO MAIS RECENTE POR OBRA
    # ============================================================

    def _dedup_priorizar_recente(self, lista: List[Bibliografia]) -> List[Bibliografia]:
        # Mantém, por obra, o candidato mais completo; em empate, ano mais recente.
        best: Dict[str, Bibliografia] = {}
        pos: Dict[str, int] = {}
        for b in lista:
            k = self._key_obra(b)
            if not k.strip(" :"):
                continue
            if k not in best:
                best[k] = b
                pos[k] = len(pos)
                continue
            cur = best[k]
            cur_rich = self._richness_score(cur)
            new_rich = self._richness_score(b)
            if (new_rich > cur_rich) or (
                abs(new_rich - cur_rich) < 1e-9 and self._ano_int(b.ano) > self._ano_int(cur.ano)
            ):
                best[k] = b

        ordered_keys = sorted(pos.keys(), key=lambda k: pos[k])
        return [best[k] for k in ordered_keys]

    # ============================================================
    # ENRIQUECIMENTO VIA LLM (1 CHAMADA EM BATCH)
    # ============================================================

    def _parse_json_payload(self, text: str) -> dict:
        raw = (text or "").strip()
        if not raw:
            return {}
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            pass

        no_fence = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()
        if no_fence:
            try:
                parsed = json.loads(no_fence)
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                pass

        candidates = re.findall(r"(\{[\s\S]*\}|\[[\s\S]*\])", no_fence or raw)
        for cand in candidates:
            try:
                parsed = json.loads(cand.strip())
                return parsed if isinstance(parsed, dict) else {}
            except Exception:
                continue
        return {}

    def _llm_enrich_batch(self, consulta: str, itens: List[Bibliografia]) -> Dict[str, dict]:
        """
        Retorna dict: { key_obra: {editora, local, paginas_totais, edicao, isbn, idioma, natureza, revista? } }
        """
        if not self.api_key or not itens:
            return {}

        # cache por consulta + chaves (para evitar repetição em chamadas iguais no mesmo processo)
        cache_key = f"{self._norm(consulta)}::" + "|".join(sorted(self._key_obra(x) for x in itens))
        if cache_key in self._llm_cache:
            return self._llm_cache[cache_key]

        # prepara payload compacto
        pacote = []
        for b in itens:
            pacote.append({
                "key": self._key_obra(b),
                "tipo": b.tipo,
                "titulo": b.titulo,
                "autores": [{"sobrenome": a.sobrenome, "nome": a.nome} for a in b.autores[:6]],
                "ano": b.ano,
                "editora": b.editora,
                "local": b.local,
                "paginas_totais": b.paginas_totais,
                "revista": b.revista,
            })

        prompt = f"""
Você é um bibliotecário/catalogador. Use busca na internet e priorize fontes brasileiras quando aplicável
(ex.: catálogo da Fundação Biblioteca Nacional, CBL/ISBN Brasil, catálogos de editoras brasileiras, livrarias, fichas catalográficas).

Receba uma lista de candidatos (cada um com key, título, autores, ano e alguns campos possivelmente faltantes) e retorne APENAS JSON válido:
{{
  "enriched": [
    {{
      "key": "...",
      "editora": "... ou null",
      "local": "... ou null",
      "paginas_totais": "... (ex: '252 p.') ou null",
      "edicao": "... (ex: '2. ed.') ou null",
      "isbn": "... ou null",
      "idioma": "... (ex: 'pt') ou null",
      "natureza": "... (use SOMENTE um destes: 'original', 'traducao', 'adaptacao', 'resumo', 'estudo', 'incerto')",
      "revista": "... ou null"
    }}
  ]
}}

Regras:
- Não invente. Se não achar com segurança, use null.
- Se detectar que o item é adaptação/resumo/estudo (não é a obra principal), marque natureza adequadamente.
- Ano deve permanecer coerente (AAAA); se houver ano mais confiável, você pode sugerir via "ano_sugerido": "AAAA" (opcional).
- Não inclua texto fora do JSON.
"""

        try:
            try:
                from backend.functions.llm_gateway import execute_llm_request
            except Exception:
                from functions.llm_gateway import execute_llm_request

            final_prompt = prompt if not self.llm_system_prompt else f"{self.llm_system_prompt}\n\n{prompt}"
            result = execute_llm_request(
                api_key=self.api_key,
                model=self.llm_model or "gpt-5.4-mini",
                messages=[
                    {"role": "system", "content": final_prompt},
                    {"role": "user", "content": json.dumps({"consulta": consulta, "candidatos": pacote}, ensure_ascii=False)},
                ],
                system_prompt="",
                temperature=self.llm_temperature if self.llm_temperature is not None else 0,
                max_output_tokens=self.llm_max_output_tokens if self.llm_max_output_tokens is not None else 1400,
                gpt5_effort=self.llm_gpt5_effort,
                gpt5_verbosity=self.llm_gpt5_verbosity,
                tools=[{"type": "web_search"}],
                vector_store_ids=[],
                timeout=45,
            )
            self._push_llm_log(result.get("request"), result.get("raw"))

            text = str(result.get("content") or "").strip()
            data = self._parse_json_payload(text)
            if not data:
                return {}

            enriched_list = data.get("enriched", [])
            out: Dict[str, dict] = {}
            if isinstance(enriched_list, list):
                for e in enriched_list:
                    if isinstance(e, dict) and e.get("key"):
                        out[str(e["key"])] = e

            self._llm_cache[cache_key] = out
            return out

        except Exception:
            return {}

    def _aplicar_enriquecimento(self, lista: List[Bibliografia], enrich_map: Dict[str, dict]) -> List[Bibliografia]:
        out: List[Bibliografia] = []
        for b in lista:
            k = self._key_obra(b)
            e = enrich_map.get(k)
            if not e:
                out.append(b)
                continue

            # Se a LLM detectou que é resumo/adaptação/estudo, vamos manter, mas ele perderá no ranking final (penalização)
            # A aplicação de campos é “somente se faltante” para não piorar metadado bom.
            if not b.editora and e.get("editora"):
                b.editora = e.get("editora")
            if not b.local and e.get("local"):
                b.local = e.get("local")
            if not b.paginas_totais and e.get("paginas_totais"):
                b.paginas_totais = e.get("paginas_totais")
            if b.tipo == "artigo" and (not b.revista) and e.get("revista"):
                b.revista = e.get("revista")

            # Ano sugerido (opcional): só aplica se o ano atual é vazio ou inválido
            ano_sug = e.get("ano_sugerido")
            if (not self._ano_int(b.ano)) and isinstance(ano_sug, str) and self._ano_int(ano_sug):
                b.ano = ano_sug[:4]

            # injeta “natureza” como penalidade indireta (sem alterar modelo): marcamos no título (não desejado),
            # então só usamos internamente no pós-filtro.
            setattr(b, "_natureza", e.get("natureza", "incerto"))
            out.append(b)
        return out

    # ============================================================
    # PÓS-FILTRO PARA ELIMINAR ADAPTAÇÕES/TRADUÇÕES QUANDO HÁ ORIGINAL
    # ============================================================

    def _filtrar_natureza(self, lista: List[Bibliografia]) -> List[Bibliografia]:
        # Se houver algum "original" bem rankeado, rebaixa/descarta adaptações/resumos/estudos.
        # Mantemos traduções apenas se a consulta explicitamente pedir (heurística simples).
        out: List[Bibliografia] = []
        tem_original = any(getattr(x, "_natureza", "") == "original" for x in lista)

        for b in lista:
            nat = getattr(b, "_natureza", "incerto")
            if tem_original and nat in ("resumo", "adaptacao", "estudo"):
                continue
            out.append(b)

        return out

    # ============================================================
    # SCORE DE CONFIABILIDADE (TOP-2)
    # ============================================================

    def _calcular_score(self, lista: List[Bibliografia]) -> Dict:
        if len(lista) < 2:
            return {"score_percentual": 100.0, "classificacao": "Fonte unica"}

        pesos = {"titulo": 4.0, "ano": 3.0, "editora": 2.0, "autores": 3.0}
        top = lista[: min(len(lista), 5)]
        pares_scores: List[float] = []

        for i in range(len(top)):
            for j in range(i + 1, len(top)):
                b1, b2 = top[i], top[j]
                score = 0.0
                peso_ativo = 0.0

                # titulo normalizado
                t1 = self._normalize_title_for_score(b1.titulo)
                t2 = self._normalize_title_for_score(b2.titulo)
                if t1 and t2:
                    score += self._similaridade(t1, t2) * pesos["titulo"]
                    peso_ativo += pesos["titulo"]

                # ano
                y1 = str(self._ano_int(b1.ano) or "")
                y2 = str(self._ano_int(b2.ano) or "")
                if y1 and y2:
                    score += self._similaridade(y1, y2) * pesos["ano"]
                    peso_ativo += pesos["ano"]

                # editora
                e1 = self._norm(b1.editora or "")
                e2 = self._norm(b2.editora or "")
                if e1 and e2:
                    score += self._similaridade(e1, e2) * pesos["editora"]
                    peso_ativo += pesos["editora"]

                # autores (sobrenome principal)
                a1 = self._norm(b1.autores[0].sobrenome) if b1.autores else ""
                a2 = self._norm(b2.autores[0].sobrenome) if b2.autores else ""
                if a1 and a2:
                    score += self._similaridade(a1, a2) * pesos["autores"]
                    peso_ativo += pesos["autores"]

                if peso_ativo > 0:
                    pares_scores.append((score / peso_ativo) * 100.0)

        indice = round(self._mediana(pares_scores), 2) if pares_scores else 0.0

        if indice >= 90:
            cls = "Alta confiabilidade"
        elif indice >= 75:
            cls = "Confiabilidade moderada"
        elif indice >= 60:
            cls = "Confiabilidade baixa"
        else:
            cls = "Confiabilidade critica"

        return {"score_percentual": indice, "classificacao": cls}

    # ============================================================
    # FORMATAÇÃO FINAL (SEU PADRÃO)
    # ============================================================

    def montar_referencia(self, b: Bibliografia) -> str:
        partes: List[str] = []

        for autor in b.autores:
            # mantém seu padrão atual (sobrenome em negrito + nome normal)
            partes.append(f"**{autor.sobrenome}**, {autor.nome}")

        if b.titulo:
            partes.append(f"***{b.titulo}***")

        if b.paginas_totais:
            partes.append(b.paginas_totais)

        if b.revista:
            partes.append(b.revista)

        if b.editora:
            partes.append(b.editora)

        if b.local:
            partes.append(b.local)

        if b.ano:
            partes.append(f"{b.ano}.")

        return "; ".join(partes)

    # ============================================================
    # MÉTODO PRINCIPAL (CONTRATO IDÊNTICO)
    # ============================================================

    def gerar_com_validacao(self, consulta: str = "", criterios: Optional[Dict[str, str]] = None) -> Dict:
        self._last_llm_log = None
        self._llm_logs = []
        criterios = criterios or {}
        consulta = (consulta or "").strip()

        if not consulta:
            parts = [
                (criterios.get("author") or "").strip(),
                (criterios.get("title") or "").strip(),
                (criterios.get("year") or "").strip(),
                (criterios.get("journal") or "").strip(),
                (criterios.get("publisher") or "").strip(),
                (criterios.get("identifier") or "").strip(),
                (criterios.get("extra") or "").strip(),
            ]
            consulta = " | ".join([p for p in parts if p])

        if not consulta:
            raise ValueError("Informe ao menos um campo para consulta de bibliografia externa.")

        tipo = self._detectar_tipo_campos(criterios, consulta)

        # Heurística de idioma: se consulta parece PT-BR, tentamos priorizar PT no Google
        lang = "pt" if re.search(r"\b(autor|título|edicao|edição|editora|rio|sao|brasil|portugu)\b", consulta.lower()) or "," in consulta else None

        resultados: List[Bibliografia] = []

        ident = (criterios.get("identifier") or "").strip()
        title_crit = (criterios.get("title") or "").strip()
        author_crit = (criterios.get("author") or "").strip()

        if tipo == "livro":
            # Busca ampla + fusão
            if title_crit:
                try:
                    resultados += self._buscar_google_books_por_titulo(title_crit, author_crit, lang=lang)
                except Exception:
                    pass
                try:
                    resultados += self._buscar_openlibrary_por_titulo(title_crit, author_crit)
                except Exception:
                    pass
            if ident:
                try:
                    resultados += self._buscar_google_books_por_isbn(ident, lang=lang)
                except Exception:
                    pass
            try:
                resultados += self._buscar_google_books(consulta, lang=lang)
            except Exception:
                pass
            try:
                resultados += self._buscar_openlibrary(consulta)
            except Exception:
                pass
        else:
            if ident:
                try:
                    resultados += self._buscar_crossref_por_doi(ident)
                except Exception:
                    pass
            try:
                resultados += self._buscar_crossref(consulta)
            except Exception:
                pass

        # fallback: se veio vazio por qualquer motivo, tenta Google sem langRestrict
        if not resultados and tipo == "livro":
            try:
                resultados += self._buscar_google_books(consulta, lang=None)
            except Exception:
                pass

        if not resultados:
            raise ValueError("Nenhum resultado encontrado.")

        # Ranking inicial
        resultados = self._rankear(consulta, resultados, criterios=criterios, tipo_desejado=tipo)
        resultados = self._filtrar_por_criterios_estritos(resultados, criterios)
        if not resultados:
            raise ValueError("Nenhum resultado relevante encontrado para os campos informados.")

        # Dedup fraco por título (antes) para reduzir carga
        vistos_t = set()
        pre = []
        for r in resultados:
            t = self._norm(r.titulo)
            if not t:
                continue
            if t in vistos_t:
                continue
            vistos_t.add(t)
            pre.append(r)
            if len(pre) >= max(self.max_results * 3, 12):
                break

        # Enriquecimento via LLM (batch, só top K que precisam)
        if self.max_llm_enrich > 0 and self.api_key:
            candidatos_enrich = []
            for r in pre:
                # enriquece se faltar algum campo relevante OU se suspeito (título com “resumo/adaptação/etc.”)
                faltando = (not r.editora) or (not r.local) or (not r.paginas_totais)
                suspeito = any(p in (r.titulo or "").lower() for p in ["resumo", "adap", "hq", "analysis", "crítica", "critica", "study"])
                if faltando or suspeito:
                    candidatos_enrich.append(r)
                if len(candidatos_enrich) >= self.max_llm_enrich:
                    break

            enrich_map = self._llm_enrich_batch(consulta, candidatos_enrich)
            pre = self._aplicar_enriquecimento(pre, enrich_map)
            pre = self._filtrar_natureza(pre)

            # Re-rank após enriquecer (agora com melhores campos e “natureza” penalizada indiretamente)
            pre = self._rankear(consulta, pre, criterios=criterios, tipo_desejado=tipo)
            pre = self._filtrar_por_criterios_estritos(pre, criterios)
            if not pre:
                raise ValueError("Nenhum resultado relevante encontrado para os campos informados.")

        # Prioriza edição mais recente por obra (título+autor)
        pre = self._dedup_priorizar_recente(pre)
        pre = self._enriquecer_com_google_books(pre, lang=lang, max_items=max(self.max_results, 5))
        pre = self._rankear(consulta, pre, criterios=criterios, tipo_desejado=tipo)
        pre = self._filtrar_por_criterios_estritos(pre, criterios)

        # Limita ao max_results e monta referências
        finais = pre[: self.max_results]
        referencias = [self.montar_referencia(r).strip() for r in finais]
        referencias = [r for r in referencias if r]

        if not referencias:
            raise ValueError("Nao foi possivel montar referencias para os resultados encontrados.")

        return {
            "referencia": referencias[0],
            "matches": referencias,
            "max_results": self.max_results,
            "score": self._calcular_score(finais),
            "llm_log": self._last_llm_log,
            "llm_logs": self._llm_logs,
        }
