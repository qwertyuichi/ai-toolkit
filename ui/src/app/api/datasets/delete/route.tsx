import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsRoot } from '@/server/settings';
import { isPathInside, getNonEmptyString } from '@/server/pathSecurity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = getNonEmptyString(body?.name);
    if (!name) {
      return NextResponse.json({ error: 'Invalid dataset name' }, { status: 400 });
    }
    let datasetsPath = await getDatasetsRoot();
    let datasetPath = path.resolve(datasetsPath, name);

    if (!(await isPathInside(datasetsPath, datasetPath)) || datasetPath === datasetsPath) {
      return NextResponse.json({ error: 'Invalid dataset name' }, { status: 400 });
    }

    // if folder doesnt exist, ignore
    if (!fs.existsSync(datasetPath)) {
      return NextResponse.json({ success: true });
    }

    // delete it and return success
    fs.rmdirSync(datasetPath, { recursive: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}
