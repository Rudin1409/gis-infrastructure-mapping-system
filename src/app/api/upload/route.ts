import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToGoogleDrive } from '@/lib/google/drive';
import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured, uploadPhotoViaAppsScript } from '@/lib/google/appsScriptClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File foto tidak ditemukan' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
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
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengunggah foto' },
      { status: 500 }
    );
  }
}
