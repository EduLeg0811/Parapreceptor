import unittest
from unittest.mock import patch

from backend.functions.lexical_search_service import list_lexical_book_options, search_lexical_book_with_total, search_lexical_overview_with_total


class LexicalSearchServiceTests(unittest.TestCase):
    def test_list_lexical_book_options_uses_source_book_name(self) -> None:
        with patch("backend.functions.lexical_search_service.load_source_document") as mock_load_source_document:
            options = list_lexical_book_options()

        mock_load_source_document.assert_not_called()
        ccg = next(item for item in options if item["id"] == "CCG")

        self.assertEqual(ccg["label"], "Conscienciograma")
        self.assertEqual(ccg["indexId"], "ccg")

    def test_book_search_includes_pagina_field(self) -> None:
        total, matches = search_lexical_book_with_total("LO", "abdicacoes", 3)

        self.assertGreaterEqual(total, 1)
        self.assertGreaterEqual(len(matches), 1)
        self.assertIn("pagina", matches[0])
        self.assertEqual(matches[0]["pagina"], "41")

    def test_lexical_overview_groups_dynamic_files_and_uses_fallback_label(self) -> None:
        total, groups = search_lexical_overview_with_total("abdicacoes", 3)

        self.assertGreaterEqual(total, 2)
        self.assertGreaterEqual(len(groups), 2)

        group_codes = {group["bookCode"] for group in groups}
        self.assertIn("LO", group_codes)
        self.assertIn("QUEST", group_codes)

        lo_group = next(group for group in groups if group["bookCode"] == "LO")
        quest_group = next(group for group in groups if group["bookCode"] == "QUEST")

        self.assertEqual(lo_group["bookLabel"], "Lexico de Ortopensatas")
        self.assertEqual(lo_group["matches"][0]["pagina"], "41")
        self.assertEqual(quest_group["bookLabel"], "Questoes Mini")
        self.assertEqual(quest_group["fileStem"], "QUEST")
        self.assertGreaterEqual(quest_group["totalFound"], 1)

    def test_lexical_overview_filters_source_ids(self) -> None:
        total, groups = search_lexical_overview_with_total("abdicacoes", 3, source_ids=["lo"])

        self.assertGreaterEqual(total, 1)
        self.assertEqual({group["bookCode"] for group in groups}, {"LO"})

    def test_mini_arlindo_formats_date_and_sentence_window(self) -> None:
        total, matches = search_lexical_book_with_total("MINI_ARLINDO", "racismo", 1)

        self.assertGreaterEqual(total, 1)
        self.assertEqual(len(matches), 1)
        self.assertTrue(matches[0]["text"].startswith("**16/05/2012**: "))
        self.assertIn("Antipodia leva ao racismo.", matches[0]["text"])
        self.assertIn("Há o encantoamento que vira -ismo, o universalismo tem que ser único.", matches[0]["text"])
        self.assertNotIn("O que tenho agora aqui.", matches[0]["text"])

    def test_mini_arlindo_accepts_custom_sentence_window(self) -> None:
        _, matches = search_lexical_book_with_total("MINI_ARLINDO", "racismo", 1, mini_text_window=1)

        self.assertEqual(len(matches), 1)
        self.assertIn("Universalismo procura chegar ao consenso", matches[0]["text"])
        self.assertNotIn("Como pegar quadro sinótico", matches[0]["text"])

    def test_mini_arlindo_zero_sentence_window_keeps_only_match_sentence(self) -> None:
        _, matches = search_lexical_book_with_total("MINI_ARLINDO", "racismo", 1, mini_text_window=0)

        self.assertEqual(matches[0]["text"], "**16/05/2012**: Antipodia leva ao racismo.")


if __name__ == "__main__":
    unittest.main()
