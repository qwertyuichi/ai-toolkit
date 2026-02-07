# ADLX GPU Helper

This helper builds a small Windows executable that queries ADLX GPU metrics and prints JSON to stdout.

## Build (Windows)

From the repo root:

```
cd ui/adlx_helper
cmake -S . -B build
cmake --build build --config Release
```

The executable will be written to:

```
ui/adlx_helper/bin/adlx_gpu_metrics.exe
```

## Environment override

You can override the helper path with:

```
set ADLX_HELPER_PATH=C:\path\to\adlx_gpu_metrics.exe
```
