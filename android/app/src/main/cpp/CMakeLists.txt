cmake_minimum_required(VERSION 3.22.1)
project(MarkerScanner VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ─── OpenCV ───────────────────────────────────────────────────────────────────
# OPENCV_ANDROID_SDK is passed from build.gradle via CMake arguments.
# It should point to the root of the OpenCV Android SDK folder that contains:
#   sdk/native/jni/include   (headers)
#   sdk/native/libs/<abi>    (prebuilt .so files)

set(OPENCV_ANDROID_SDK_PATH "${OPENCV_ANDROID_SDK}" CACHE STRING "Path to OpenCV Android SDK")

include_directories("${OPENCV_ANDROID_SDK_PATH}/sdk/native/jni/include")

add_library(
    opencv_java4
    SHARED
    IMPORTED
)
set_target_properties(
    opencv_java4
    PROPERTIES
    IMPORTED_LOCATION "${OPENCV_ANDROID_SDK_PATH}/sdk/native/libs/${ANDROID_ABI}/libopencv_java4.so"
)

# ─── Android libs ─────────────────────────────────────────────────────────────

find_library(log-lib log)
find_library(android-lib android)
find_library(jnigraphics-lib jnigraphics)

# ─── Our JNI library ──────────────────────────────────────────────────────────

add_library(
    markerscanner-jni
    SHARED
    src/main/cpp/MarkerDetectorJni.cpp
    src/main/cpp/MarkerDetector.cpp
)

target_include_directories(
    markerscanner-jni PRIVATE
    src/main/cpp
    "${OPENCV_ANDROID_SDK_PATH}/sdk/native/jni/include"
)

target_link_libraries(
    markerscanner-jni
    opencv_java4
    ${log-lib}
    ${android-lib}
    ${jnigraphics-lib}
)
