import 'server-only';

import fs from 'fs';
import path from 'path';

function normalizeCase(p: string): string {
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

async function realpathOrSelf(p: string): Promise<string> {
  try {
    return await fs.promises.realpath(p);
  } catch {
    return p;
  }
}

/**
 * Returns true if `target` is inside `root` after resolving symlinks (when possible).
 * Works on Windows (drive-letter) and POSIX.
 */
export async function isPathInside(root: string, target: string): Promise<boolean> {
  const rootAbs = path.resolve(root);
  const targetAbs = path.resolve(target);

  const rootReal = await realpathOrSelf(rootAbs);
  const targetReal = await realpathOrSelf(targetAbs);

  const rootNorm = normalizeCase(rootReal);
  const targetNorm = normalizeCase(targetReal);

  const rel = path.relative(rootNorm, targetNorm);
  if (rel === '') {
    return true;
  }

  if (rel === '..' || rel.startsWith('..' + path.sep)) {
    return false;
  }

  // On Windows if drives differ, relative can become absolute-ish.
  if (path.isAbsolute(rel)) {
    return false;
  }

  return true;
}

export async function isPathInsideAny(roots: string[], target: string): Promise<boolean> {
  for (const root of roots) {
    if (await isPathInside(root, target)) {
      return true;
    }
  }
  return false;
}

export function getNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') {
    return null;
  }
  return trimmed;
}

export function mustBeNonEmptyString(value: unknown, fieldName: string): string {
  const trimmed = getNonEmptyString(value);
  if (!trimmed) {
    throw new Error(`${fieldName} must be non-empty`);
  }
  return trimmed;
}
