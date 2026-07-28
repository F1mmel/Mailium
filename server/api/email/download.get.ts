import { defineEventHandler, getQuery, createError, setResponseHeaders } from 'h3';
import { simpleParser } from 'mailparser';
import { imapService } from '../../utils/imap';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const accountId = query.accountId as string;
  const folder = (query.folder as string) || 'INBOX';
  const uid = (query.uid || query.messageId) as string;
  const filename = query.filename as string;
  const indexStr = query.index as string;
  const inline = query.inline === 'true';

  if (!accountId || !uid) {
    throw createError({
      statusCode: 400,
      message: 'Missing accountId or uid'
    });
  }

  const client = await imapService.getClient(accountId);

  try {
    const lock = await client.getMailboxLock(folder);
    try {
        const fetchOne = await client.fetchOne(uid, { source: true }, { uid: true });
        
        if (!fetchOne) {
            throw createError({ statusCode: 404, message: 'Message not found' });
        }

        const parsed = await simpleParser(fetchOne.source);
        let attachment: any = null;

        if (filename) {
          attachment = parsed.attachments.find((att: any) => 
            att.filename === filename || att.checksum === filename || att.contentId === filename
          );
        }

        if (!attachment && indexStr !== undefined) {
          const idx = parseInt(indexStr);
          if (!isNaN(idx) && parsed.attachments[idx]) {
            attachment = parsed.attachments[idx];
          }
        }

        if (!attachment && parsed.attachments.length > 0) {
          attachment = parsed.attachments[0];
        }

        if (!attachment) {
           throw createError({ statusCode: 404, message: 'Attachment not found' });
        }

        const disposition = inline ? 'inline' : `attachment; filename="${encodeURIComponent(attachment.filename || 'download')}"`;

        setResponseHeaders(event, {
            'Content-Type': attachment.contentType || 'application/octet-stream',
            'Content-Disposition': disposition,
            'Content-Length': attachment.size
        });

        return attachment.content;

    } finally {
        lock.release();
    }
  } catch (e: any) {
      console.error('Attachment download error:', e);
      throw createError({ statusCode: 500, message: e.message || 'Download failed' });
  } finally {
      await client.logout();
  }
});
