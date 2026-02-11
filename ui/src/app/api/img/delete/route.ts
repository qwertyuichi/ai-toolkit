import { NextResponse } from 'next/server';
import fs from 'fs';
import { getDatasetsRoot, getTrainingFolder } from '@/server/settings';
import { isPathInsideAny } from '@/server/pathSecurity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imgPath } = body;
    let datasetsPath = await getDatasetsRoot();
    const trainingPath = await getTrainingFolder();

    if (typeof imgPath !== 'string' || !imgPath.trim()) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
    }

    // make sure the dataset path is in the image path
    if (!(await isPathInsideAny([datasetsPath, trainingPath], imgPath))) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
    }

    // make sure it is an image
    if (!/\.(jpg|jpeg|png|bmp|gif|tiff|webp|mp4|mp3|wav)$/i.test(imgPath.toLowerCase())) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    // if img doesnt exist, ignore
    if (!fs.existsSync(imgPath)) {
      return NextResponse.json({ success: true });
    }

    // delete it and return success
    fs.unlinkSync(imgPath);

    // check for caption
    const captionPath = imgPath.replace(/\.[^/.]+$/, '') + '.txt';
    if (fs.existsSync(captionPath)) {
      // keep caption deletion inside the same allowed roots
      if (!(await isPathInsideAny([datasetsPath, trainingPath], captionPath))) {
        return NextResponse.json({ error: 'Invalid caption path' }, { status: 400 });
      }
      // delete caption file
      fs.unlinkSync(captionPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}
