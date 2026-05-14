# MarkerScanner — Complete Windows Setup Guide
### From zero to running app on your Android device

---

## Prerequisites Checklist

Before starting, confirm you have these installed:

| Tool | Check command | Required version |
|------|--------------|-----------------|
| Node.js | `node --version` | ≥ 18 |
| npm | `npm --version` | ≥ 9 |
| Java JDK | `java -version` | 17 (exact) |
| Git | `git --version` | any |
| Android Studio | — | Hedgehog / Iguana / Jellyfish |

You said you already have in Android Studio:
- ✅ Android SDK Platform 34
- ✅ Android SDK Build-Tools
- ✅ Android SDK Platform-Tools
- ✅ Android Emulator
- ✅ NDK 26.1.10909125
- ✅ CMake 3.22.1

---

## PHASE 1 — Install Node.js and Java (if not done)

### 1A. Install Node.js 18+
Download from: https://nodejs.org/en/download  
Choose the **LTS Windows Installer (.msi)**  
During install, check ✅ "Automatically install necessary tools"

Verify in PowerShell:
```powershell
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
```

### 1B. Install Java JDK 17
Download from: https://adoptium.net/temurin/releases/?version=17  
Choose: Windows x64 `.msi` installer  
Install with default settings.

Verify:
```powershell
java -version
# Should show: openjdk version "17.x.x"
```

---

## PHASE 2 — Set Environment Variables

Open PowerShell **as Administrator** and run each command:

### 2A. Find your Android SDK path
It is usually at:
```
C:\Users\KIIT0001\AppData\Local\Android\Sdk
```

Verify it exists:
```powershell
Test-Path "C:\Users\KIIT0001\AppData\Local\Android\Sdk"
# Should return: True
```

### 2B. Set ANDROID_HOME
```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\KIIT0001\AppData\Local\Android\Sdk", "User")
```

### 2C. Set JAVA_HOME
```powershell
# Find where Java 17 is installed:
Get-ChildItem "C:\Program Files\Eclipse Adoptium\" 2>$null
Get-ChildItem "C:\Program Files\Java\" 2>$null
```

Then set it (replace the path with what you found above):
```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot", "User")
```

### 2D. Add Android tools to PATH
```powershell
$current = [System.Environment]::GetEnvironmentVariable("PATH", "User")
$additions = ";C:\Users\KIIT0001\AppData\Local\Android\Sdk\platform-tools;C:\Users\KIIT0001\AppData\Local\Android\Sdk\emulator;C:\Users\KIIT0001\AppData\Local\Android\Sdk\tools\bin"
[System.Environment]::SetEnvironmentVariable("PATH", $current + $additions, "User")
```

### 2E. Close and reopen PowerShell, then verify:
```powershell
echo $env:ANDROID_HOME   # Should show SDK path
echo $env:JAVA_HOME      # Should show JDK path
adb version              # Should show Android Debug Bridge version
```

---

## PHASE 3 — Download OpenCV Android SDK

### 3A. Download OpenCV 4.10.0

Download this file in your browser:  
**https://github.com/opencv/opencv/releases/download/4.10.0/opencv-4.10.0-android-sdk.zip**

### 3B. Extract it

Extract the ZIP. You will get a folder called `OpenCV-android-sdk`.

### 3C. Place it next to the project folder

Your project is at:
```
C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner\
```

Place the OpenCV folder here so the structure looks like:
```
C:\Users\KIIT0001\Downloads\MarkerScanner\
    ├── MarkerScanner\          ← your project (contains android/, src/, etc.)
    └── opencv-android-sdk\    ← rename OpenCV-android-sdk to this exact name
            └── sdk\
                ├── native\
                │   ├── jni\include\opencv2\
                │   └── libs\arm64-v8a\libopencv_java4.so
                └── libopencv_java4.aar
```

**Rename the folder** from `OpenCV-android-sdk` to `opencv-android-sdk` (lowercase, hyphen):
```powershell
Rename-Item "C:\Users\KIIT0001\Downloads\MarkerScanner\OpenCV-android-sdk" "opencv-android-sdk"
```

Verify the .so file exists:
```powershell
Test-Path "C:\Users\KIIT0001\Downloads\MarkerScanner\opencv-android-sdk\sdk\native\libs\arm64-v8a\libopencv_java4.so"
# Must return: True
```

---

## PHASE 4 — Replace the downloaded ZIP with the updated one

> ⚠️ The original ZIP had bugs. Download the updated ZIP from Claude and re-extract it.
> It fixes: CMakeLists.txt, adds gradle-wrapper.properties, proguard-rules.pro, babel-plugin-module-resolver.

After extracting the new ZIP, your project folder should be:
```
C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner\
```

---

## PHASE 5 — Create local.properties

This tells Gradle where your Android SDK is.

In PowerShell:
```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner\android"

# Create local.properties with your SDK path
# Note: Use forward slashes, NOT backslashes
$content = "sdk.dir=C\:/Users/KIIT0001/AppData/Local/Android/Sdk"
Set-Content -Path "local.properties" -Value $content
```

Verify it was created:
```powershell
Get-Content "local.properties"
# Should show: sdk.dir=C\:/Users/KIIT0001/AppData/Local/Android/Sdk
```

---

## PHASE 6 — Install JavaScript Dependencies

```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner"
npm install
```

This will take 2–5 minutes. You should see packages being downloaded.

Verify node_modules was created:
```powershell
Test-Path "node_modules"  # Should return: True
```

---

## PHASE 7 — Download the Gradle Wrapper JAR

The project needs `gradlew.bat` to build. Create it:

```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner\android"

# Download gradle wrapper jar
$url = "https://raw.githubusercontent.com/gradle/gradle/v8.8.0/gradle/wrapper/gradle-wrapper.jar"
$dest = "gradle\wrapper\gradle-wrapper.jar"
New-Item -ItemType Directory -Force -Path "gradle\wrapper"
Invoke-WebRequest -Uri $url -OutFile $dest
```

Then create `gradlew.bat`:
```powershell
$gradlewContent = @'
@rem ##########################################################################
@rem  Gradle startup script for Windows
@rem ##########################################################################
@if "%DEBUG%"=="" @echo off
@rem Set local scope for the variables
setlocal
set DIRNAME=%~dp0
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome
set JAVA_EXE=java.exe
goto execute
:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe
:execute
"%JAVA_EXE%" -classpath "%APP_HOME%\gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
'@
Set-Content -Path "gradlew.bat" -Value $gradlewContent
```

---

## PHASE 8 — Connect Your Android Device

### 8A. Enable Developer Mode on your phone
1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings → Developer Options**
4. Enable **USB Debugging**

### 8B. Connect via USB

```powershell
adb devices
```

You should see something like:
```
List of devices attached
R5CW30XXXXX    device
```

If it shows `unauthorized`, check your phone — a dialog will ask "Allow USB debugging?" — tap **Allow**.

If you want to use an emulator instead:
```powershell
# List available AVDs
emulator -list-avds

# Start one (replace Pixel_6 with your AVD name)
emulator -avd Pixel_6 &
```

---

## PHASE 9 — Run the App

Open **two PowerShell windows side by side**.

### Window 1 — Start Metro bundler:
```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner"
npm start
```

Wait until you see:
```
Metro waiting on exp://...
```

### Window 2 — Build and install the app:
```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner"
npx react-native run-android
```

This will:
1. Compile the Kotlin/Java native modules (~3–8 min first time)
2. Compile the C++ OpenCV code via CMake (~5–10 min first time)
3. Install the APK on your device
4. Start the app

---

## PHASE 10 — Verify It Works

When the app opens:
1. It will ask for camera permission — tap **Allow**
2. Point your phone at a printed copy of `docs/marker.svg`
3. The bounding box overlay should turn green when detected
4. After 20 captures, navigate to the Gallery

---

## Common Errors and Fixes

### ❌ "SDK location not found"
```powershell
# Make sure local.properties exists with correct content:
Get-Content "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner\android\local.properties"
```

### ❌ "CMake: cannot find opencv headers"
```powershell
# Verify the opencv-android-sdk folder is in the RIGHT place:
Test-Path "C:\Users\KIIT0001\Downloads\MarkerScanner\opencv-android-sdk\sdk\native\jni\include\opencv2\opencv.hpp"
# Must return True
```
The folder must be OUTSIDE the MarkerScanner project folder, as a sibling.

### ❌ "Could not find :react-native-gradle-plugin"
```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner"
npm install   # Run again — node_modules may be incomplete
```

### ❌ "No devices/emulators found"
```powershell
adb kill-server
adb start-server
adb devices
```

### ❌ Gradle build hangs
```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner\android"
gradlew.bat --stop          # Stop all Gradle daemons
gradlew.bat clean           # Clean build cache
cd ..
npx react-native run-android
```

### ❌ "JAVA_HOME is not set"
```powershell
# Find your JDK:
Get-ChildItem "C:\Program Files\Eclipse Adoptium\" -ErrorAction SilentlyContinue
Get-ChildItem "C:\Program Files\Java\" -ErrorAction SilentlyContinue

# Then set it for current session:
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot"
```

### ❌ Metro bundler error "Cannot find module"
```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner"
# Clear Metro cache and restart:
npx react-native start --reset-cache
```

---

## Folder Structure After Setup

```
C:\Users\KIIT0001\Downloads\MarkerScanner\
├── opencv-android-sdk\         ← OpenCV (downloaded separately)
│   └── sdk\
│       ├── native\jni\include\ ← C++ headers
│       └── native\libs\        ← .so files per ABI
└── MarkerScanner\              ← Your project (from ZIP)
    ├── android\
    │   ├── local.properties    ← Created in Phase 5
    │   ├── gradlew.bat         ← Created in Phase 7
    │   └── gradle\wrapper\
    │       ├── gradle-wrapper.jar        ← Downloaded in Phase 7
    │       └── gradle-wrapper.properties ← Already in ZIP
    ├── node_modules\           ← Created in Phase 6
    ├── src\
    ├── App.tsx
    └── package.json
```

---

## Build APK (optional — for sharing/submission)

```powershell
cd "C:\Users\KIIT0001\Downloads\MarkerScanner\MarkerScanner\android"
gradlew.bat assembleDebug
```

APK will be at:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

Install it manually:
```powershell
adb install "app\build\outputs\apk\debug\app-debug.apk"
```
