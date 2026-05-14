# MarkerScanner

MarkerScanner is a React Native Android application that detects custom visual markers using OpenCV and extracts them from live camera frames.

The application:

- accesses the device camera
- detects square markers
- corrects orientation
- extracts the marker accurately
- displays processed 300x300 marker images

---

# Features

- React Native Android app
- Real-time camera preview
- OpenCV-based marker detection
- Perspective correction
- Orientation correction
- Accurate cropping
- 300x300 processed output
- Gallery of 20 processed markers

---

# Tech Stack

## Frontend

- React Native
- TypeScript

## Native / Vision

- React Native Vision Camera
- OpenCV Android SDK

## Android

- Kotlin
- CMake
- NDK

---

# Project Structure

```text
MarkerScanner/
├── android/
├── src/
├── docs/
├── App.tsx
├── package.json
└── ...
```

---

# Requirements

| Tool           | Version |
| -------------- | ------- |
| Node.js        | 18+     |
| npm            | 9+      |
| Java JDK       | 17      |
| Android Studio | Latest  |
| Android SDK    | API 34  |

---

# Setup Instructions

Complete Windows setup instructions are available in:

```text
SETUP_WINDOWS.md
```

Follow that guide step-by-step before running the app.

---

# Install Dependencies

```bash
npm install
```

---

# Start Metro Bundler

```bash
npm start
```

---

# Run Android App

```bash
npx react-native run-android
```

---

# Build APK

```bash
cd android
gradlew assembleDebug
```

APK location:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

# Marker Detection Pipeline

The app processes frames using the following steps:

1. Capture camera frame
2. Convert image to grayscale
3. Apply thresholding
4. Detect contours
5. Filter square markers
6. Correct perspective
7. Crop marker
8. Resize to 300x300

---

# OpenCV Setup

Download OpenCV Android SDK:
https://github.com/opencv/opencv/releases

Place the folder beside the project directory:

```text
Projects/
├── MarkerScanner/
└── opencv-android-sdk/
```

---

# Performance Goals

- Fast detection
- Low false positives
- Accurate extraction
- Correct orientation handling

---

# Troubleshooting

## Clean Android Build

```bash
cd android
gradlew clean
```

---

## Reset Metro Cache

```bash
npx react-native start --reset-cache
```

---

## Verify Device Connection

```bash
adb devices
```

---

# License

This project is for educational and internship assignment purposes.
