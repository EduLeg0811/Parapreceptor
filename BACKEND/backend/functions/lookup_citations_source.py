from __future__ import annotations

from typing import Any

try:
    import pandas as pd  # type: ignore
except Exception:  # pragma: no cover - optional Streamlit helper dependency
    pd = None

try:
    import streamlit as st  # type: ignore
except Exception:  # pragma: no cover - optional Streamlit helper dependency
    st = None

try:
    from backend.functions.lookup_citations_service import (
        SCORE_MINIMO_FALLBACK,
        carregar_indice_lexical,
        coletar_manifesto_lexical,
        encontrar,
        lookup_citations,
        normalizar,
        processar_paragrafos_por_fontes,
        processar_paragrafos as processar_paragrafos_json,
        separar_paragrafos,
        tokenizar,
    )
except Exception:
    from functions.lookup_citations_service import (
        SCORE_MINIMO_FALLBACK,
        carregar_indice_lexical,
        coletar_manifesto_lexical,
        encontrar,
        lookup_citations,
        normalizar,
        processar_paragrafos_por_fontes,
        processar_paragrafos as processar_paragrafos_json,
        separar_paragrafos,
        tokenizar,
    )


def _linha_streamlit(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "Paragrafo entrada": item.get("inputParagraph") or "",
        "Paragrafo correspondente encontrado": item.get("matchedParagraph") or "",
        "Livro": item.get("book") or "N/D",
        "Titulo": item.get("title") or "N/D",
        "Pagina": item.get("page") or "N/D",
        "Similaridade": item.get("similarity") or 0,
        "Metodo": item.get("method") or "sem_match",
        "Linha": item.get("matchedRow") or "N/D",
        "Referencia": item.get("matchedReference") or "N/D",
    }


def lookup_citations_rows(
    text: str,
    paginas_antes: int = 2,
    paginas_depois: int = 3,
) -> list[dict[str, Any]]:
    result = lookup_citations(
        text=text,
        paginas_antes=paginas_antes,
        paginas_depois=paginas_depois,
    )
    return [_linha_streamlit(item) for item in result.get("results", []) if isinstance(item, dict)]


def processar_paragrafos(
    paragrafos: list[str],
    indice_lexical: dict[str, Any] | None = None,
    cache_resultados: dict[str, dict[str, Any]] | None = None,
    ultimo_resultado: dict[str, Any] | None = None,
    paginas_antes: int = 2,
    paginas_depois: int = 3,
    score_minimo_fallback: int = SCORE_MINIMO_FALLBACK,
) -> tuple[Any, dict[str, Any] | None]:
    if indice_lexical is None:
        resultados, ultimo = processar_paragrafos_por_fontes(
            paragrafos,
            cache_resultados or {},
            ultimo_resultado,
            max(0, int(paginas_antes)),
            max(0, int(paginas_depois)),
            int(score_minimo_fallback),
        )
    else:
        resultados, ultimo = processar_paragrafos_json(
            paragrafos,
            indice_lexical,
            cache_resultados or {},
            ultimo_resultado,
            max(0, int(paginas_antes)),
            max(0, int(paginas_depois)),
            int(score_minimo_fallback),
        )
    rows = [_linha_streamlit(item) for item in resultados]
    if pd is None:
        return rows, ultimo
    return pd.DataFrame(rows), ultimo


def main() -> None:
    if st is None:
        raise RuntimeError("Streamlit nao esta disponivel neste ambiente.")
    if pd is None:
        raise RuntimeError("Pandas nao esta disponivel neste ambiente.")

    st.title("Lookup Citations -> Corpus JSON")
    st.caption("Localiza trechos usando a base canonica em backend/Files/corpus/*.json.")

    manifesto = coletar_manifesto_lexical()
    st.caption(
        f"Base JSON disponivel com {len(manifesto)} fontes. "
        "Cada fonte e carregada separadamente durante o processamento."
    )

    texto_entrada = st.text_area(
        "Texto de entrada",
        placeholder="Cole aqui varios paragrafos separados por uma linha em branco.",
    )
    paginas_antes = st.number_input("Janela antes", min_value=0, max_value=50, value=2, step=1)
    paginas_depois = st.number_input("Janela depois", min_value=0, max_value=50, value=3, step=1)

    if not st.button("Processar"):
        return

    paragrafos = separar_paragrafos(texto_entrada)
    if not paragrafos:
        st.warning("Informe ao menos um paragrafo separado por linhas em branco.")
        return

    status = st.empty()
    status.info(f"Processando {len(paragrafos)} paragrafos...")
    df_result, _ultimo_resultado = processar_paragrafos(
        paragrafos,
        None,
        {},
        None,
        int(paginas_antes),
        int(paginas_depois),
        SCORE_MINIMO_FALLBACK,
    )
    status.success("Processamento concluido.")

    st.dataframe(df_result, use_container_width=True, hide_index=True)


if __name__ == "__main__":
    main()
