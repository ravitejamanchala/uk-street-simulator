# Evaluation in progress

Targets: 30 FPS on physical iPhone 13 / Google Pixel 7, 60 FPS on MacBook Neo (Apple A18 Pro, 8 GB RAM) with Chrome at 1440 x 900. Physical phones are not connected and their target FPS remains unverified.

Functional browser checks passed in desktop Chrome, Android-sized Chrome, iPhone 13 WebKit emulation and landscape Chrome. These run on the Mac host and do not establish physical phone performance.

Early, short hardware-accelerated desktop samples reached about 59–60 render submissions/sec. A longer, warm-up-excluded moving benchmark is being completed and will replace this preliminary statement. Raw results include actual GPU strings, viewport, drawing-buffer dimensions, duration, FPS and CPU submission costs. CPU submission cost is not GPU timing. Emulation results are labelled as proxies.
