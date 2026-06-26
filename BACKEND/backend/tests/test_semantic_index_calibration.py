import unittest

import numpy as np

from backend.functions.semantic_index_calibration import compute_similarity_stats, recommend_min_score


class SemanticIndexCalibrationTests(unittest.TestCase):
    def test_recommend_min_score_uses_p99_plus_margin_with_ceiling(self) -> None:
        score = recommend_min_score({"p99": 0.4968})
        self.assertEqual(score, 0.52)

    def test_compute_similarity_stats_returns_percentiles_for_normalized_embeddings(self) -> None:
        embeddings = np.asarray(
            [
                [1.0, 0.0],
                [0.0, 1.0],
                [0.70710677, 0.70710677],
                [-1.0, 0.0],
            ],
            dtype=np.float32,
        )

        stats = compute_similarity_stats(embeddings, sample_pairs=20, seed=0)

        self.assertEqual(stats["rows"], 4)
        self.assertGreater(stats["samplePairs"], 0)
        self.assertIn("p99", stats)
        self.assertLessEqual(stats["p99"], 1.0)


if __name__ == "__main__":
    unittest.main()
