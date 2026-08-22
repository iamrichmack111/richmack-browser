from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT_ROOT = ROOT / "extensions"
EXPECTED = {"richmack-core", "richmack-extract", "richmack-images", "richmack-email", "richmack-media", "richmack-feed", "richmack-pick", "richmack-automate"}


def main() -> None:
    found = {p.name for p in EXT_ROOT.iterdir() if p.is_dir()}
    missing = EXPECTED - found
    if missing:
        raise SystemExit(f"Missing extension directories: {sorted(missing)}")
    for name in sorted(EXPECTED):
        root = EXT_ROOT / name
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
        assert manifest["manifest_version"] == 3, name
        assert manifest["version"] == "0.6.1", name
        assert manifest.get("name"), name
        action = manifest.get("action", {})
        for icon_path in action.get("default_icon", {}).values():
            assert (root / icon_path).is_file(), f"{name}: missing {icon_path}"
        for icon_path in manifest.get("icons", {}).values():
            assert (root / icon_path).is_file(), f"{name}: missing {icon_path}"
        if action.get("default_popup"):
            assert (root / action["default_popup"]).is_file(), f"{name}: missing popup"
        worker = manifest.get("background", {}).get("service_worker")
        if worker:
            assert (root / worker).is_file(), f"{name}: missing worker {worker}"
    print(f"Validated {len(EXPECTED)} Richmack Manifest V3 extensions")

if __name__ == "__main__":
    main()
