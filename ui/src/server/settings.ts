import { PrismaClient } from '@prisma/client';
import path from 'path';
import { defaultDatasetsFolder, defaultDataRoot, defaultTrainFolder, resolvePathFromToolkitRoot } from '@/paths';
import NodeCache from 'node-cache';

const myCache = new NodeCache();
const prisma = new PrismaClient();

function resolveConfiguredPath(value: string | null | undefined, fallbackAbs: string): string {
  const v = (value ?? '').trim();
  if (!v) {
    return fallbackAbs;
  }
  if (path.isAbsolute(v)) {
    return path.normalize(v);
  }
  return resolvePathFromToolkitRoot(v);
}

export const flushCache = () => {
  myCache.flushAll();
};

export const getDatasetsRoot = async () => {
  const key = 'DATASETS_FOLDER';
  let datasetsPath = myCache.get(key) as string;
  if (datasetsPath) {
    return datasetsPath;
  }
  let row = await prisma.settings.findFirst({
    where: {
      key: 'DATASETS_FOLDER',
    },
  });
  datasetsPath = resolveConfiguredPath(row?.value, defaultDatasetsFolder);
  myCache.set(key, datasetsPath);
  return datasetsPath as string;
};

export const getTrainingFolder = async () => {
  const key = 'TRAINING_FOLDER';
  let trainingRoot = myCache.get(key) as string;
  if (trainingRoot) {
    return trainingRoot;
  }
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  trainingRoot = resolveConfiguredPath(row?.value, defaultTrainFolder);
  myCache.set(key, trainingRoot);
  return trainingRoot as string;
};

export const getHFToken = async () => {
  const key = 'HF_TOKEN';
  let token = myCache.get(key) as string;
  if (token) {
    return token;
  }
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  token = '';
  if (row?.value && row.value !== '') {
    token = row.value;
  }
  myCache.set(key, token);
  return token;
};

export const getDataRoot = async () => {
  const key = 'DATA_ROOT';
  let dataRoot = myCache.get(key) as string;
  if (dataRoot) {
    return dataRoot;
  }
  let row = await prisma.settings.findFirst({
    where: {
      key: key,
    },
  });
  dataRoot = resolveConfiguredPath(row?.value, defaultDataRoot);
  myCache.set(key, dataRoot);
  return dataRoot;
};
