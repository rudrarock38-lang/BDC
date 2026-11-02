import { getGoogleAccessToken } from './googleAuth';

export interface DriveUploadResult {
  success: boolean;
  fileId: string;
  directUrl: string;
  webViewLink?: string;
  name: string;
  provider: 'google_drive' | 'local_fallback';
  message: string;
}

/**
 * Convert browser File object to Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes('base64,') ? res.split('base64,')[1] : res;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload any file (Image, Diagram, or Scanned PDF) directly to user's Google Drive.
 * Completely bypasses Firebase Storage so your Firebase storage quota remains 100% untouched!
 */
export async function uploadFileToDrive(
  file: File,
  folderName: string = 'Pariksha CBT Exam Images'
): Promise<DriveUploadResult> {
  const token = await getGoogleAccessToken();
  const base64 = await fileToBase64(file);

  // 1. Try Direct Client-Side Google Drive API if active token is present
  if (token && token.startsWith('ya29.')) {
    try {
      let folderId: string | undefined = undefined;
      try {
        const encodedFolderName = encodeURIComponent(folderName.replace(/'/g, "\\'"));
        const searchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name%3D'${encodedFolderName}'+and+mimeType%3D'application/vnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id,name)`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            folderId = searchData.files[0].id;
          } else {
            // Create folder
            const createFold = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
              })
            });
            if (createFold.ok) {
              const foldData = await createFold.json();
              folderId = foldData.id;
            }
          }
        }
      } catch (fErr) {
        console.warn('[Drive Folder Check Warning]', fErr);
      }

      // Multipart upload to Google Drive
      const metadata = {
        name: file.name || `exam_file_${Date.now()}`,
        mimeType: file.type || 'application/octet-stream',
        parents: folderId ? [folderId] : undefined
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64 +
        closeDelim;

      const driveRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        }
      );

      if (driveRes.ok) {
        const fileData = await driveRes.json();
        const fileId = fileData.id;

        // Set permission so file is accessible in CBT portal
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' })
          });
        } catch (permErr) {
          console.warn('[Drive Perm Error]', permErr);
        }

        const directUrl = file.type.startsWith('image/')
          ? `https://lh3.googleusercontent.com/d/${fileId}`
          : (fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`);

        return {
          success: true,
          fileId,
          directUrl,
          webViewLink: fileData.webViewLink,
          name: metadata.name,
          provider: 'google_drive',
          message: `Successfully uploaded "${file.name}" to your Google Drive folder "${folderName}"!`
        };
      }
    } catch (clientErr) {
      console.warn('[Direct Drive Upload Error, falling back to server route]', clientErr);
    }
  }

  // 2. Fall back to backend /api/drive/upload-image route
  const response = await fetch('/api/drive/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_base64: base64,
      googleToken: token,
      folder_name: folderName
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to upload file to Google Drive.');
  }

  const data = await response.json();
  return data;
}

/**
 * Upload an image or diagram to user's Google Drive.
 */
export async function uploadImageToDrive(file: File): Promise<DriveUploadResult> {
  return uploadFileToDrive(file, 'Pariksha CBT Exam Images');
}
