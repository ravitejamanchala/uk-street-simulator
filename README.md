# Elmfield Road — UK Street Simulator

A separate playable 400-metre UK street prototype. Cambridge-inspired architecture on an **original fictional layout**, not a surveyed Cambridge road. It uses actual real-time 3D rendering, not video or a static mockup.

**Live demo:** https://manchala.co.uk/uk-street-simulator/

GitHub Pages URL: https://ravitejamanchala.github.io/uk-street-simulator/ (redirects to the account’s existing custom domain).

The first milestone is deployed for review. The existing `cambridge-learner-driv` repository, deployment, users and billing are untouched.

## Run

Node 24 and Python 3.11+ required for a clean source build. Blender is optional.

```sh
npm ci
python3 -m pip install -r requirements.txt
python3 scripts/generate_assets.py
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:8088/. Assets are generated deterministically from source; no downloads of third-party artwork are required. GitHub Actions generates the GLBs, textures and layout, validates them and deploys `dist/` to GitHub Pages. The deployed `assets/` files are runtime-ready GLBs plus shared PNG textures.

## Drive

- W / up: accelerate. S / down / Space: brake.
- A / D or left / right arrows: steer.
- B: explicit surroundings check. Q / E: indicators.
- C: cockpit, bonnet, chase. R: reset. P / Escape: pause.
- 1 / 2: Drive / Reverse, while stopped with the brake held.
- Mobile: touch steering and pedals, observation and gear buttons. Landscape is recommended.

The car begins with the initial footbrake held until accelerator input. Reverse is selected explicitly; braking cannot select reverse.

## Scope

- Metres throughout: 400 m main street, 6.4 m carriageway, 2 m footways, 140 mm kerbs; 48 m side arm with give-way markings.
- Left-hand traffic, +0.37 m right-hand driver position, 1.22 m eye height, functional rear-view render target.
- Six original house variants with gable, cross-ridge and hip roofs, bay windows, lintels, sills, chimneys, gutters, doors and dormer variation. Near/far GLB LODs.
- Original textured asphalt, normal/roughness maps, restrained repairs, shared detail atlas, drains, gardens, fences, trees, signs, parked and moving cars.
- PBR rendering, filmic tone mapping, natural daylight, shadows and atmospheric fog.
- Keyboard and multitouch handlers, physical rectangle collision response and reset.

## Reference and engine decision

Three.js **0.128.0** is retained. An engine migration was unnecessary for PBR, glTF, instancing and shadows, and would have added regression risk. The old renderer and UI are replaced only in this new repository. `core/` contains byte-identical copies of the supplied controller, automatic drivetrain, vehicle state, network and examiner modules. `docs/reference-manifest.json` records source commit and hashes. No account, subscription, secret, old map data or uncertain-licence vehicle/character asset is copied.

The original examiner's moving-off observation, speed, positioning and collision checks remain. This milestone is one new street practice route, not the original full lesson catalogue. A new physical-contact adapter additionally reports a closing outer-body impact before physical separation prevents deeper overlap; static-object collision response is new. Dimensions and contact thresholds are documented in source/tests.

## Asset generation and Blender

`python3 scripts/generate_assets.py` creates the actual runtime GLBs, PNG maps and layout. Geometry and artwork are original and may be used under CC0-1.0. See `ASSET_SOURCES.md`.

Blender was **not installed** on the development host, so no executed `.blend` is claimed. To produce an editable scene and authoring GLB:

```sh
blender --background --python scripts/blender_scene.py -- --output build/blender
```

Run the Python asset generator first. The Blender script imports the same GLBs at the same metre-scale layout, packs textures, and saves `elmfield-street.blend` and `elmfield-authoring.glb`. It still needs to be executed and checked in Blender. The browser demo does not depend on that optional step.

## Quality and performance

Select Mobile, Balanced or Desktop in the demo. Mobile is capped at a **30 FPS target**, DPR 1.25, 650,000 pixels and 512 px shadows. Desktop targets **60 FPS**, DPR 1.5, at most 2,073,600 pixels and 2048 px shadows. Shared materials and textures, static building batches, prop instancing, distance culling and near/far LODs reduce memory and draw work. Rear-view updates run at 2/3/5 Hz and shadows at 10/15/30 Hz by preset. Desktop starts on Balanced; paused rendering drops to 5 FPS.

Targets: iPhone 13 / Google Pixel 7 at 30 FPS; MacBook Neo (Apple A18 Pro, 8 GB) at 60 FPS. **Physical phones have not been measured.** Desktop and mobile-layout proxy measurements are recorded separately from target-device claims. See `docs/performance.md` and raw `artifacts/*.json` when published. No photorealistic claim is made.

```sh
# Browser tests use installed Chrome plus Playwright WebKit:
npx playwright install webkit
npm run test:browser
npm run benchmark
# Existing installed WebKit runtime, if needed:
PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers TEST_DEVICE=iphone-13-webkit npm run test:browser
BENCH_MOBILE=1 BENCH_ENGINE=webkit npm run benchmark
```

Set `CHROMIUM_PATH` outside the default macOS Chrome installation. `BENCH_HOST` can supply a precise device name; otherwise the benchmark records OS, CPU and memory. Browser tests require the local server. Measurements log the actual renderer, viewport, drawing buffer, sample duration, render-submission FPS, frame intervals, CPU submission time and draw counts. CPU submission time is not GPU frame time.

## Limits

This is a small stylised-to-realistic prototype, not photogrammetry or a photorealistic finished game. Vehicle suspension, tyres, pedestrian AI, full junction traffic and crash deformation are not simulated. Cars and interiors remain simplified. Some props still need more variation and authoring refinement. The old route library and lesson catalogue are not ported. No real-location fidelity, official training approval or physical-mobile frame-rate certification is claimed.
