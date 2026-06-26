import unittest

from backend.functions.semantic_query_expansion import build_semantic_query_variants


class SemanticQueryExpansionTests(unittest.TestCase):
    def test_expands_domain_aliases_and_keeps_original_query(self) -> None:
        variants = build_semantic_query_variants("recin na invexis")

        self.assertGreaterEqual(len(variants), 2)
        self.assertEqual(variants[0][0], "recin na invexis")
        self.assertTrue(any("reciclagem intraconsciencial" in text.lower() for text, _ in variants))
        self.assertTrue(any("inversao existencial" in text.lower() for text, _ in variants))

    def test_returns_only_original_for_queries_without_aliases(self) -> None:
        variants = build_semantic_query_variants("maturidade assistencial")

        self.assertEqual(variants, [("maturidade assistencial", 1.0)])


if __name__ == "__main__":
    unittest.main()
