import unittest
from unittest.mock import patch

import numpy as np

from backend.functions.semantic_search_service import search_semantic_index, search_semantic_overview_with_total


class SemanticOverviewServiceTests(unittest.TestCase):
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_search_preserves_markdown_text(
        self,
        mock_get_query_vector,
        mock_load_index,
    ) -> None:
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_load_index.return_value = {
            "manifest": {"index_label": "Alpha", "model": "m1"},
            "metadata": [
                {
                    "row": 1,
                    "text": "**Alpha** em *Markdown*",
                    "text_plain": "Alpha em Markdown",
                    "metadata": {"title": "A1"},
                },
            ],
            "search_texts": ("alpha em markdown",),
            "embeddings": np.array([[0.92, 0.0]], dtype=np.float32),
        }

        total, lexical_filtered_count, recommended_min_score, effective_min_score, rag_context, matches = search_semantic_index(
            "alpha",
            "cosmoetica",
            limit=3,
            api_key="key",
            min_score=0.0,
        )

        self.assertEqual(total, 1)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(recommended_min_score, 0.25)
        self.assertEqual(effective_min_score, 0.25)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual(matches[0]["text"], "**Alpha** em *Markdown*")

    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_search_filters_lexical_duplicates_and_min_score(
        self,
        mock_get_query_vector,
        mock_load_index,
    ) -> None:
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_load_index.return_value = {
            "manifest": {"index_label": "Alpha", "model": "m1"},
            "metadata": [
                {
                    "row": 1,
                    "text": "Cosmoetica aplicada no dia a dia",
                    "text_plain": "Cosmoetica aplicada no dia a dia",
                    "metadata": {"title": "A1"},
                },
                {
                    "row": 2,
                    "text": "Maturidade assistencial ampliada",
                    "text_plain": "Maturidade assistencial ampliada",
                    "metadata": {"title": "A2"},
                },
                {
                    "row": 3,
                    "text": "Trecho de score baixo",
                    "text_plain": "Trecho de score baixo",
                    "metadata": {"title": "A3"},
                },
            ],
            "search_texts": (
                "cosmoetica aplicada no dia a dia",
                "maturidade assistencial ampliada",
                "trecho de score baixo",
            ),
            "embeddings": np.array([[0.93, 0.0], [0.74, 0.0], [0.18, 0.0]], dtype=np.float32),
        }

        total, lexical_filtered_count, recommended_min_score, effective_min_score, rag_context, matches = search_semantic_index(
            "alpha",
            "cosmoetica",
            limit=3,
            api_key="key",
            min_score=0.3,
        )

        self.assertEqual(total, 1)
        self.assertEqual(lexical_filtered_count, 1)
        self.assertEqual(recommended_min_score, 0.25)
        self.assertEqual(effective_min_score, 0.3)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual([match["row"] for match in matches], [2])

    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_search_reranks_candidate_pool_by_query_alignment(
        self,
        mock_get_query_vector,
        mock_load_index,
    ) -> None:
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_load_index.return_value = {
            "manifest": {"index_label": "Alpha", "model": "m1"},
            "metadata": [
                {
                    "row": 1,
                    "text": "Trecho generico sobre assistencia e convivencia.",
                    "text_plain": "Trecho generico sobre assistencia e convivencia.",
                    "metadata": {"title": "Panorama geral"},
                },
                {
                    "row": 2,
                    "text": "Maturidade assistencial aplicada no cotidiano.",
                    "text_plain": "Maturidade assistencial aplicada no cotidiano.",
                    "metadata": {"title": "Maturidade assistencial"},
                },
            ],
            "search_texts": (
                "trecho generico sobre assistencia e convivencia",
                "maturidade assistencial aplicada no cotidiano",
            ),
            "embeddings": np.array([[0.91, 0.0], [0.89, 0.0]], dtype=np.float32),
        }

        total, lexical_filtered_count, recommended_min_score, effective_min_score, rag_context, matches = search_semantic_index(
            "alpha",
            "maturidade assistencial",
            limit=1,
            api_key="key",
            min_score=0.0,
            exclude_lexical_duplicates=False,
        )

        self.assertEqual(total, 2)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(recommended_min_score, 0.25)
        self.assertEqual(effective_min_score, 0.25)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual([match["row"] for match in matches], [2])
        self.assertGreater(matches[0]["score"], matches[0]["semantic_score"])
        self.assertGreater(matches[0]["alignment_score"], 0.0)

    @patch("backend.functions.semantic_search_service.resolve_semantic_query_context")
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_search_returns_rag_context_when_enabled(
        self,
        mock_get_query_vector,
        mock_load_index,
        mock_resolve_semantic_query_context,
    ) -> None:
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_resolve_semantic_query_context.return_value = {
            "usedRagContext": True,
            "sourceQuery": "tenepes e recin",
            "vectorStoreIds": ["vs_123"],
            "keyTerms": ["tenepes", "recin"],
            "definitions": [{"term": "tenepes", "meaning": "tarefa energetica pessoal"}],
            "relatedTerms": ["tarefa energetica pessoal", "reciclagem intraconsciencial"],
            "disambiguatedQuery": "tenepes e recin no contexto da assistencialidade conscienciologica",
            "references": ["WVBooks"],
        }
        mock_load_index.return_value = {
            "manifest": {"index_label": "Alpha", "model": "m1"},
            "metadata": [
                {
                    "row": 1,
                    "text": "Tenepes e recin qualificam a assistencialidade.",
                    "text_plain": "Tenepes e recin qualificam a assistencialidade.",
                    "metadata": {"title": "A1"},
                },
            ],
            "search_texts": ("tenepes e recin qualificam a assistencialidade",),
            "embeddings": np.array([[0.88, 0.0]], dtype=np.float32),
        }

        total, lexical_filtered_count, recommended_min_score, effective_min_score, rag_context, matches = search_semantic_index(
            "alpha",
            "tenepes e recin",
            limit=3,
            api_key="key",
            min_score=0.0,
            exclude_lexical_duplicates=False,
            use_rag_context=True,
            vector_store_ids=["vs_123"],
        )

        self.assertEqual(total, 1)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(recommended_min_score, 0.25)
        self.assertEqual(effective_min_score, 0.25)
        self.assertTrue(rag_context["usedRagContext"])
        self.assertEqual(rag_context["relatedTerms"][0], "tarefa energetica pessoal")
        self.assertEqual(matches[0]["row"], 1)
        self.assertEqual(mock_resolve_semantic_query_context.call_count, 1)

    @patch("backend.functions.semantic_search_service.resolve_semantic_query_context")
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_search_falls_back_when_rag_context_resolution_fails(
        self,
        mock_get_query_vector,
        mock_load_index,
        mock_resolve_semantic_query_context,
    ) -> None:
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_resolve_semantic_query_context.side_effect = RuntimeError("rag offline")
        mock_load_index.return_value = {
            "manifest": {"index_label": "Alpha", "model": "m1"},
            "metadata": [
                {
                    "row": 1,
                    "text": "Trecho semanticamente util.",
                    "text_plain": "Trecho semanticamente util.",
                    "metadata": {"title": "A1"},
                },
            ],
            "search_texts": ("trecho semanticamente util",),
            "embeddings": np.array([[0.88, 0.0]], dtype=np.float32),
        }

        total, lexical_filtered_count, recommended_min_score, effective_min_score, rag_context, matches = search_semantic_index(
            "alpha",
            "tenepes e recin",
            limit=3,
            api_key="key",
            min_score=0.0,
            exclude_lexical_duplicates=False,
            use_rag_context=True,
            vector_store_ids=["vs_123"],
        )

        self.assertEqual(total, 1)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(recommended_min_score, 0.25)
        self.assertEqual(effective_min_score, 0.25)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual(rag_context["error"], "rag offline")
        self.assertEqual(matches[0]["row"], 1)

    @patch("backend.functions.semantic_search_service.list_semantic_indexes")
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_overview_orders_globally_and_groups_by_index(
        self,
        mock_get_query_vector,
        mock_load_index,
        mock_list_indexes,
    ) -> None:
        mock_list_indexes.return_value = [
            {"id": "alpha", "label": "Alpha", "model": "m1"},
            {"id": "beta", "label": "Beta", "model": "m2"},
        ]
        mock_get_query_vector.side_effect = [
            np.array([1.0, 0.0], dtype=np.float32),
            np.array([1.0, 0.0], dtype=np.float32),
        ]
        mock_load_index.side_effect = [
            {
                "manifest": {"index_label": "Alpha", "model": "m1"},
                "metadata": [
                    {"row": 1, "text": "alpha-1", "metadata": {"title": "A1"}},
                    {"row": 2, "text": "alpha-2", "metadata": {"title": "A2"}},
                ],
                "search_texts": ("trecho alpha um", "trecho alpha dois"),
                "embeddings": np.array([[0.92, 0.0], [0.51, 0.0]], dtype=np.float32),
            },
            {
                "manifest": {"index_label": "Beta", "model": "m2"},
                "metadata": [
                    {"row": 10, "text": "beta-1", "metadata": {"title": "B1"}},
                    {"row": 11, "text": "beta-2", "metadata": {"title": "B2"}},
                ],
                "search_texts": ("trecho beta um", "trecho beta dois"),
                "embeddings": np.array([[0.88, 0.0], [0.77, 0.0]], dtype=np.float32),
            },
        ]

        total_indexes, total, lexical_filtered_count, min_recommended_score, max_recommended_score, rag_context, groups = search_semantic_overview_with_total(
            "cosmoetica",
            limit=3,
            api_key="key",
            min_score=0.0,
        )

        self.assertEqual(total_indexes, 2)
        self.assertEqual(total, 4)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(min_recommended_score, 0.25)
        self.assertEqual(max_recommended_score, 0.25)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual([group["indexId"] for group in groups], ["alpha", "beta"])
        self.assertEqual(groups[0]["matches"][0]["text"], "alpha-1")
        self.assertEqual(groups[1]["matches"][0]["text"], "beta-1")
        self.assertEqual(groups[1]["matches"][1]["text"], "beta-2")
        self.assertEqual(groups[0]["totalFound"], 2)
        self.assertEqual(groups[1]["totalFound"], 2)

    @patch("backend.functions.semantic_search_service.list_semantic_indexes")
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_overview_filters_source_ids(
        self,
        mock_get_query_vector,
        mock_load_index,
        mock_list_indexes,
    ) -> None:
        mock_list_indexes.return_value = [
            {"id": "alpha", "label": "Alpha", "model": "m1"},
            {"id": "beta", "label": "Beta", "model": "m2"},
        ]
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_load_index.return_value = {
            "manifest": {"index_label": "Beta", "model": "m2"},
            "metadata": [
                {"row": 10, "text": "beta-1", "metadata": {"title": "B1"}},
            ],
            "search_texts": ("trecho beta",),
            "embeddings": np.array([[0.88, 0.0]], dtype=np.float32),
        }

        total_indexes, total, _lexical_filtered_count, _min_score, _max_score, _rag_context, groups = search_semantic_overview_with_total(
            "cosmoetica",
            limit=3,
            api_key="key",
            min_score=0.0,
            source_ids=["beta"],
        )

        self.assertEqual(total_indexes, 1)
        self.assertEqual(total, 1)
        self.assertEqual([group["indexId"] for group in groups], ["beta"])
        mock_load_index.assert_called_once_with("beta", use_cache=False)

    @patch("backend.functions.semantic_search_service.list_semantic_indexes")
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_overview_reuses_query_vector_per_model(
        self,
        mock_get_query_vector,
        mock_load_index,
        mock_list_indexes,
    ) -> None:
        mock_list_indexes.return_value = [
            {"id": "alpha", "label": "Alpha", "model": "shared"},
            {"id": "beta", "label": "Beta", "model": "shared"},
        ]
        mock_get_query_vector.side_effect = lambda raw_query, api_key, model, cache=None, semantic_context=None: cache.setdefault(
            model,
            np.array([1.0, 0.0], dtype=np.float32),
        )
        mock_load_index.side_effect = [
            {
                "manifest": {"index_label": "Alpha", "model": "shared"},
                "metadata": [{"row": 1, "text": "alpha", "metadata": {"title": "A"}}],
                "search_texts": ("alpha",),
                "embeddings": np.array([[0.9, 0.0]], dtype=np.float32),
            },
            {
                "manifest": {"index_label": "Beta", "model": "shared"},
                "metadata": [{"row": 2, "text": "beta", "metadata": {"title": "B"}}],
                "search_texts": ("beta",),
                "embeddings": np.array([[0.8, 0.0]], dtype=np.float32),
            },
        ]

        total_indexes, total, lexical_filtered_count, min_recommended_score, max_recommended_score, rag_context, groups = search_semantic_overview_with_total(
            "holopensene",
            limit=2,
            api_key="key",
            min_score=0.0,
        )

        self.assertEqual(total_indexes, 2)
        self.assertEqual(total, 2)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(min_recommended_score, 0.25)
        self.assertEqual(max_recommended_score, 0.25)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual(len(groups), 2)
        self.assertEqual(mock_get_query_vector.call_count, 2)
        first_cache = mock_get_query_vector.call_args_list[0].kwargs["cache"]
        second_cache = mock_get_query_vector.call_args_list[1].kwargs["cache"]
        self.assertIs(first_cache, second_cache)
        self.assertIn("shared", first_cache)

    @patch("backend.functions.semantic_search_service.list_semantic_indexes")
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_overview_skips_invalid_indexes(
        self,
        mock_get_query_vector,
        mock_load_index,
        mock_list_indexes,
    ) -> None:
        mock_list_indexes.return_value = [
            {"id": "broken", "label": "Broken", "model": "m1"},
            {"id": "valid", "label": "Valid", "model": "m1"},
        ]
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_load_index.side_effect = [
            ValueError("old metadata"),
            {
                "manifest": {"index_label": "Valid", "model": "m1"},
                "metadata": [{"row": 3, "text": "valid", "metadata": {"title": "V"}}],
                "search_texts": ("valid",),
                "embeddings": np.array([[0.85, 0.0]], dtype=np.float32),
            },
        ]

        total_indexes, total, lexical_filtered_count, min_recommended_score, max_recommended_score, rag_context, groups = search_semantic_overview_with_total(
            "recin",
            limit=5,
            api_key="key",
            min_score=0.0,
        )

        self.assertEqual(total_indexes, 2)
        self.assertEqual(total, 1)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(min_recommended_score, 0.25)
        self.assertEqual(max_recommended_score, 0.25)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]["indexId"], "valid")

    @patch("backend.functions.semantic_search_service.resolve_semantic_query_context")
    @patch("backend.functions.semantic_search_service.list_semantic_indexes")
    @patch("backend.functions.semantic_search_service._load_semantic_index")
    @patch("backend.functions.semantic_search_service._get_semantic_query_vector")
    def test_semantic_overview_returns_rag_context_when_enabled(
        self,
        mock_get_query_vector,
        mock_load_index,
        mock_list_indexes,
        mock_resolve_semantic_query_context,
    ) -> None:
        mock_list_indexes.return_value = [{"id": "alpha", "label": "Alpha", "model": "m1"}]
        mock_get_query_vector.return_value = np.array([1.0, 0.0], dtype=np.float32)
        mock_resolve_semantic_query_context.return_value = {
            "usedRagContext": True,
            "sourceQuery": "tenepes",
            "vectorStoreIds": ["vs_123"],
            "keyTerms": ["tenepes"],
            "definitions": [{"term": "tenepes", "meaning": "tarefa energetica pessoal"}],
            "relatedTerms": ["assistencialidade"],
            "disambiguatedQuery": "tenepes no contexto da assistencialidade",
            "references": ["WVBooks"],
        }
        mock_load_index.return_value = {
            "manifest": {"index_label": "Alpha", "model": "m1"},
            "metadata": [{"row": 1, "text": "alpha", "metadata": {"title": "A"}}],
            "search_texts": ("alpha",),
            "embeddings": np.array([[0.9, 0.0]], dtype=np.float32),
        }

        total_indexes, total, lexical_filtered_count, min_recommended_score, max_recommended_score, rag_context, groups = search_semantic_overview_with_total(
            "tenepes",
            limit=2,
            api_key="key",
            min_score=0.0,
            use_rag_context=True,
            vector_store_ids=["vs_123"],
        )

        self.assertEqual(total_indexes, 1)
        self.assertEqual(total, 1)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(min_recommended_score, 0.25)
        self.assertEqual(max_recommended_score, 0.25)
        self.assertTrue(rag_context["usedRagContext"])
        self.assertEqual(rag_context["references"], ["WVBooks"])
        self.assertEqual(len(groups), 1)

    @patch("backend.functions.semantic_search_service.list_semantic_indexes")
    def test_semantic_overview_returns_empty_when_no_indexes(self, mock_list_indexes) -> None:
        mock_list_indexes.return_value = []

        total_indexes, total, lexical_filtered_count, min_recommended_score, max_recommended_score, rag_context, groups = search_semantic_overview_with_total("recin", limit=5, api_key="key")

        self.assertEqual(total_indexes, 0)
        self.assertEqual(total, 0)
        self.assertEqual(lexical_filtered_count, 0)
        self.assertEqual(min_recommended_score, 0.25)
        self.assertEqual(max_recommended_score, 0.25)
        self.assertFalse(rag_context["usedRagContext"])
        self.assertEqual(groups, [])


if __name__ == "__main__":
    unittest.main()
