import { defineEventHandler, getQuery, createError } from 'h3';
import { imapService } from '../../utils/imap';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const accountId = query.accountId as string;

  if (!accountId) {
    throw createError({ statusCode: 400, message: 'accountId erforderlich' });
  }

  try {
    return await imapService.fetchFolders(accountId);
  } catch (error: any) {
    if (error.message === 'AUTH_REQUIRED') {
      throw createError({ statusCode: 401, message: 'Passwort erforderlich' });
    }
    throw createError({ statusCode: 500, message: error.message || 'Fehler beim Abrufen der Ordner' });
  }
});
