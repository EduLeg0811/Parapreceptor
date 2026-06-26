from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import dotenv_values


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.functions.semantic_index_builder import rebuild_semantic_index  # noqa: E402


SEMANTIC_DIR = ROOT_DIR / "backend" / "Files" / "Semantic"
DOTENV_PATH = ROOT_DIR / ".env"


def _resolve_index_dirs(index_ids: list[str]) -> list[Path]:
    if not index_ids:
        return [item for item in sorted(SEMANTIC_DIR.iterdir(), key=lambda path: path.name.lower()) if item.is_dir()]

    resolved: list[Path] = []
    for index_id in index_ids:
        index_dir = SEMANTIC_DIR / index_id.strip().lower()
        if not index_dir.exists():
            raise FileNotFoundError(f"Indice semantico nao encontrado: {index_id}")
        resolved.append(index_dir)
    return resolved


def _get_openai_api_key() -> str:
    if not DOTENV_PATH.exists():
        return ""
    values = dotenv_values(DOTENV_PATH)
    return str(values.get("OPENAI_API_KEY") or "").strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Reconstrui indices semanticos com rechunking e novos embeddings.")
    parser.add_argument("index_ids", nargs="*", help="IDs dos indices para reconstruir. Sem argumentos, processa todos.")
    parser.add_argument("--batch-size", type=int, default=64, help="Tamanho do lote de embeddings.")
    parser.add_argument("--target-chars", type=int, default=280, help="Tamanho alvo de caracteres por chunk.")
    parser.add_argument("--max-chars", type=int, default=420, help="Tamanho maximo de caracteres por chunk.")
    parser.add_argument("--min-chars", type=int, default=110, help="Tamanho minimo de caracteres por chunk.")
    parser.add_argument("--require-source-file", action="store_true", help="Falha se o source_file do manifest nao existir.")
    args = parser.parse_args()

    api_key = _get_openai_api_key()
    if not api_key:
        print(f"OPENAI_API_KEY nao configurada em {DOTENV_PATH}.", file=sys.stderr)
        return 1

    index_dirs = _resolve_index_dirs(args.index_ids)
    if not index_dirs:
        print("Nenhum indice semantico encontrado.", file=sys.stderr)
        return 1

    for index_dir in index_dirs:
        result = rebuild_semantic_index(
            index_dir,
            api_key=api_key,
            batch_size=args.batch_size,
            target_chars=args.target_chars,
            max_chars=args.max_chars,
            min_chars=args.min_chars,
            require_source_file=args.require_source_file,
        )
        print(
            f"{result['index_id']}: {result['rows_before']} -> {result['rows_after']} chunks "
            f"| basis={result['rebuild_basis']} "
            f"| recommended_min_score={result['recommended_min_score']:.2f}"
        )
        if result.get("warning"):
            print(f"warning: {result['index_id']}: {result['warning']}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
