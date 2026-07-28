import { defineEventHandler, readBody, createError } from 'h3';
import { smtpService } from '../../utils/smtp';
import { imapService } from '../../utils/imap';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accountId, to, subject, text, html, fromOverride, attachments } = body;

  if (!accountId || !to || !subject) {
    throw createError({ statusCode: 400, message: 'accountId, to und subject sind erforderlich' });
  }

  try {
    const info = await smtpService.sendEmail(accountId, to, subject, text, html, fromOverride, attachments);
    
    // Append to Sent folder asynchronously
    try {
      const emailContent = `From: ${fromOverride || ''}\r\nTo: ${to}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html || text}`;
      await imapService.appendSentMessage(accountId, emailContent);
    } catch (appendErr) {
      console.warn('Sent append warning:', appendErr);
    }

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Fehler beim Senden der E-Mail' });
  }
});
