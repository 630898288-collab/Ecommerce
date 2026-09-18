#!/usr/bin/env python3
"""Validate non-negotiable Philips PPTX template geometry and package structure."""

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
EXPECTED_CX = 9_144_000
EXPECTED_CY = 5_143_500
EXPECTED_COPYRIGHT = (6_319_125, 4_928_616, 1_620_000, 91_440)
EXPECTED_LOGO = (8_268_931, 4_887_110, 649_224, 118_290)


def xfrm_box(node: ET.Element) -> tuple[int, int, int, int] | None:
    xfrm = node.find(f".//{{{A_NS}}}xfrm")
    if xfrm is None:
        return None
    off = xfrm.find(f"{{{A_NS}}}off")
    ext = xfrm.find(f"{{{A_NS}}}ext")
    if off is None or ext is None:
        return None
    return tuple(int(v) for v in (off.attrib["x"], off.attrib["y"], ext.attrib["cx"], ext.attrib["cy"]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pptx", type=Path)
    args = parser.parse_args()
    path = args.pptx.expanduser().resolve()
    failures: list[str] = []

    if not path.is_file():
        raise SystemExit(f"Missing PPTX: {path}")

    with zipfile.ZipFile(path) as package:
        names = set(package.namelist())
        presentation = ET.fromstring(package.read("ppt/presentation.xml"))
        size = presentation.find(f"{{{P_NS}}}sldSz")
        observed_size = (int(size.attrib["cx"]), int(size.attrib["cy"])) if size is not None else None
        if observed_size != (EXPECTED_CX, EXPECTED_CY):
            failures.append(
                f"canvas is {observed_size}, expected {(EXPECTED_CX, EXPECTED_CY)}; do not normalize the 16:9 canvas"
            )

        masters = sorted(n for n in names if n.startswith("ppt/slideMasters/slideMaster") and n.endswith(".xml"))
        layouts = sorted(n for n in names if n.startswith("ppt/slideLayouts/slideLayout") and n.endswith(".xml"))
        if len(masters) != 2:
            failures.append(f"found {len(masters)} slide masters, expected 2")
        if len(layouts) != 44:
            failures.append(f"found {len(layouts)} slide layouts, expected 44")
        if "ppt/slideMasters/slideMaster2.xml" not in names:
            failures.append("missing Philips slideMaster2.xml")
        else:
            master = ET.fromstring(package.read("ppt/slideMasters/slideMaster2.xml"))
            copyright_box = None
            logo_box = None
            for shape in master.findall(f".//{{{P_NS}}}sp"):
                text = "".join(t.text or "" for t in shape.findall(f".//{{{A_NS}}}t"))
                if "Koninklijke Philips N.V." in text:
                    copyright_box = xfrm_box(shape)
                    break
            for picture in master.findall(f".//{{{P_NS}}}pic"):
                box = xfrm_box(picture)
                if box == EXPECTED_LOGO:
                    logo_box = box
                    break
            if copyright_box != EXPECTED_COPYRIGHT:
                failures.append(f"copyright anchor is {copyright_box}, expected {EXPECTED_COPYRIGHT}")
            if logo_box != EXPECTED_LOGO:
                failures.append(f"Philips logo anchor is {logo_box}, expected {EXPECTED_LOGO}")

    if failures:
        for failure in failures:
            print(f"FAIL: {failure}", file=sys.stderr)
        raise SystemExit(1)
    print("PASS: Philips canvas, masters, layouts, copyright, and logo anchors are intact")


if __name__ == "__main__":
    main()
