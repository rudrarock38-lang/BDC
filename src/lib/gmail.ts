import { getGoogleAccessToken } from './googleAuth';

/**
 * Encodes a string to RFC 4648 Base64URL without padding
 */
export function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds RFC 2822 MIME email message
 */
export function createMimeMessage({
  to,
  subject,
  htmlBody,
  from = 'me'
}: {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``
  ];

  // Plain text fallback strip HTML
  const plainText = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    plainText,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`
  ];

  return headers.concat(body).join('\r\n');
}

/**
 * Sends an email directly via the official Google Workspace Gmail API
 * https://gmail.googleapis.com/gmail/v1/users/me/messages/send
 */
export async function sendGmail({
  to,
  subject,
  htmlBody,
  token
}: {
  to: string;
  subject: string;
  htmlBody: string;
  token?: string;
}): Promise<{ id: string; threadId: string; success: boolean }> {
  const accessToken = token || (await getGoogleAccessToken());
  if (!accessToken || !accessToken.startsWith('ya29.')) {
    throw new Error('Google Workspace OAuth access token is not active.');
  }

  const mimeMessage = createMimeMessage({ to, subject, htmlBody });
  const rawBase64 = base64UrlEncode(mimeMessage);

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: rawBase64
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(
        errorJson?.error?.message || `Gmail API send failed with HTTP status ${response.status}`
      );
    }

    const result = await response.json();
    return {
      id: result.id,
      threadId: result.threadId,
      success: true
    };
  } catch (err: any) {
    throw new Error(err.message || 'Gmail dispatch failed');
  }
}

/**
 * Formats an OTP verification email HTML template
 */
export function buildOtpEmailHtml({
  role,
  recipientName,
  otpCode
}: {
  role: 'student' | 'admin';
  recipientName?: string;
  otpCode: string;
}): string {
  const isAdmin = role === 'admin';
  const portalName = isAdmin ? 'Examiner & Admin Portal' : 'Student Examination Portal';
  const brandColor = isAdmin ? '#6b21a8' : '#1d4ed8';
  const roleLabel = isAdmin ? 'Administrator' : 'Candidate';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background: ${brandColor}; padding: 24px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">PARIKSHA CBT</h1>
        <p style="color: #ffffff; opacity: 0.9; margin: 6px 0 0; font-size: 13px;">${portalName}</p>
      </div>

      <div style="padding: 30px; color: #1e293b;">
        <p style="font-size: 15px; margin-top: 0;">Hello ${recipientName || roleLabel},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          We received a request to verify your identity and reset the password for your Pariksha CBT ${roleLabel} account.
        </p>

        <div style="background: #f8fafc; border: 2px dashed ${brandColor}; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0;">
          <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; display: block; margin-bottom: 8px;">
            Your Verification OTP Code
          </span>
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: ${brandColor}; display: inline-block;">
            ${otpCode}
          </span>
          <p style="font-size: 12px; color: #94a3b8; margin: 8px 0 0;">Valid for 10 minutes only</p>
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
          Please enter this code on the verification screen to complete your password update. If you did not request this OTP, you can safely ignore this email; your account remains secure.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />

        <div style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
          This is an automated notification from the Pariksha Computer Based Test (CBT) Examination System.<br/>
          Do not reply directly to this email.
        </div>
      </div>
    </div>
  `;
}
