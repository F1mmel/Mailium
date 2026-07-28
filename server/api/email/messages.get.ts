import { defineEventHandler, getQuery, createError } from 'h3';
import { imapService } from '../../utils/imap';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const accountId = query.accountId as string;
  const folder = (query.folder as string) || 'INBOX';
  const forceSync = query.forceSync === 'true';

  if (!accountId) {
    throw createError({ statusCode: 400, message: 'accountId erforderlich' });
  }

  try {
    return await imapService.fetchMessages(accountId, folder, forceSync);
  } catch (error: any) {
    if (error.statusCode === 401 || error.message === 'AUTH_REQUIRED') {
      throw createError({ statusCode: 401, message: 'Passwort erforderlich' });
    }
    throw createError({ statusCode: 500, message: error.message || 'Fehler beim Abrufen der Nachrichten' });
  }
});
