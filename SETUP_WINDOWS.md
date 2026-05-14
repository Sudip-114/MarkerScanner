# MarkerScanner — Windows Setup Guide

Complete setup guide for running the MarkerScanner React Native Android application on Windows.

This guide is written for beginners. Follow every step carefully.

---

# Project Requirements

Before starting, install the following software:

| Software       | Required Version |
| -------------- | ---------------- |
| Node.js        | 18 or higher     |
| npm            | 9 or higher      |
| Java JDK       | 17               |
| Git            | Latest           |
| Android Studio | Latest Stable    |

---

# 1. Install Node.js

Download:
https://nodejs.org/

Install:

- Choose **LTS Version**
- Run the `.msi` installer
- Keep all settings default

Verify installation:

```powershell
node --version
npm --version
```

Expected:

```powershell
v18.x.x
9.x.x
```

---

# 2. Install Java JDK 17

Download:
https://adoptium.net/en-GB/temurin/releases/?version=17

Install:

- Windows x64 Installer
- Keep default settings

Verify:

```powershell
java -version
```

Expected:

```powershell
openjdk version "17.x.x"
```

---

# 3. Install Android Studio

Download:
https://developer.android.com/studio

Install Android Studio with default settings.

---

# 4. Install Android SDK Components

Open Android Studio:

```text
Android Studio → More Actions → SDK Manager
```

Install these:

## SDK Platforms

- Android 14 (API 34)

## SDK Tools

- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator
- Android SDK Command-line Tools
- NDK (Side by side)
- CMake

Recommended versions:

- NDK 26+
- CMake 3.22+

---

# 5. Set Environment Variables

Open PowerShell as Administrator.

---

## Set ANDROID_HOME

Run:

```powershell
[System.Environment]::SetEnvironmentVariable(
"ANDROID_HOME",
"$env:LOCALAPPDATA\Android\Sdk",
"User"
)
```

---

## Set JAVA_HOME

Find Java installation:

```powershell
Get-ChildItem "C:\Program Files\Eclipse Adoptium\"
```

Copy the installed JDK folder path.

Example:

```text
C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot
```

Set JAVA_HOME:

```powershell
[System.Environment]::SetEnvironmentVariable(
"JAVA_HOME",
"C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot",
"User"
)
```

---

## Add Android SDK Tools to PATH

Run:

```powershell
$current = [System.Environment]::GetEnvironmentVariable("PATH", "User")

$additions = ";$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\emulator"

[System.Environment]::SetEnvironmentVariable(
"PATH",
$current + $additions,
"User"
)
```

Close PowerShell and reopen it.

Verify:

```powershell
adb version
echo $env:ANDROID_HOME
echo $env:JAVA_HOME
```

---

# 6. Clone the Project

Clone the GitHub repository:

```powershell
git clone YOUR_GITHUB_REPOSITORY_URL
```

Example:

```powershell
git clone https://github.com/yourusername/MarkerScanner.git
```

Go inside project:

```powershell
cd MarkerScanner
```

---

# 7. Install Project Dependencies

Run:

```powershell
npm install
```

This installs all React Native packages.

---

# 8. Download OpenCV Android SDK

Download OpenCV Android SDK:

https://github.com/opencv/opencv/releases

Recommended:

- OpenCV 4.10.0 Android SDK

Extract it.

Rename folder:

```text
opencv-android-sdk
```

---

# 9. Place OpenCV Folder Correctly

Folder structure MUST look like this:

```text
Projects/
├── MarkerScanner/
└── opencv-android-sdk/
```

NOT inside the project folder.

Correct:

```text
Projects/
├── MarkerScanner/
└── opencv-android-sdk/
```

Wrong:

```text
Projects/
└── MarkerScanner/
    └── opencv-android-sdk/
```

---

# 10. Verify OpenCV Installation

This file must exist:

```text
opencv-android-sdk/sdk/native/libs/arm64-v8a/libopencv_java4.so
```

---

# 11. Create local.properties

Go to:

```text
MarkerScanner/android/
```

Create file:

```text
local.properties
```

Add:

```properties
sdk.dir=C\:/Users/YOUR_USERNAME/AppData/Local/Android/Sdk
```

Replace:

- `YOUR_USERNAME`
  with your Windows username.

Use forward slashes `/`.

---

# 12. Connect Android Device

Enable Developer Mode:

```text
Settings → About Phone → Tap Build Number 7 times
```

Enable:

- USB Debugging

Connect device with USB cable.

Verify connection:

```powershell
adb devices
```

Expected:

```text
List of devices attached
XXXXXXXX device
```

If unauthorized:

- Check your phone
- Tap "Allow USB Debugging"

---

# 13. Start Metro Server

Open terminal inside project:

```powershell
npm start
```

Keep this terminal running.

---

# 14. Run the Android App

Open another terminal.

Run:

```powershell
npx react-native run-android
```

First build may take:

- 5–15 minutes

The app will:

- build
- install on device
- launch automatically

---

# 15. Build APK

To generate APK:

```powershell
cd android
gradlew assembleDebug
```

APK location:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

# Common Errors

---

## Error: SDK location not found

Fix:

- Check `local.properties`
- Verify SDK path is correct

---

## Error: JAVA_HOME not set

Verify:

```powershell
echo $env:JAVA_HOME
```

If empty:

- Set JAVA_HOME correctly

---

## Error: adb not recognized

Restart terminal after setting PATH.

Then run:

```powershell
adb version
```

---

## Error: No devices found

Run:

```powershell
adb kill-server
adb start-server
adb devices
```

---

## Error: Metro cache issue

Run:

```powershell
npx react-native start --reset-cache
```

---

# Recommended Folder Structure

```text
Projects/
├── MarkerScanner/
│   ├── android/
│   ├── src/
│   ├── App.tsx
│   ├── package.json
│   └── ...
│
└── opencv-android-sdk/
    └── sdk/
```

---

# Done

If everything works correctly:

- App launches on Android device
- Camera opens
- Marker detection works
- Processed markers display successfully
