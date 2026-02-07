cmake_minimum_required(VERSION 3.8)

project(adlx_gpu_metrics)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/bin)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_CURRENT_SOURCE_DIR}/bin)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_CURRENT_SOURCE_DIR}/bin)

add_definitions(-DUNICODE -D_UNICODE)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../../third_party/ADLX)

set(all_file
  "main.cpp"
  ${CMAKE_CURRENT_SOURCE_DIR}/../../third_party/ADLX/SDK/ADLXHelper/Windows/Cpp/ADLXHelper.h
  ${CMAKE_CURRENT_SOURCE_DIR}/../../third_party/ADLX/SDK/ADLXHelper/Windows/Cpp/ADLXHelper.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/../../third_party/ADLX/SDK/Platform/Windows/WinAPIs.cpp
)

add_executable(adlx_gpu_metrics ${all_file})
