/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsRoot } from '@/server/settings';
import { isPathInside } from '@/server/pathSecurity';

export async function POST(request: NextRequest) {
  
  const body = await request.json();
  const { imgPath } = body;
  console.log('Received POST request for caption:', imgPath);
  try {
    // Decode the path
    const filepath = imgPath;
    console.log('Decoded image path:', filepath);

    if (typeof filepath !== 'string' || !filepath.trim()) {
      return new NextResponse('Invalid image path', { status: 400 });
    }

    // caption name is the filepath without extension but with .txt
    const captionPath = filepath.replace(/\.[^/.]+$/, '') + '.txt';

    // Get allowed directories
    const allowedDir = await getDatasetsRoot();

    // Security check: Ensure path is in allowed directory
    const isAllowed = await isPathInside(allowedDir, filepath);

    if (!isAllowed) {
      console.warn(`Access denied: ${filepath} not in ${allowedDir}`);
      return new NextResponse('Access denied', { status: 403 });
    }

    // Also validate the derived caption path
    if (!(await isPathInside(allowedDir, captionPath))) {
      console.warn(`Access denied: ${captionPath} not in ${allowedDir}`);
      return new NextResponse('Access denied', { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(captionPath)) {
      // send back blank string if caption file does not exist
      return new NextResponse('');
    }

    // Read caption file
    const caption = fs.readFileSync(captionPath, 'utf-8');

    // Return caption
    return new NextResponse(caption);
  } catch (error) {
    console.error('Error getting caption:', error);
    return new NextResponse('Error getting caption', { status: 500 });
  }
}
