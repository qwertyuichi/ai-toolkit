import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsRoot } from '@/server/settings';
import { isPathInside } from '@/server/pathSecurity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { name } = body;
    // clean name by making lower case,  removing special characters, and replacing spaces with underscores
    name = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    let datasetsPath = await getDatasetsRoot();
    let datasetPath = path.resolve(datasetsPath, name);

    if (!(await isPathInside(datasetsPath, datasetPath)) || datasetPath === datasetsPath) {
      return NextResponse.json({ error: 'Invalid dataset name' }, { status: 400 });
    }

    // if folder doesnt exist, create it
    if (!fs.existsSync(datasetPath)) {
      fs.mkdirSync(datasetPath, { recursive: true });
    }

    return NextResponse.json({ success: true, name: name });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}
