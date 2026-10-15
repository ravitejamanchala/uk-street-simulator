# Performance evaluation — 15 October 2026

Targets remain 30 FPS on physical iPhone 13 / Google Pixel 7 and 60 FPS on MacBook Neo, Apple A18 Pro, 8 GB RAM. Physical phones were unavailable; no physical mobile FPS is claimed.

## Initial published build, before lag optimisation

Live URL: https://manchala.co.uk/uk-street-simulator/. Chrome 155, hardware ANGLE Metal / Apple A18 Pro, headless rendering, 1440 × 900 viewport. Each sample excludes 3 seconds warm-up and includes about 30 seconds driving at 18 mph. These are render submissions, not display presentation or GPU frame timings. Other desktop applications were open, including the user's live demo; the test was not an isolated device benchmark.

| Preset | Actual average FPS | Frame interval p95 | CPU render submission p95 | Buffer |
|---|---:|---:|---:|---|
| Desktop | 59.40 | 16.7 ms | 5.1 ms | 1440 × 900 |
| Balanced | 60.00 | 16.7 ms | 3.3 ms | 1414 × 883 |
| Mobile, Mac viewport | 30.00 | 33.4 ms | 3.7 ms | 1019 × 637 |

A 30-second iPhone 13 WebKit **emulation on the same Mac**, not a phone, averaged 29.65 FPS with p95 frame interval 40 ms and p95 CPU submission 4 ms, 487 × 830 buffer. This does not verify physical iOS performance or smooth presentation. The initial live build still felt laggy to the user despite favourable averaged headless results; averages alone do not establish smooth interactive performance.

Raw initial results: `artifacts/performance-before-optimisation.json` and `artifacts/performance-webkit-iphone-proxy.json`.

## Lag fixes

Static buildings now batch all six variants into shared material meshes per 50 m chunk. Trees, lamps and repeated props still use instancing. Near/far LODs and distance culling remain. The rear-view update rate is now 2/3/5 Hz, shadow refresh is capped at 10/15/30 Hz, paused/intro rendering is capped at 5 FPS, and desktop defaults to Balanced. Fixed 60 Hz driving physics remains unchanged. Touch and keyboard controls, reset, collision blocking and examiner faults passed again in desktop Chrome, Pixel 7 layout, iPhone 13 WebKit emulation and landscape Chrome.

At the same stationary starting view, the rear-view pass dropped from 147 to 38 draw calls; desktop CPU submission p95 dropped from 3.9 to 2.4 ms in functional checks. Those short functional samples are not a warmed benchmark. A post-fix moving measurement is recorded separately when complete. Physical phone testing and interactive frame pacing still need evaluation.
