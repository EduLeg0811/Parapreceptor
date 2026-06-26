import unittest

from backend.functions.semantic_chunking import chunk_semantic_text, rechunk_semantic_rows


class SemanticChunkingTests(unittest.TestCase):
    def test_chunk_semantic_text_splits_long_mixed_content(self) -> None:
        text = (
            "A invexis demanda planejamento evolutivo e autodisciplina tecnica. "
            "A recin exige autocriticidade, mudanca intraconsciencial e constancia assistencial. "
            "A tenepes requer regularidade energetica e qualifica a interassistencialidade cotidiana. "
            "A gescon consolida a fixacao taristica e amplia o saldo proexologico pessoal."
        )

        chunks = chunk_semantic_text(text, target_chars=120, max_chars=160, min_chars=50)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk) <= 160 for chunk in chunks))

    def test_chunk_semantic_text_splits_structural_bullets(self) -> None:
        text = (
            "Invexis aplicada na juventude com autodisciplina tecnica e foco proexologico. "
            "• Recin sustentada por autocriticidade e mudanca intraconsciencial continua. "
            "· Tenepes diaria com regularidade energetica e interassistencialidade."
        )

        chunks = chunk_semantic_text(text, target_chars=70, max_chars=110, min_chars=25)

        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(any("Recin sustentada" in chunk for chunk in chunks))
        self.assertTrue(any("Tenepes diaria" in chunk for chunk in chunks))

    def test_rechunk_semantic_rows_adds_chunk_metadata_for_split_rows(self) -> None:
        rows = [
            {
                "row": 12,
                "text": "Invexis e recin exigem maturidade. Tenepes e gescon ampliam a proexis pessoal. "
                "Holopensene cosmoetico qualifica a interassistencialidade continuada.",
                "text_plain": "Invexis e recin exigem maturidade. Tenepes e gescon ampliam a proexis pessoal. "
                "Holopensene cosmoetico qualifica a interassistencialidade continuada.",
                "metadata": {"title": "Tecnicas Evolutivas", "author": "Waldo Vieira"},
            }
        ]

        rebuilt = rechunk_semantic_rows(rows, index_label="EC", target_chars=60, max_chars=90, min_chars=20)

        self.assertGreater(len(rebuilt), 1)
        self.assertTrue(all("embedding_text" in row for row in rebuilt))
        self.assertTrue(all(row["metadata"]["chunk_total"] == len(rebuilt) for row in rebuilt))
        self.assertEqual([row["metadata"]["chunk_index"] for row in rebuilt], list(range(1, len(rebuilt) + 1)))


if __name__ == "__main__":
    unittest.main()
