import fs from 'fs';
import path from 'path';
import prisma from './prisma';

function getModuleDir(): string {
  // eslint-disable-next-line no-undef
  return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
}

function looksLikeToolkitRoot(dir: string): boolean {
  try {
    return (
      fs.existsSync(path.join(dir, 'run.py')) &&
      fs.existsSync(path.join(dir, 'toolkit')) &&
      fs.statSync(path.join(dir, 'toolkit')).isDirectory()
    );
  } catch {
    return false;
  }
}

function findUpwardsForToolkitRoot(startDir: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    if (looksLikeToolkitRoot(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function resolveToolkitRoot(): string {
  const env = process.env.AITK_TOOLKIT_ROOT;
  if (env && env.trim()) {
    return path.resolve(env);
  }

  const candidates = [getModuleDir(), process.cwd()];
  for (const candidate of candidates) {
    const found = findUpwardsForToolkitRoot(candidate);
    if (found) {
      return found;
    }
  }

  return path.resolve(process.cwd(), '..');
}

export const TOOLKIT_ROOT = resolveToolkitRoot();
export const defaultTrainFolder = path.join(TOOLKIT_ROOT, 'output');
export const defaultDatasetsFolder = path.join(TOOLKIT_ROOT, 'datasets');
export const defaultDataRoot = path.join(TOOLKIT_ROOT, 'data');

console.log('TOOLKIT_ROOT:', TOOLKIT_ROOT);

function resolveConfiguredPath(value: string | null | undefined, fallbackAbs: string): string {
  const v = (value ?? '').trim();
  if (!v) {
    return fallbackAbs;
  }
  if (path.isAbsolute(v)) {
    return path.normalize(v);
  }
  return path.resolve(TOOLKIT_ROOT, v);
}

export const getTrainingFolder = async () => {
  const key = 'TRAINING_FOLDER';
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  return resolveConfiguredPath(row?.value, defaultTrainFolder);
};

export const getHFToken = async () => {
  const key = 'HF_TOKEN';
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  let token = '';
  if (row?.value && row.value !== '') {
    token = row.value;
  }
  return token;
};
