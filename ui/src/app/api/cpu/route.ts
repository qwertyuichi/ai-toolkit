import { NextResponse } from 'next/server';
import os from 'os';
import { CpuInfo } from '@/types';

export async function GET() {
  try {
    const cpuInfoRaw = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuModel = cpuInfoRaw.length > 0 ? cpuInfoRaw[0].model : 'Unknown CPU';
    let cpuInfo: CpuInfo = {
      name: cpuModel,
      cores: cpuInfoRaw.length,
      temperature: 0,
      totalMemory: totalMemory / (1024 * 1024),
      availableMemory: freeMemory / (1024 * 1024),
      freeMemory: freeMemory / (1024 * 1024),
      currentLoad: 0,
    };

    return NextResponse.json(cpuInfo);
  } catch (error) {
    console.error('Error fetching CPU stats:', error);
    return NextResponse.json(
      {
        error: `Failed to fetch CPU stats: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
}
