import QRCode from 'qrcode';

export interface QRPayload {
  roll_number: string;
  name: string;
  email: string;
  exam_id?: string;
  exam_name?: string;
  center_code?: string;
  timestamp?: string;
}

/**
 * Generates high-resolution Data URL for dynamic QR code
 */
export async function generateQrDataUrl(data: string | QRPayload): Promise<string> {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  try {
    return await QRCode.toDataURL(content, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}
