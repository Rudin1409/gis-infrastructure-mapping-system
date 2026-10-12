import { allowedImage } from '@/lib/security/image';
import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToGoogleDrive } from '@/lib/google/drive';
import { isGoogleConfigured } from '@/lib/google/sheets';
import { isAppsScriptConfigured, uploadPhotoViaAppsScript } from '@/lib/google/appsScriptClient';
import { savePhotoToVPS } from '@/lib/storage/localStorage';

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

    // 1. Prioritas Utama: Simpan File Fisik Langsung ke Harddisk VPS (Storage Utama Mandiri)
    let localResult: { fileId: string; photoUrl: string; fileName: string } | null = null;
    try {
      localResult = await savePhotoToVPS(buffer, fileName);
    } catch (vpsErr: any) {
      console.error('[Upload] Gagal menyimpan ke harddisk VPS:', vpsErr?.message || vpsErr);
    }

    // 2. Cadangan Sekunder: Kirim Salinan ke Google Drive (Background / Best-Effort)
    // Jika Google Apps Script atau Google Service Account aktif, simpan salinan cadangan
    let driveBackupId: string | undefined;
    if (isAppsScriptConfigured()) {
      try {
        const appsScriptResult = await uploadPhotoViaAppsScript(base64Data, fileName, mimeType);
        if (appsScriptResult?.fileId) {
          driveBackupId = appsScriptResult.fileId;
        }
      } catch (asErr: any) {
        console.warn(
          '[Upload] Cadangan Google Apps Script dilewati (opsional):',
          asErr?.message || asErr
        );
      }
    } else if (isGoogleConfigured() && process.env.GOOGLE_DRIVE_FOLDER_ID) {
      try {
        const driveResult = await uploadFileToGoogleDrive(buffer, fileName, mimeType);
        if (driveResult?.fileId) {
          driveBackupId = driveResult.fileId;
        }
      } catch (driveErr: any) {
        console.warn(
          '[Upload] Cadangan Google Drive Service Account dilewati (opsional):',
          driveErr?.message || driveErr
        );
      }
    }

    // Jika penyimpanan fisik di VPS berhasil, kirim respons sukses
    if (localResult) {
      return NextResponse.json({
        success: true,
        message: 'Foto berhasil disimpan di penyimpanan lokal VPS',
        data: {
          photoFileId: localResult.fileId,
          photoUrl: localResult.photoUrl,
          fileName: localResult.fileName,
          backupDriveId: driveBackupId,
        },
      });
    }

    // 3. Fallback Darurat jika penulisan disk lokal terkendala
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
