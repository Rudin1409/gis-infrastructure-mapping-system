import { google } from 'googleapis';
import { Readable } from 'stream';
import { isGoogleConfigured } from './sheets';

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

export async function uploadFileToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult | null> {
  if (!isGoogleConfigured() || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.warn('Google Drive credentials or folder ID not configured.');
    return null;
  }

  try {
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const drive = google.drive({ version: 'v3', auth });

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: readableStream,
      },
      fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink',
    });

    const file = response.data;
    if (!file.id) {
      throw new Error('Google Drive upload response did not return a file ID');
    }

    // Set permission to anyone with link can view (read-only)
    try {
      await drive.permissions.create({
        fileId: file.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      console.warn('Could not set public read permission on Drive file:', permError);
    }

    const previewUrl = `https://drive.google.com/uc?id=${file.id}&export=view`;

    return {
      fileId: file.id,
      fileName: file.name || fileName,
      mimeType: file.mimeType || mimeType,
      webViewLink: previewUrl,
      webContentLink: file.webContentLink || previewUrl,
      thumbnailLink: file.thumbnailLink || previewUrl,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}
