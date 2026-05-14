# MarkerScanner

**Custom Visual Marker Detection System**
React Native · Android · OpenCV · VisionCamera

---

## Overview

MarkerScanner is a production-grade Android application that:

- Streams a live camera preview at 2000–3000px resolution
- Detects a custom black-and-white square marker in real time
- Performs perspective correction using OpenCV `warpPerspective`
- Normalises orientation via a 3-anchor asymmetric pattern
- Outputs exactly **300×300 pixel** PNG images
- Collects 20 processed marker images displayed in a gallery

---

## Folder Structure

```
MarkerScanner/
├── App.tsx                            # Root component
├── index.js                           # Entry point
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
│
├── src/
│   ├── types/index.ts                 # All TypeScript types
│   ├── constants/index.ts             # Colors, sizes, thresholds
│   ├── store/useScannerStore.ts       # Zustand global state
│   ├── navigation/RootNavigator.tsx   # Navigation stack
│   ├── hooks/
│   │   └── useMarkerDetection.ts      # Camera + detection hook
│   ├── screens/
│   │   ├── ScannerScreen.tsx          # Camera preview + HUD
│   │   └── GalleryScreen.tsx          # 20-marker grid
│   ├── components/
│   │   ├── DetectionOverlay.tsx       # Skia bounding box
│   │   ├── StatusBadge.tsx            # Animated status indicator
│   │   └── ProgressBar.tsx            # Animated progress
│   └── utils/
│       └── uuid.ts                    # UUID generator
│
├── android/
│   ├── build.gradle                   # Root Gradle config
│   ├── settings.gradle
│   ├── gradle.properties
│   └── app/
│       ├── build.gradle               # App Gradle (OpenCV, NDK, CMake)
│       └── src/main/
│           ├── AndroidManifest.xml    # Camera permissions
│           ├── cpp/
│           │   ├── CMakeLists.txt     # Native build config
│           │   ├── MarkerDetector.h   # C++ detector API
│           │   ├── MarkerDetector.cpp # Full OpenCV pipeline
│           │   └── MarkerDetectorJni.cpp # JNI bridge
│           ├── java/com/markerscanner/
│           │   ├── MainApplication.kt
│           │   ├── MainActivity.kt
│           │   ├── MarkerScannerPackage.kt
│           │   ├── opencv/
│           │   │   └── MarkerDetectorModule.kt  # RN Native Module
│           │   └── camera/
│           │       └── MarkerDetectorPlugin.kt  # VisionCamera Plugin
│           └── res/
│               └── values/
│                   ├── strings.xml
│                   └── styles.xml
│
└── docs/
    ├── marker.svg                     # Printable marker design
    ├── README.md                      # This file
    └── ARCHITECTURE.md                # Architecture deep-dive
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| React Native | 0.75.4 |
| Android Studio | Hedgehog+ |
| Android NDK | 26.1.10909125 |
| CMake | 3.22.1 |
| Java | 17 |
| OpenCV Android SDK | 4.10.0 |

---

## Step 1 — Install OpenCV Android SDK

```bash
# Download OpenCV Android SDK
curl -L https://github.com/opencv/opencv/releases/download/4.10.0/opencv-4.10.0-android-sdk.zip \
  -o opencv-android-sdk.zip

# Extract into project root (sibling of android/)
unzip opencv-android-sdk.zip
mv OpenCV-android-sdk opencv-android-sdk

# Verify structure:
# opencv-android-sdk/
#   sdk/
#     native/
#       jni/include/opencv2/   ← headers
#       libs/arm64-v8a/        ← libopencv_java4.so
#       libs/armeabi-v7a/
#       libs/x86_64/
#     libopencv_java4.aar      ← AAR for Gradle
```

---

## Step 2 — Install JS dependencies

```bash
cd MarkerScanner
npm install
```

---

## Step 3 — Install Pods (iOS — skip for Android-only)

```bash
# Not required for this Android project
```

---

## Step 4 — Configure NDK in Android Studio

1. Open **Android Studio → SDK Manager → SDK Tools**
2. Check **NDK (Side by side)** version `26.1.10909125`
3. Check **CMake** version `3.22.1`
4. Click **Apply**

---

## Step 5 — Build and run (debug)

```bash
# Start Metro bundler
npm start

# In a second terminal:
npm run android
```

Or using Android Studio:
1. Open `android/` as a project
2. Wait for Gradle sync
3. Select your device / emulator
4. Click **Run**

---

## Step 6 — Build release APK

```bash
# Generate a signing keystore (first time only)
cd android/app
keytool -genkey -v \
  -keystore release.keystore \
  -alias markerscanner \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Add to android/gradle.properties:
# MYAPP_UPLOAD_STORE_FILE=release.keystore
# MYAPP_UPLOAD_STORE_PASSWORD=your_password
# MYAPP_UPLOAD_KEY_ALIAS=markerscanner
# MYAPP_UPLOAD_KEY_PASSWORD=your_password

# Build release APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Printing the Marker

1. Open `docs/marker.svg` in a browser or vector editor
2. Print at **100% scale** on plain white paper
3. Recommended size: **70mm × 70mm** minimum, **150mm × 150mm** ideal
4. Use black ink only; avoid grey or coloured toner
5. Laminating improves durability and reduces glare

---

## How Detection Works

See `docs/ARCHITECTURE.md` for the full technical explanation.

**Quick summary:**

1. Camera streams at ~2–3MP via VisionCamera
2. Every 2nd frame passes to the native C++ pipeline
3. OpenCV converts to grayscale → adaptive threshold
4. Contour detection finds quadrilateral candidates
5. Geometric filters eliminate false positives (area, aspect ratio, solidity)
6. Perspective warp produces a 300×300 canonical image
7. 7×7 grid sampling validates the unique marker pattern (3 anchors + timing strip)
8. Missing 4th anchor determines orientation → rotate if needed
9. Final 300×300 PNG is Base64-encoded and passed to React Native
10. JS stores up to 20 captures, then stops scanning

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `MarkerDetectorModule not found` | Rebuild the app after adding native module |
| `libopencv_java4.so not found` | Check `OPENCV_ANDROID_SDK` path in `build.gradle` |
| Blank camera preview | Grant camera permission in device Settings |
| `CMake error: cannot find opencv headers` | Re-extract OpenCV SDK and verify path |
| False positives (detecting wrong squares) | Increase `MIN_CONFIDENCE` in `constants/index.ts` |
| App crashes on older devices | Check `minSdkVersion` is 24 in `build.gradle` |

---

## License

MIT — for educational / assignment purposes.
