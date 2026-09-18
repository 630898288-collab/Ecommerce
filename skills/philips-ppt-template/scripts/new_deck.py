#!/usr/bin/env python3
"""Create a verified, non-overwriting working copy of the Philips template."""

from __future__ import annotations

import argparse
import hashlib
import shutil
from pathlib import Path


EXPECTED_SHA256 = "d9e54be552467ffbf9f376a79f8dd9867849b10b90f391f23195ad156f81392a"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Copy the clean Philips PPTX template to a new working file."
    )
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    source = Path(__file__).resolve().parent.parent / "assets" / "philips-clean-template.pptx"
    output = args.output.expanduser().resolve()

    if not source.is_file():
        raise SystemExit(f"Missing packaged template: {source}")
    if sha256(source) != EXPECTED_SHA256:
        raise SystemExit("Packaged clean template checksum does not match the verified asset")
    if output.exists():
        raise SystemExit(f"Refusing to overwrite existing file: {output}")
    if output.suffix.lower() != ".pptx":
        raise SystemExit("--output must end in .pptx")

    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, output)
    if sha256(output) != EXPECTED_SHA256:
        output.unlink(missing_ok=True)
        raise SystemExit("Copied PPTX failed checksum verification")
    print(output)


if __name__ == "__main__":
    main()
