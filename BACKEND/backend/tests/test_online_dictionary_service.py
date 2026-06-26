from __future__ import annotations

import time
import unittest
from unittest.mock import patch

from backend.functions import online_dictionary_service as service


def make_stage(source: str, *, ok: bool, definitions: list[str] | None = None, synonyms: list[str] | None = None) -> dict:
    started_at = time.perf_counter()
    return service.build_stage(
        source,
        started_at,
        ok=ok,
        url=f"https://example.com/{source.lower()}",
        definitions=definitions or [],
        synonyms=synonyms or [],
        query_term="casa",
    )


class OnlineDictionaryServiceTests(unittest.TestCase):
    def test_normalize_definitions_dedupes_and_splits(self) -> None:
        result = service.normalize_definitions([
            "1. MORADIA; habitação",
            "2. Moradia",
            "SINÔNIMOS: LAR",
        ])
        self.assertIn("Habitação", result)
        self.assertTrue(any("Sinonimo" in item or "Sinonimos" in item for item in result))

    def test_fetch_with_accent_fallback_retries_without_accents(self) -> None:
        calls: list[str] = []

        def fake_fetcher(term: str) -> dict:
            calls.append(term)
            if term == "ação":
                return service.build_stage("Teste", time.perf_counter(), ok=False, definitions=[], query_term=term, error="vazio")
            return service.build_stage("Teste", time.perf_counter(), ok=True, definitions=["Ato de agir."], query_term=term)

        result = service.fetch_with_accent_fallback(fake_fetcher, "ação")
        self.assertEqual(calls, ["ação", "acao"])
        self.assertTrue(result["ok"])
        self.assertEqual(result["query_term"], "acao")
        self.assertTrue(result["retry_without_accents"])

    def test_rank_results_orders_by_ok_quality_and_definition_count(self) -> None:
        low = make_stage("Dicio", ok=True, definitions=["Uma"], synonyms=[])
        high = make_stage("Aulete", ok=True, definitions=["Uma", "Duas"], synonyms=["lar"])
        failed = make_stage("Wiktionary", ok=False, definitions=[], synonyms=[])

        ranked = service.rank_results([low, failed, high])
        self.assertEqual([item["source"] for item in ranked], ["Aulete", "Dicio", "Wiktionary"])

    def test_search_online_dictionaries_aggregates_partial_failures(self) -> None:
        with patch.object(service, "fetch_aulete", return_value=make_stage("Aulete", ok=True, definitions=["Moradia."], synonyms=["lar"])), \
             patch.object(service, "fetch_michaelis", return_value=make_stage("Michaelis", ok=False, definitions=[])), \
             patch.object(service, "fetch_priberam", return_value=make_stage("Priberam", ok=True, definitions=["Habitação."])), \
             patch.object(service, "fetch_wiktionary", return_value=make_stage("Wiktionary", ok=False, definitions=[])), \
             patch.object(service, "fetch_dicio", return_value=make_stage("Dicio", ok=False, definitions=[])):
            result = service.search_online_dictionaries("casa")

        self.assertEqual(result["term"], "casa")
        self.assertEqual(result["sources_total"], 5)
        self.assertEqual(result["sources_ok"], 2)
        self.assertEqual(result["sources_failed"], 3)
        self.assertGreaterEqual(len(result["summary"]["definitions"]), 2)
        self.assertTrue(any(item["source"] == "Michaelis" and not item["ok"] for item in result["results"]))


if __name__ == "__main__":
    unittest.main()
