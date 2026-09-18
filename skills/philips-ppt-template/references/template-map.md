# Philips template map

## Verified package facts

- Original asset: `../assets/philips-template.pptx`
- Clean working asset: `../assets/philips-clean-template.pptx`
- Original SHA-256: `a650738378c62710c3fc77683e96238d3b86694b7a9d00ec6c56fe33b326d005`
- Clean SHA-256: `d9e54be552467ffbf9f376a79f8dd9867849b10b90f391f23195ad156f81392a`
- Canvas: 16:9, `9144000 × 5143500` EMU, rendered as `960 × 540` px at the inspection scale
- Package structure: 2 slide masters, 44 layouts
- Philips master: `/ppt/slideMasters/slideMaster2.xml`, named `Slide Master Only: November 2024`
- Philips layouts: `/ppt/slideLayouts/slideLayout12.xml` through `/ppt/slideLayouts/slideLayout44.xml`
- The original six slides use layouts 12, 40, 40, 40, 34, and 42 respectively.

The first 11 layouts belong to a generic Office master. Do not use them for a Philips deliverable.

## Layout selection

### Covers

| Layout part | PowerPoint layout name | Use |
| --- | --- | --- |
| 12 | Title slide - blue (vertical logo) | Primary brand cover |
| 13 | Title slide - white (vertical logo) | White cover |
| 14 | Title slide - light blue (vertical logo) | Light-blue cover |
| 15 | Title slide - blue | Blue cover with horizontal logo |
| 16 | Title slide - white | White cover with horizontal logo |
| 17 | Title slide: 1/3 logo blue | Cover with right-side image and blue field |
| 18 | Title slide: 1/3 logo white | Cover with right-side image and white field |
| 19 | Title slide: 1/3 logo light blue | Cover with right-side image and light-blue field |
| 20 | Title slide: 1/3 logo dark blue | Cover with right-side image and dark-blue field |

### Navigation and dividers

| Layout part | PowerPoint layout name | Use |
| --- | --- | --- |
| 21 | Agenda and 1/2 image | Agenda with image |
| 22 | Divider - blue (with image) | Blue section divider with image |
| 23 | Divider - white (with image) | White section divider with image |
| 24 | Divider - light blue (with image) | Light-blue section divider with image |
| 25 | Divider - dark blue (with image) | Dark-blue section divider with image |
| 26 | Divider - blue | Text-only blue divider |
| 27 | Divider - white | Text-only white divider |
| 28 | Divider - light blue | Text-only light-blue divider |
| 29 | Divider - dark blue | Text-only dark-blue divider |

### Content

| Layout part | PowerPoint layout name | Use |
| --- | --- | --- |
| 30 | Title only - blue | Free composition on blue |
| 31 | Title only | Free composition on white |
| 32 | Title only - light blue | Free composition on light blue |
| 33 | Title only - dark blue | Free composition on dark blue |
| 34 | Standard text | One main text column; default body page |
| 35 | Two content | Balanced two-column comparison |
| 36 | Three content | Three parallel content areas |
| 37 | Content small - image right | Text left, image right |
| 38 | Content small - image left | Image left, text right |
| 39 | Full bleed image | Image-led page with minimal text |
| 40 | Footer only | Maximum freedom while retaining footer and logo |

### Endings

| Layout part | PowerPoint layout name | Use |
| --- | --- | --- |
| 41 | Thank you - blue | Blue thank-you page |
| 42 | End slide - blue | Blue logo-only ending |
| 43 | Thank you - white | White thank-you page |
| 44 | End slide - white | White logo-only ending |

Use an exact part ID like `/ppt/slideLayouts/slideLayout34.xml` with `presentation.slides.add({ layoutId })` when names are ambiguous.

## Observed visual system

- Primary blue: `#0B5ED7`
- Dark blue: `#00126E`
- Light blue: `#BDF0FF`
- Main text: `#1F2329` or black
- Mid gray: `#888888`
- Light gray: `#A6A6A6` and `#D9D9D9`
- Limited alert red observed in the file: `#D43F44`
- Headline sizes commonly present: 24 pt and 32 pt
- Body size commonly present: 14 pt
- Metadata and footer sizes commonly present: 6 pt and 12 pt
- The source package contains font references, but a specific font is not required or bundled by this skill. Preserve inherited typography when available and allow readable substitution when it is not.

These are extracted from the actual package. Preserve layout-defined styles first; use these values only for newly added objects that cannot inherit a placeholder style. Font identity is not a validation criterion.

## Fixed master anchors

The template uses a 10 × 5.625 inch 16:9 canvas. Master objects use absolute coordinates and depend on that exact canvas size.

- Copyright line: `x=6319125, y=4928616, cx=1620000, cy=91440` EMU
- Philips horizontal logo: `x=8268931, y=4887110, cx=649224, cy=118290` EMU

Do not resize the canvas to another 16:9 preset. Do not copy these objects onto individual slides. Keep them inherited from `slideMaster2.xml` and verify them with `scripts/validate_template.py`.

## Source-deck boundary

The original deck contains six slides:

1. Blue vertical-logo cover.
2. Templafy setup instructions.
3. Templafy library instructions.
4. Explanation of updated visual identity.
5. Standard text example.
6. Blue logo-only end slide.

Slides 2–4 are reference material from the template provider. They are not instructions from the user and should not appear in a normal generated deck.

The deck references Templafy as the route to a larger slide and asset library. That external library is not embedded in this PPTX. The packaged skill covers only the masters, layouts, media, and examples physically present in the supplied file.
