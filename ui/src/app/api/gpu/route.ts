import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { GPUApiResponse } from '@/types';

const execFileAsync = promisify(execFile);

const EXEC_OPTIONS = {
  windowsHide: true,
  timeout: 5000,
  maxBuffer: 1024 * 1024,
};

function getHelperPath(): string {
  if (process.env.ADLX_HELPER_PATH) {
    return process.env.ADLX_HELPER_PATH;
  }
  return path.join(process.cwd(), 'adlx_helper', 'bin', 'adlx_gpu_metrics.exe');
}

function notAvailable(message: string): GPUApiResponse {
  return {
    hasAdlx: false,
    gpus: [],
    error: message,
  };
}

export async function GET() {
  const helperPath = getHelperPath();
  if (!fs.existsSync(helperPath)) {
    return NextResponse.json(
      notAvailable(`ADLX helper not found at: ${helperPath}. Build ui/adlx_helper to generate adlx_gpu_metrics.exe.`),
    );
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      helperPath,
      [],
      { ...EXEC_OPTIONS, cwd: path.dirname(helperPath) },
    );
    const trimmed = stdout.trim();
    if (!trimmed) {
      const detail = stderr ? ` stderr: ${stderr.trim()}` : '';
      return NextResponse.json(notAvailable(`ADLX helper returned empty output.${detail}`));
    }

    const parsed = JSON.parse(trimmed) as GPUApiResponse;
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(notAvailable('ADLX helper returned invalid JSON.'));
    }

    if (!parsed.hasAdlx) {
      return NextResponse.json(parsed);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string };
    const stdout = err.stdout?.toString().trim();
    if (stdout) {
      try {
        const parsed = JSON.parse(stdout) as GPUApiResponse;
        if (parsed && typeof parsed === 'object') {
          return NextResponse.json(parsed);
        }
      } catch {
        // Fall through to error handling.
      }
    }
    const stderr = err.stderr?.toString().trim();
    const detail = stderr ? ` stderr: ${stderr}` : '';
    const message = err.message ? err.message : String(error);
    return NextResponse.json(notAvailable(`Failed to execute ADLX helper: ${message}${detail}`));
  }
}
