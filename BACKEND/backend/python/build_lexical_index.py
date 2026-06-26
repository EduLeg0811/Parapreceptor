from __future__ import annotations

from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.functions.lookup_citations_service import INDEX_CACHE_PATH, carregar_indice_lexical


def main() -> None:
    indice = carregar_indice_lexical()
    cache_path = Path(INDEX_CACHE_PATH)
    size_mb = cache_path.stat().st_size / (1024 * 1024) if cache_path.exists() else 0.0

    print(
        "Lexical index ready:",
        f"entries={len(indice['entradas'])}",
        f"books={len(indice['arquivos_disponiveis'])}",
        f"tokens={len(indice['indice_tokens'])}",
        f"origin={indice.get('origem_indice', 'memoria')}",
        f"cache={cache_path}",
        f"cache_mb={size_mb:.2f}",
    )


if __name__ == "__main__":
    main()
