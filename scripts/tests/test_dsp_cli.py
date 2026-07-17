"""Pytest suite for scripts/dsp-cli.py (Data Structure Protocol)."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
CLI = SCRIPTS_DIR / "dsp-cli.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("dsp_cli", CLI)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_cli(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CLI), "--root", str(root), *args],
        capture_output=True,
        text=True,
        check=False,
    )


class TestDescriptionParsing:
    def test_parse_and_serialize_round_trip(self):
        mod = _load_module()
        text = "source: src/foo.ts\nkind: object\npurpose: demo\n"
        parsed = mod._parse_desc(text)
        assert parsed["source"] == "src/foo.ts"
        assert parsed["kind"] == "object"
        assert parsed["purpose"] == "demo"
        reserialized = mod._serialize_desc(parsed)
        assert "source: src/foo.ts" in reserialized
        assert "purpose: demo" in reserialized

    def test_parse_import_line_with_via(self):
        mod = _load_module()
        uid, via = mod._parse_import_line("obj-deadbeef via=obj-cafebabe")
        assert uid == "obj-deadbeef"
        assert via == "obj-cafebabe"

    def test_scope_matches_subtree(self):
        mod = _load_module()
        assert mod._scope_matches("packages/shared", "packages/shared/utils.ts")
        assert not mod._scope_matches("packages/shared", "apps/web/page.tsx")


class TestStore:
    def test_entity_exists_rejects_invalid_uid(self, tmp_path: Path):
        mod = _load_module()
        store = mod.Store(tmp_path)
        store.base.mkdir(parents=True)
        assert store.entity_exists("not-a-uid") is False

    def test_write_and_read_description(self, tmp_path: Path):
        mod = _load_module()
        store = mod.Store(tmp_path)
        store.base.mkdir(parents=True)
        (store.base / "obj-12345678").mkdir()
        fields = {"source": "src/a.ts", "kind": "object", "purpose": "test entity"}
        store.write_desc("obj-12345678", fields)
        assert store.read_desc("obj-12345678")["purpose"] == "test entity"


class TestRevCache:
    def test_rebuild_and_importers_of(self, dsp_engine):
        mod = _load_module()
        importer = dsp_engine.create_object("src/importer.ts", "importer")
        imported = dsp_engine.create_object("src/imported.ts", "imported")
        dsp_engine.add_import(importer, imported, "importer depends on imported")
        dsp_engine.rebuild_cache()
        rev = mod.RevCache(dsp_engine.s)
        assert importer in rev.importers_of(imported)


class TestEngineGraph:
    def test_create_object_and_find_by_source(self, dsp_engine):
        uid = dsp_engine.create_object("src/module.ts", "module entry")
        found = dsp_engine.find_by_source("src/module.ts")
        assert uid in found

    def test_add_import_and_get_children(self, dsp_engine):
        parent = dsp_engine.create_object("src/parent.ts", "parent")
        child = dsp_engine.create_object("src/child.ts", "child")
        dsp_engine.add_import(parent, child, "parent uses child")
        tree = dsp_engine.get_children(parent, depth=1)
        assert tree["uid"] == parent
        assert any(c["uid"] == child for c in tree.get("children", []))

    def test_detect_cycles_reports_none_for_dag(self, dsp_engine):
        a = dsp_engine.create_object("src/x.ts", "x")
        b = dsp_engine.create_object("src/y.ts", "y")
        dsp_engine.add_import(a, b, "a imports b")
        cycles = dsp_engine.detect_cycles()
        assert cycles == []

    def test_get_path_between_entities(self, dsp_engine):
        a = dsp_engine.create_object("src/one.ts", "one")
        b = dsp_engine.create_object("src/two.ts", "two")
        dsp_engine.add_import(a, b, "one imports two")
        path = dsp_engine.get_path(a, b)
        assert path == [a, b]

    def test_search_finds_purpose_text(self, dsp_engine):
        uid = dsp_engine.create_object("src/search.ts", "unique purpose marker xyzzy")
        hits = dsp_engine.search("xyzzy")
        assert any(h["uid"] == uid for h in hits)

    def test_remove_entity_cleans_references(self, dsp_engine):
        a = dsp_engine.create_object("src/keep.ts", "keep")
        b = dsp_engine.create_object("src/remove.ts", "remove me")
        dsp_engine.add_import(a, b, "temporary edge")
        dsp_engine.remove_entity(b)
        assert not dsp_engine.s.entity_exists(b)
        orphans = dsp_engine.get_orphans()
        assert b not in orphans


class TestCliDispatch:
    def test_init_creates_dsp_directory(self, tmp_path: Path):
        result = _run_cli(tmp_path, "init")
        assert result.returncode == 0, result.stderr
        assert (tmp_path / ".dsp").is_dir()

    def test_create_object_via_cli(self, tmp_path: Path):
        _run_cli(tmp_path, "init")
        result = _run_cli(tmp_path, "create-object", "src/cli.ts", "cli created entity")
        assert result.returncode == 0, result.stderr
        assert "obj-" in result.stdout

    def test_detect_cycles_via_cli(self, tmp_path: Path):
        _run_cli(tmp_path, "init")
        out_a = _run_cli(tmp_path, "create-object", "src/a.ts", "a")
        out_b = _run_cli(tmp_path, "create-object", "src/b.ts", "b")
        uid_a = out_a.stdout.strip().splitlines()[-1]
        uid_b = out_b.stdout.strip().splitlines()[-1]
        _run_cli(tmp_path, "add-import", uid_a, uid_b, "a imports b")
        cycles = _run_cli(tmp_path, "detect-cycles")
        assert cycles.returncode == 0
