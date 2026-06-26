import unittest
from unittest.mock import patch

from backend.functions.semantic_query_context_service import resolve_semantic_query_context


class SemanticQueryContextServiceTests(unittest.TestCase):
    @patch("backend.functions.semantic_query_context_service.execute_llm_request")
    def test_resolve_semantic_query_context_parses_json_response(self, mock_execute_llm_request) -> None:
        mock_execute_llm_request.return_value = {
            "request": {"model": "gpt-5.4-mini", "input": [{"role": "user", "content": "tenepes"}]},
            "raw": {"model": "gpt-5.4-mini", "status": "completed", "usage": {"input_tokens": 12, "output_tokens": 34}},
            "content": (
                '{"definitions":[{"term":"tenepes","meaning":"tarefa energetica pessoal"}],'
                '"related_terms":["assistencialidade","interassistencia"],'
                '"disambiguated_query":"tenepes no contexto da assistencialidade conscienciologica"}'
            ),
            "references": ["WVBooks", "Verbetes Waldo Vieira"],
        }

        result = resolve_semantic_query_context(
            "tenepes e assistencia",
            api_key="key",
            vector_store_ids=["vs_123"],
        )

        self.assertTrue(result["usedRagContext"])
        self.assertEqual(result["sourceQuery"], "tenepes e assistencia")
        self.assertEqual(result["definitions"][0]["term"], "tenepes")
        self.assertIn("assistencialidade", result["relatedTerms"])
        self.assertEqual(result["references"][0], "WVBooks")
        self.assertEqual(result["llmLog"]["request"], mock_execute_llm_request.return_value["request"])
        self.assertEqual(result["llmLog"]["response"]["content"], mock_execute_llm_request.return_value["content"])
        self.assertEqual(result["llmLog"]["response"]["meta"]["model"], "gpt-5.4-mini")
        self.assertEqual(result["llmLog"]["response"]["meta"]["rag_references"], ["WVBooks", "Verbetes Waldo Vieira"])

    def test_resolve_semantic_query_context_returns_empty_without_vector_store(self) -> None:
        result = resolve_semantic_query_context(
            "recin e invexis",
            api_key="key",
            vector_store_ids=[],
        )

        self.assertFalse(result["usedRagContext"])
        self.assertEqual(result["definitions"], [])
        self.assertEqual(result["relatedTerms"], [])
        self.assertEqual(result["disambiguatedQuery"], "")
        self.assertIsNone(result["llmLog"])


if __name__ == "__main__":
    unittest.main()
