from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.functions.semantic_index_calibration import (  # noqa: E402
    CALIBRATION_MARGIN,
    CALIBRATION_RANDOM_SEED,
    CALIBRATION_SAMPLE_PAIRS,
    build_calibration_payload,
    compute_similarity_stats,
    load_embeddings_for_calibration,
    recommend_min_score,
)


SEMANTIC_DIR = ROOT_DIR / "backend" / "Files" / "Semantic"


def recalibrate_manifest(index_dir: Path) -> dict[str, float]:
    manifest_path = index_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest nao encontrado: {manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    embeddings = load_embeddings_for_calibration(index_dir)
    stats = compute_similarity_stats(
        embeddings,
        sample_pairs=CALIBRATION_SAMPLE_PAIRS,
        seed=CALIBRATION_RANDOM_SEED,
    )
    recommended = recommend_min_score(stats, margin=CALIBRATION_MARGIN)
    manifest["recommended_min_score"] = recommended
    manifest["score_calibration"] = build_calibration_payload(
        stats,
        margin=CALIBRATION_MARGIN,
        seed=CALIBRATION_RANDOM_SEED,
    )
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {
        "recommended_min_score": recommended,
        "p99": float(stats["p99"]),
        "rows": float(stats["rows"]),
    }


def main(argv: list[str]) -> int:
    requested_ids = {(item or "").strip().lower() for item in argv[1:] if (item or "").strip()}
    index_dirs = [
        path
        for path in sorted(SEMANTIC_DIR.iterdir(), key=lambda item: item.name.lower())
        if path.is_dir() and (not requested_ids or path.name.lower() in requested_ids)
    ]
    if not index_dirs:
        print("Nenhum indice semantico encontrado para recalibracao.", file=sys.stderr)
        return 1

    for index_dir in index_dirs:
        result = recalibrate_manifest(index_dir)
        print(
            f"{index_dir.name}: recommended_min_score={result['recommended_min_score']:.2f} "
            f"(p99={result['p99']:.4f}, rows={int(result['rows'])})"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
