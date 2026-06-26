import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import openpyxl  # type: ignore

from backend.functions.semantic_index_builder import rebuild_semantic_index


class SemanticIndexBuilderTests(unittest.TestCase):
    def _write_manifest(self, index_dir: Path, payload: dict) -> None:
        (index_dir / "manifest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _write_metadata(self, index_dir: Path, payload: list[dict]) -> None:
        (index_dir / "metadata.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _write_source_xlsx(self, path: Path) -> None:
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "Sheet1"
        sheet.append(["text", "title", "author"])
        sheet.append(["Texto de origem para rebuild semantico.", "Titulo 1", "Autor A"])
        workbook.save(path)
        workbook.close()

    @patch("backend.functions.semantic_index_builder.source_path_for")
    @patch("backend.functions.semantic_index_builder._embed_rows")
    def test_rebuild_uses_source_file_when_available(self, mock_embed_rows, mock_source_path_for) -> None:
        mock_embed_rows.return_value = np.asarray([[1.0, 0.0]], dtype=np.float32)

        with tempfile.TemporaryDirectory() as tmp_dir:
            index_dir = Path(tmp_dir) / "alpha"
            index_dir.mkdir(parents=True, exist_ok=True)
            source_path = Path(tmp_dir) / "source.xlsx"
            source_json_path = Path(tmp_dir) / "alpha.json"
            self._write_source_xlsx(source_path)
            source_json_path.write_text(json.dumps({"records": [], "semantic_chunks": []}, ensure_ascii=False), encoding="utf-8")
            mock_source_path_for.return_value = source_json_path
            self._write_manifest(index_dir, {
                "index_label": "ALPHA",
                "source_file": str(source_path),
                "sheet_name": "Sheet1",
                "text_column": "text",
                "metadata_columns": ["title", "author"],
                "model": "text-embedding-3-small",
            })

            result = rebuild_semantic_index(index_dir, api_key="key")

            self.assertEqual(result["rebuild_basis"], "source_file")
            self.assertIsNone(result["warning"])
            rebuilt_manifest = json.loads((index_dir / "manifest.json").read_text(encoding="utf-8"))
            chunks = json.loads((index_dir / "chunks.json").read_text(encoding="utf-8"))
            self.assertEqual(rebuilt_manifest["rebuild_basis"], "source_file")
            self.assertFalse((index_dir / "metadata.json").exists())
            self.assertTrue((index_dir / "embeddings.npy").exists())
            self.assertEqual(chunks[0]["text"], "Texto de origem para rebuild semantico.")
            self.assertEqual(chunks[0]["metadata"]["title"], "Titulo 1")

    @patch("backend.functions.semantic_index_builder._embed_rows")
    def test_rebuild_accepts_repo_relative_source_file(self, mock_embed_rows) -> None:
        mock_embed_rows.return_value = np.asarray([[1.0, 0.0]], dtype=np.float32)

        with tempfile.TemporaryDirectory(dir=str(Path.cwd())) as tmp_dir:
            tmp_path = Path(tmp_dir)
            index_dir = tmp_path / "gamma"
            index_dir.mkdir(parents=True, exist_ok=True)
            source_path = tmp_path / "source.xlsx"
            self._write_source_xlsx(source_path)
            relative_source = source_path.relative_to(Path.cwd())
            self._write_manifest(index_dir, {
                "index_label": "GAMMA",
                "source_file": str(relative_source).replace("\\", "/"),
                "sheet_name": "Sheet1",
                "text_column": "text",
                "metadata_columns": ["title", "author"],
                "model": "text-embedding-3-small",
            })

            result = rebuild_semantic_index(index_dir, api_key="key")

            self.assertEqual(result["rebuild_basis"], "source_file")
            self.assertFalse((index_dir / "metadata.json").exists())
            self.assertTrue((index_dir / "embeddings.npy").exists())

    @patch("backend.functions.semantic_index_builder._embed_rows")
    def test_rebuild_fails_when_source_file_is_missing(self, mock_embed_rows) -> None:
        mock_embed_rows.return_value = np.asarray([[1.0, 0.0]], dtype=np.float32)

        with tempfile.TemporaryDirectory() as tmp_dir:
            index_dir = Path(tmp_dir) / "beta"
            index_dir.mkdir(parents=True, exist_ok=True)
            missing_source = Path(tmp_dir) / "missing.xlsx"
            self._write_manifest(index_dir, {
                "index_label": "BETA",
                "source_file": str(missing_source),
                "sheet_name": "Sheet1",
                "text_column": "text",
                "metadata_columns": ["title"],
                "model": "text-embedding-3-small",
            })
            self._write_metadata(index_dir, [{"row": 5, "text": "Snapshot atual", "text_plain": "Snapshot atual", "metadata": {"title": "Keep"}}])

            with self.assertRaises(FileNotFoundError) as ctx:
                rebuild_semantic_index(index_dir, api_key="key")

            self.assertIn("Arquivo-fonte do indice nao encontrado", str(ctx.exception))

    @patch("backend.functions.semantic_index_builder.source_path_for")
    @patch("backend.functions.semantic_index_builder.load_source_document")
    @patch("backend.functions.semantic_index_builder._embed_rows")
    def test_rebuild_uses_source_json_records_and_updates_semantic_chunks(self, mock_embed_rows, mock_load_source_document, mock_source_path_for) -> None:
        mock_embed_rows.return_value = np.asarray([[1.0, 0.0]], dtype=np.float32)

        with tempfile.TemporaryDirectory() as tmp_dir:
            index_dir = Path(tmp_dir) / "delta"
            index_dir.mkdir(parents=True, exist_ok=True)
            source_json_path = Path(tmp_dir) / "delta.json"
            source_json_path.write_text(json.dumps({"records": []}, ensure_ascii=False), encoding="utf-8")
            mock_load_source_document.return_value = {
                "records": [
                    {
                        "row": 3,
                        "text": "Texto vindo da fonte JSON.",
                        "text_plain": "Texto vindo da fonte JSON.",
                        "metadata": {"title": "Fonte"},
                    }
                ]
            }
            mock_source_path_for.return_value = source_json_path
            self._write_manifest(index_dir, {
                "index_label": "DELTA",
                "model": "text-embedding-3-small",
            })

            result = rebuild_semantic_index(index_dir, api_key="key")

            chunks = json.loads((index_dir / "chunks.json").read_text(encoding="utf-8"))
            self.assertEqual(result["rebuild_basis"], "source_json")
            self.assertEqual(len(chunks), 1)
            self.assertEqual(chunks[0]["text"], "Texto vindo da fonte JSON.")
            self.assertFalse((index_dir / "metadata.json").exists())


if __name__ == "__main__":
    unittest.main()
