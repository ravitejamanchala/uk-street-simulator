# Asset provenance

| Asset | Source | Licence / status |
|---|---|---|
| House geometry: six variants, high and low LOD | Original `scripts/generate_assets.py` | CC0-1.0 |
| Car, four wheels, trees, streetlight | Original Python geometry generator | CC0-1.0 |
| Brick, tarmac, paving, roof, normal and roughness maps | Original deterministic NumPy/Pillow procedural artwork | CC0-1.0 |
| Detail atlas: windows, doors, plates, drains | Original Pillow artwork; bundled default-font raster glyphs, no font files redistributed | CC0-1.0 for original artwork; Pillow retains its upstream licence |
| Cockpit, signs, sky, environment details | Original code-generated geometry, shaders and canvas artwork | MIT source; CC0-1.0 generated geometry/artwork |
| Street layout | Original seeded design, `layout.json` | CC0-1.0; not geographic survey data |
| Controller, vehicle state, automatic drivetrain, network, examiner | `ravitejamanchala/cambridge-learner-driv`, commit `d28a646a9a11d5c8d19e2dfa969612da60b97665` | Copied at the repository owner's request. No upstream licence file was present; retained separately in `core/`, provenance/hash manifest included. No claim of independently relicensing upstream code. |
| Three.js 0.128.0 | https://github.com/mrdoob/three.js/tree/r128 | MIT |
| NumPy / Pillow | https://numpy.org/ and https://python-pillow.org/ | BSD-3-Clause / HPND (dependencies only) |

No existing supplied OBJ/GLB car or character was copied because its asset licence was not recorded. No Google Street View imagery, map tiles, AI-generated imagery, video or third-party photographic texture is included.

UK marking/sign design reference: [DfT Traffic Signs Manual Chapter 5](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/773421/traffic-signs-manual-chapter-05.pdf) and [Highway Code road markings](https://www.gov.uk/guidance/the-highway-code/road-markings). Graphics are newly drawn, schematic practice approximations; they are not certified road designs or copied PDF images. Reference publication is Crown copyright under the Open Government Licence where stated by the publisher.
