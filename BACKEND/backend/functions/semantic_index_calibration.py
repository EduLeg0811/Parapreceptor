from __future__ import annotations

import math
import time
from pathlib import Path
from typing import Any

import numpy as np


DEFAULT_MIN_SCORE = 0.25
CALIBRATION_VERSION = 1
CALIBRATION_MARGIN = 0.02
CALIBRATION_SAMPLE_PAIRS = 5000
CALIBRATION_RANDOM_SEED = 0


def load_embeddings_for_calibration(index_dir: Path) -> np.ndarray:
    embeddings_path = index_dir / "embeddings.npy"
    if not embeddings_path.exists():
        raise FileNotFoundError(f"Arquivo de embeddings nao encontrado: {embeddings_path}")
    return np.load(embeddings_path, mmap_mode="r")


def compute_similarity_stats(
    embeddings: np.ndarray,
    sample_pairs: int = CALIBRATION_SAMPLE_PAIRS,
    seed: int = CALIBRATION_RANDOM_SEED,
) -> dict[str, Any]:
    if embeddings.ndim != 2:
        raise ValueError("Embeddings invalidos para calibracao.")

    rows = int(embeddings.shape[0])
    if rows <= 1:
        return {
            "rows": rows,
            "samplePairs": 0,
            "mean": 0.0,
            "p95": 0.0,
            "p99": 0.0,
            "p999": 0.0,
            "max": 0.0,
        }

    target_pairs = min(max(500, rows * 2), max(1, int(sample_pairs or CALIBRATION_SAMPLE_PAIRS)))
    rng = np.random.default_rng(seed)
    left = rng.integers(0, rows, size=target_pairs, endpoint=False)
    right = rng.integers(0, rows, size=target_pairs, endpoint=False)
    mask = left != right
    left = left[mask]
    right = right[mask]
    if left.size == 0:
        return {
            "rows": rows,
            "samplePairs": 0,
            "mean": 0.0,
            "p95": 0.0,
            "p99": 0.0,
            "p999": 0.0,
            "max": 0.0,
        }

    similarities = np.sum(embeddings[left] * embeddings[right], axis=1, dtype=np.float32)
    return {
        "rows": rows,
        "samplePairs": int(similarities.size),
        "mean": float(np.mean(similarities)),
        "p95": float(np.percentile(similarities, 95)),
        "p99": float(np.percentile(similarities, 99)),
        "p999": float(np.percentile(similarities, 99.9)),
        "max": float(np.max(similarities)),
    }


def recommend_min_score(stats: dict[str, Any], margin: float = CALIBRATION_MARGIN) -> float:
    base = float(stats.get("p99") or 0.0) + max(0.0, float(margin or 0.0))
    # Bias upward slightly to avoid admitting the noisy tail for each base.
    recommended = math.ceil(base * 100.0) / 100.0
    return max(DEFAULT_MIN_SCORE, min(1.0, recommended))


def build_calibration_payload(
    stats: dict[str, Any],
    *,
    margin: float = CALIBRATION_MARGIN,
    seed: int = CALIBRATION_RANDOM_SEED,
    calibrated_at: str | None = None,
) -> dict[str, Any]:
    return {
        "version": CALIBRATION_VERSION,
        "method": "random_pair_p99_plus_margin",
        "margin": float(margin),
        "seed": int(seed),
        "samplePairs": int(stats.get("samplePairs") or 0),
        "rows": int(stats.get("rows") or 0),
        "meanSimilarity": float(stats.get("mean") or 0.0),
        "p95Similarity": float(stats.get("p95") or 0.0),
        "p99Similarity": float(stats.get("p99") or 0.0),
        "p999Similarity": float(stats.get("p999") or 0.0),
        "maxSimilarity": float(stats.get("max") or 0.0),
        "calibratedAt": calibrated_at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
