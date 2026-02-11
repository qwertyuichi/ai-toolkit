import 'server-only';

import fs from 'fs';
import path from 'path';

function getModuleDir(): string {
	// This file is used server-side. In the built output (CJS), __dirname is defined.
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

	// Prefer resolving from the module location, then from cwd.
	const candidates = [getModuleDir(), process.cwd()];
	for (const candidate of candidates) {
		const found = findUpwardsForToolkitRoot(candidate);
		if (found) {
			return found;
		}
	}

	// Last-resort: assume typical layout where cwd is ui/.
	return path.resolve(process.cwd(), '..');
}

export const TOOLKIT_ROOT = resolveToolkitRoot();
export const defaultTrainFolder = path.join(TOOLKIT_ROOT, 'output');
export const defaultDatasetsFolder = path.join(TOOLKIT_ROOT, 'datasets');
export const defaultDataRoot = path.join(TOOLKIT_ROOT, 'data');

export function resolvePathFromToolkitRoot(p: string): string {
	if (!p) {
		return TOOLKIT_ROOT;
	}
	if (path.isAbsolute(p)) {
		return path.normalize(p);
	}
	return path.resolve(TOOLKIT_ROOT, p);
}
