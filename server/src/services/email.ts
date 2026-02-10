import { createTransport, type Transporter } from 'nodemailer';
import { config } from '../config.js';
import { APP_NAME, type RequestDto } from '@romm-request/shared';

let transporter: Transporter | null = null;
let senderFrom: string | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const emailConfig = config.email;
  if (!emailConfig) return null;

  senderFrom = emailConfig.from;
  transporter = createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.port === 465,
    ...(emailConfig.user
      ? { auth: { user: emailConfig.user, pass: emailConfig.pass } }
      : {}),
  });

  return transporter;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getBaseUrl(): string {
  const appUrl = config.appUrl.replace(/\/$/, '');
  const basePath = config.basePath.replace(/\/$/, '');
  return `${appUrl}${basePath}`;
}

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#18181b;padding:20px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${APP_NAME}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 32px;background-color:#f4f4f5;text-align:center;">
          <p style="margin:0;color:#71717a;font-size:12px;">Sent by ${APP_NAME}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const STATUS_COLORS: Record<string, string> = {
  fulfilled: '#16a34a',
  rejected: '#dc2626',
  pending: '#ca8a04',
};

function gameDetailsBlock(request: RequestDto, extraRows?: string): string {
  const gameName = escapeHtml(request.gameName);
  const platformName = escapeHtml(request.platformName);
  const coverHtml = request.gameCoverUrl
    ? `<td width="90" style="padding:12px 16px 12px 12px;vertical-align:top;">
        <img src="${escapeHtml(request.gameCoverUrl)}" alt="${gameName}" width="90"
             style="display:block;border-radius:4px;max-width:90px;" />
      </td>`
    : '';

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:6px;">
      <tr>
        ${coverHtml}
        <td style="padding:12px 16px;vertical-align:top;">
          <p style="margin:0 0 4px;color:#71717a;font-size:12px;text-transform:uppercase;">Game</p>
          <p style="margin:0 0 12px;color:#18181b;font-size:16px;font-weight:600;">${gameName}</p>
          <p style="margin:0 0 4px;color:#71717a;font-size:12px;text-transform:uppercase;">Platform</p>
          <p style="margin:0;color:#18181b;font-size:14px;">${platformName}</p>
        </td>
      </tr>
      ${extraRows ?? ''}
    </table>`;
}

function newRequestTemplate(
  request: RequestDto,
  requesterName: string
): string {
  const baseUrl = getBaseUrl();

  return baseLayout(
    'New Game Request',
    `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">New Game Request</h2>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.5;">
      <strong>${escapeHtml(requesterName)}</strong> has submitted a new game request.
    </p>
    ${gameDetailsBlock(request)}
    <p style="margin:24px 0 0;text-align:center;">
      <a href="${baseUrl}/admin/requests"
         style="display:inline-block;padding:10px 24px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        Review Request
      </a>
    </p>`
  );
}

function requestStatusTemplate(
  request: RequestDto,
  status: 'fulfilled' | 'rejected'
): string {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const baseUrl = getBaseUrl();

  const message =
    status === 'fulfilled'
      ? 'Your game request has been fulfilled! The game should be available in the collection.'
      : 'Your game request has been reviewed and was not approved at this time.';

  const notesRow = request.adminNotes
    ? `<tr><td colspan="2" style="padding:8px 16px 12px;">
        <p style="margin:0 0 4px;color:#71717a;font-size:12px;text-transform:uppercase;">Admin Notes</p>
        <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.5;">${escapeHtml(request.adminNotes)}</p>
      </td></tr>`
    : '';

  return baseLayout(
    `Request ${statusLabel}`,
    `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">
      Request <span style="color:${color};">${statusLabel}</span>
    </h2>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.5;">${message}</p>
    ${gameDetailsBlock(request, notesRow)}
    <p style="margin:24px 0 0;text-align:center;">
      <a href="${baseUrl}/requests"
         style="display:inline-block;padding:10px 24px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
        View My Requests
      </a>
    </p>`
  );
}

async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const transport = getTransporter();
  if (!transport) return;

  try {
    await transport.sendMail({ from: senderFrom!, to, subject, html });
  } catch (err) {
    console.error('[email] Failed to send email:', err);
  }
}

export function sendNewRequestNotification(
  request: RequestDto,
  requesterName: string
): void {
  const adminEmail = config.email?.adminEmail;
  if (!adminEmail) return;

  const subject = `[${APP_NAME}] New request: ${request.gameName} (${request.platformName})`;
  const html = newRequestTemplate(request, requesterName);

  sendMail(adminEmail, subject, html).catch((err) => {
    console.error(
      '[email] Unexpected error sending new-request notification:',
      err
    );
  });
}

export function sendRequestStatusNotification(request: RequestDto): void {
  const userEmail = request.user?.email;
  if (!userEmail) return;

  const status = request.status as 'fulfilled' | 'rejected';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const subject = `[${APP_NAME}] Request ${statusLabel}: ${request.gameName} (${request.platformName})`;
  const html = requestStatusTemplate(request, status);

  sendMail(userEmail, subject, html).catch((err) => {
    console.error('[email] Unexpected error sending status notification:', err);
  });
}
