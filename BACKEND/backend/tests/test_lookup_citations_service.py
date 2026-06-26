import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.functions.lookup_citations_service import (
    SCORE_MINIMO_FALLBACK,
    carregar_indice_lexical,
    coletar_manifesto_lexical,
    encontrar,
    lookup_citations,
    processar_paragrafos,
    separar_paragrafos,
)
from backend.main import app


class LookupCitationsServiceTests(unittest.TestCase):
    def test_separar_paragrafos_unifica_linhas_e_divide_por_linhas_em_branco(self) -> None:
        texto = "Primeira linha\nsegunda linha\n\nTerceira linha\n\n\nQuarta"

        paragrafos = separar_paragrafos(texto)

        self.assertEqual(paragrafos, ["Primeira linha segunda linha", "Terceira linha", "Quarta"])

    def test_lookup_citations_retains_known_match_with_page(self) -> None:
        trecho = (
            "Abdicações. As abdicações cosmoéticas, quando vividas com discernimento, "
            "podem qualificar a evolução consciencial."
        )

        result = lookup_citations(trecho)

        self.assertEqual(result["total"], 1)
        self.assertEqual(result["paragraphsCount"], 1)
        self.assertGreaterEqual(len(result["results"]), 1)
        self.assertNotEqual(result["results"][0]["book"], "N/D")
        self.assertNotEqual(result["results"][0]["page"], "N/D")

    def test_lookup_citations_returns_reference_fields(self) -> None:
        trecho = (
            "Abdicações. As abdicações cosmoéticas, quando vividas com discernimento, "
            "podem qualificar a evolução consciencial."
        )

        result = lookup_citations(trecho)
        item = result["results"][0]

        self.assertIn("matchedRow", item)
        self.assertIn("matchedReference", item)
        self.assertIn("title", item)

    def test_lookup_citations_returns_full_cell_text_as_matched_paragraph(self) -> None:
        trecho = (
            "AbdicaÃ§Ãµes. As abdicaÃ§Ãµes cosmoÃ©ticas, quando vividas com discernimento, "
            "podem qualificar a evoluÃ§Ã£o consciencial."
        )

        result = lookup_citations(trecho)
        item = result["results"][0]
        indice_lexical = carregar_indice_lexical()
        entrada_esperada = next(
            entrada
            for entrada in indice_lexical["entradas"]
            if entrada.arquivo == item["book"] and entrada.ordem == item["matchedRow"]
        )

        self.assertEqual(item["matchedParagraph"], entrada_esperada.texto)
        self.assertEqual(item["matchedParagraph"], item["matchedParagraph"].strip())

    def test_encontrar_uses_global_fallback_when_context_window_has_no_match(self) -> None:
        indice_lexical = carregar_indice_lexical()
        entradas = indice_lexical["entradas"]
        self.assertGreater(len(entradas), 10)
        texto = entradas[-1].texto
        entradas_contexto = (0, 1, 2)

        result = encontrar(texto, indice_lexical, entradas_contexto, SCORE_MINIMO_FALLBACK)

        self.assertIsNotNone(result["_arquivo"])
        self.assertGreater(result["score"], 0)

    def test_process_cache_keeps_manifest_stable(self) -> None:
        manifesto = coletar_manifesto_lexical()
        indice_a = carregar_indice_lexical()
        indice_b = carregar_indice_lexical()

        self.assertEqual(manifesto, coletar_manifesto_lexical())
        self.assertIs(indice_a, indice_b)

    def test_processar_paragrafos_returns_api_result_rows(self) -> None:
        indice_lexical = carregar_indice_lexical()
        trecho = (
            "Abdicações. As abdicações cosmoéticas, quando vividas com discernimento, "
            "podem qualificar a evolução consciencial."
        )

        resultados, _ = processar_paragrafos(
            [trecho],
            indice_lexical,
            {},
            None,
            2,
            3,
            SCORE_MINIMO_FALLBACK,
        )

        self.assertEqual(len(resultados), 1)
        self.assertIn("book", resultados[0])
        self.assertIn("title", resultados[0])
        self.assertIn("page", resultados[0])
        self.assertIn("similarity", resultados[0])

    def test_lookup_citations_loads_each_json_source_without_global_index(self) -> None:
        sources = [
            {"index_id": "alpha", "file_stem": "ALPHA", "path": "alpha.json"},
            {"index_id": "beta", "file_stem": "BETA", "path": "beta.json"},
        ]
        source_docs = {
            "alpha": {
                "index_id": "alpha",
                "file_stem": "ALPHA",
                "records": [
                    {
                        "row": 1,
                        "text": "Texto sem relacao com a busca.",
                        "data": {"text": "Texto sem relacao com a busca.", "title": "Alpha", "pagina": "10"},
                    }
                ],
            },
            "beta": {
                "index_id": "beta",
                "file_stem": "BETA",
                "records": [
                    {
                        "row": 7,
                        "text": "Trecho alvo para localizacao precisa.",
                        "data": {"text": "Trecho alvo para localizacao precisa.", "title": "Beta", "pagina": "20"},
                    }
                ],
            },
        }

        with (
            patch("backend.functions.lookup_citations_service.list_source_documents", return_value=sources),
            patch(
                "backend.functions.lookup_citations_service.load_source_document",
                side_effect=lambda identifier, **_kwargs: source_docs[identifier],
            ) as mock_load_source,
            patch(
                "backend.functions.lookup_citations_service.carregar_indice_lexical",
                side_effect=AssertionError("indice global nao deve ser carregado"),
            ),
            patch("backend.functions.lookup_citations_service.clear_source_document_cache") as mock_clear_cache,
        ):
            result = lookup_citations("Trecho alvo para localizacao precisa.")

        self.assertEqual(result["results"][0]["book"], "BETA")
        self.assertEqual(result["results"][0]["page"], 20)
        self.assertTrue(all(call.kwargs.get("use_cache") is False for call in mock_load_source.call_args_list))
        self.assertGreaterEqual(mock_clear_cache.call_count, 2)


class LookupCitationsApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_lookup_citations_endpoint_returns_400_for_empty_text(self) -> None:
        response = self.client.post(
            "/api/apps/lexical/citations/lookup",
            json={"text": "   ", "paginasAntes": 2, "paginasDepois": 3},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Parametro 'text' e obrigatorio.", response.text)


if __name__ == "__main__":
    unittest.main()
