#include "SDK/ADLXHelper/Windows/Cpp/ADLXHelper.h"
#include "SDK/Include/IPerformanceMonitoring.h"
#include "SDK/Include/ISystem2.h"

#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace adlx;

static ADLXHelper g_ADLXHelp;

struct GpuSnapshot {
  int index = 0;
  std::string name;
  std::string driverVersion;
  double temperature = 0.0;
  double gpuUtil = 0.0;
  int memoryTotal = 0;
  int memoryUsed = 0;
  int memoryFree = 0;
  double powerDraw = 0.0;
  double powerLimit = 0.0;
  int clockGraphics = 0;
  int clockMemory = 0;
  int fanRpm = 0;
};

static std::string JsonEscape(const std::string& value) {
  std::string out;
  out.reserve(value.size() + 8);
  for (char ch : value) {
    switch (ch) {
      case '\\': out += "\\\\"; break;
      case '"': out += "\\\""; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (static_cast<unsigned char>(ch) < 0x20) {
          std::ostringstream oss;
          oss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(ch);
          out += oss.str();
        } else {
          out += ch;
        }
        break;
    }
  }
  return out;
}

static std::string JsonError(const std::string& message) {
  std::ostringstream oss;
  oss << "{\"hasAdlx\":false,\"gpus\":[],\"error\":\"" << JsonEscape(message) << "\"}";
  return oss.str();
}

static bool GetDriverVersion(const IADLXGPUPtr& gpu, std::string* outVersion) {
  IADLXGPU2Ptr gpu2(gpu);
  if (!gpu2) {
    return false;
  }
  const char* version = nullptr;
  ADLX_RESULT res = gpu2->DriverVersion(&version);
  if (ADLX_SUCCEEDED(res) && version) {
    *outVersion = version;
    return true;
  }
  return false;
}

static bool TryGetCurrentMetrics(const IADLXPerformanceMonitoringServicesPtr& perf,
                                 const IADLXGPUPtr& gpu,
                                 GpuSnapshot* snapshot) {
  IADLXGPUMetricsSupportPtr support;
  ADLX_RESULT res = perf->GetSupportedGPUMetrics(gpu, &support);
  if (!ADLX_SUCCEEDED(res) || !support) {
    return false;
  }

  IADLXGPUMetricsPtr metrics;
  res = perf->GetCurrentGPUMetrics(gpu, &metrics);
  if (!ADLX_SUCCEEDED(res) || !metrics) {
    return false;
  }

  adlx_bool supported = false;

  if (ADLX_SUCCEEDED(support->IsSupportedGPUUsage(&supported)) && supported) {
    adlx_double usage = 0.0;
    if (ADLX_SUCCEEDED(metrics->GPUUsage(&usage))) {
      snapshot->gpuUtil = usage;
    }
  }

  if (ADLX_SUCCEEDED(support->IsSupportedGPUClockSpeed(&supported)) && supported) {
    adlx_int value = 0;
    if (ADLX_SUCCEEDED(metrics->GPUClockSpeed(&value))) {
      snapshot->clockGraphics = value;
    }
  }

  if (ADLX_SUCCEEDED(support->IsSupportedGPUVRAMClockSpeed(&supported)) && supported) {
    adlx_int value = 0;
    if (ADLX_SUCCEEDED(metrics->GPUVRAMClockSpeed(&value))) {
      snapshot->clockMemory = value;
    }
  }

  if (ADLX_SUCCEEDED(support->IsSupportedGPUTemperature(&supported)) && supported) {
    adlx_double value = 0.0;
    if (ADLX_SUCCEEDED(metrics->GPUTemperature(&value))) {
      snapshot->temperature = value;
    }
  }

  if (ADLX_SUCCEEDED(support->IsSupportedGPUPower(&supported)) && supported) {
    adlx_double value = 0.0;
    if (ADLX_SUCCEEDED(metrics->GPUPower(&value))) {
      snapshot->powerDraw = value;
    }
  }

  if (ADLX_SUCCEEDED(support->IsSupportedGPUFanSpeed(&supported)) && supported) {
    adlx_int value = 0;
    if (ADLX_SUCCEEDED(metrics->GPUFanSpeed(&value))) {
      snapshot->fanRpm = value;
    }
  }

  if (ADLX_SUCCEEDED(support->IsSupportedGPUVRAM(&supported)) && supported) {
    adlx_int value = 0;
    if (ADLX_SUCCEEDED(metrics->GPUVRAM(&value))) {
      snapshot->memoryUsed = value;
    }
  }

  adlx_int powerMin = 0;
  adlx_int powerMax = 0;
  if (ADLX_SUCCEEDED(support->GetGPUPowerRange(&powerMin, &powerMax))) {
    snapshot->powerLimit = static_cast<double>(powerMax);
  }

  return true;
}

int main() {
  ADLX_RESULT res = g_ADLXHelp.Initialize();
  if (!ADLX_SUCCEEDED(res)) {
    std::cout << JsonError("ADLX initialize failed") << std::endl;
    return 1;
  }

  auto system = g_ADLXHelp.GetSystemServices();
  if (!system) {
    std::cout << JsonError("ADLX system services not available") << std::endl;
    g_ADLXHelp.Terminate();
    return 1;
  }

  IADLXPerformanceMonitoringServicesPtr perf;
  res = system->GetPerformanceMonitoringServices(&perf);
  if (!ADLX_SUCCEEDED(res) || !perf) {
    std::cout << JsonError("Performance monitoring services not available") << std::endl;
    g_ADLXHelp.Terminate();
    return 1;
  }

  IADLXGPUListPtr gpus;
  res = system->GetGPUs(&gpus);
  if (!ADLX_SUCCEEDED(res) || !gpus || gpus->Empty()) {
    std::cout << JsonError("No GPUs detected") << std::endl;
    g_ADLXHelp.Terminate();
    return 1;
  }

  std::vector<GpuSnapshot> snapshots;
  for (auto it = gpus->Begin(); it != gpus->End(); ++it) {
    IADLXGPUPtr gpu;
    if (!ADLX_SUCCEEDED(gpus->At(it, &gpu)) || !gpu) {
      continue;
    }

    GpuSnapshot snapshot;
    snapshot.index = static_cast<int>(it);

    const char* name = nullptr;
    if (ADLX_SUCCEEDED(gpu->Name(&name)) && name) {
      snapshot.name = name;
    } else {
      snapshot.name = "GPU " + std::to_string(snapshot.index);
    }

    GetDriverVersion(gpu, &snapshot.driverVersion);

    adlx_uint totalVram = 0;
    if (ADLX_SUCCEEDED(gpu->TotalVRAM(&totalVram))) {
      snapshot.memoryTotal = static_cast<int>(totalVram);
    }

    TryGetCurrentMetrics(perf, gpu, &snapshot);

    if (snapshot.memoryTotal > 0) {
      if (snapshot.memoryUsed < 0) {
        snapshot.memoryUsed = 0;
      }
      if (snapshot.memoryUsed > snapshot.memoryTotal) {
        snapshot.memoryUsed = snapshot.memoryTotal;
      }
      snapshot.memoryFree = snapshot.memoryTotal - snapshot.memoryUsed;
    }

    snapshots.push_back(snapshot);
  }

  std::ostringstream out;
  out << "{\"hasAdlx\":true,\"gpus\":[";
  for (size_t i = 0; i < snapshots.size(); ++i) {
    const auto& gpu = snapshots[i];
    double memoryUtil = 0.0;
    if (gpu.memoryTotal > 0) {
      memoryUtil = (static_cast<double>(gpu.memoryUsed) / static_cast<double>(gpu.memoryTotal)) * 100.0;
    }

    out << "{";
    out << "\"index\":" << gpu.index << ",";
    out << "\"name\":\"" << JsonEscape(gpu.name) << "\",";
    out << "\"driverVersion\":\"" << JsonEscape(gpu.driverVersion) << "\",";
    out << "\"temperature\":" << gpu.temperature << ",";
    out << "\"utilization\":{\"gpu\":" << gpu.gpuUtil << ",\"memory\":" << memoryUtil << "},";
    out << "\"memory\":{\"total\":" << gpu.memoryTotal << ",\"free\":" << gpu.memoryFree << ",\"used\":" << gpu.memoryUsed << "},";
    out << "\"power\":{\"draw\":" << gpu.powerDraw << ",\"limit\":" << gpu.powerLimit << "},";
    out << "\"clocks\":{\"graphics\":" << gpu.clockGraphics << ",\"memory\":" << gpu.clockMemory << "},";
    out << "\"fan\":{\"speed\":" << gpu.fanRpm << "}";
    out << "}";
    if (i + 1 < snapshots.size()) {
      out << ",";
    }
  }
  out << "]}";

  std::cout << out.str() << std::endl;

  g_ADLXHelp.Terminate();
  return 0;
}
