import { allowedImage } from '@/lib/security/image';
import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToGoogleDrive } from '@/lib/google/drive';
import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured, uploadPhotoViaAppsScript } from '@/lib/google/appsScriptClient';

async function POSTHandler(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { success: false, error: 'File foto tidak ditemukan' },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024)
      return NextResponse.json({ success: false, error: 'Foto maksimal 8 MB.' }, { status: 413 });
    const bytes = await file.arrayBuffer();
    if (!allowedImage(new Uint8Array(bytes), file.type))
      return NextResponse.json(
        { success: false, error: 'Gunakan foto JPEG, PNG, atau WebP yang valid.' },
        { status: 400 }
      );
    const buffer = Buffer.from(bytes);
    const fileName = `survey_pole_${Date.now()}_${file.name || 'photo.jpg'}`;
    const mimeType = file.type || 'image/jpeg';
    const base64Data = buffer.toString('base64');

    // 1. Prioritas Utama: Google Apps Script Web App (Langsung ke Google Drive Akun Pengguna)
    if (isAppsScriptConfigured()) {
      try {
        const appsScriptResult = await uploadPhotoViaAppsScript(base64Data, fileName, mimeType);
        if (appsScriptResult) {
          return NextResponse.json({
            success: true,
            message: 'Foto berhasil disimpan di Google Drive',
            data: {
              photoFileId: appsScriptResult.fileId,
              photoUrl: appsScriptResult.photoUrl,
              fileName: fileName,
            },
          });
        }
      } catch (asErr: any) {
        console.error('Google Apps Script Drive upload error:', asErr);
      }
    }

    // 2. Google Cloud Service Account Direct Drive Upload
    if (isGoogleConfigured() && process.env.GOOGLE_DRIVE_FOLDER_ID) {
      try {
        const driveResult = await uploadFileToGoogleDrive(buffer, fileName, mimeType);
        if (driveResult) {
          return NextResponse.json({
            success: true,
            message: 'Foto berhasil diunggah ke Google Drive',
            data: {
              photoFileId: driveResult.fileId,
              photoUrl: driveResult.webViewLink,
              fileName: driveResult.fileName,
            },
          });
        }
      } catch (driveErr: any) {
        console.error('Google Drive direct upload error:', driveErr);
      }
    }

    // 3. Fallback mode (Pratinjau base64 lokal)
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    const fakeFileId = `local_${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: 'Foto berhasil diproses (Local Fallback Mode)',
      data: {
        photoFileId: fakeFileId,
        photoUrl: dataUrl,
        fileName: fileName,
      },
    });
  } catch (error: any) {
    console.error('API POST /api/upload error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengunggah foto' }, { status: 500 });
  }
}

export const POST = withAuth(POSTHandler, { limit: 30, maxBytes: 12582912 });
