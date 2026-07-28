import { defineEventHandler, readBody, createError } from 'h3';
import { imapService } from '../../utils/imap';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accountId, folder } = body;

  if (!accountId) {
    throw createError({ statusCode: 400, message: 'accountId erforderlich' });
  }

  const targetFolder = folder || 'INBOX';

  try {
    await imapService.syncMessages(accountId, targetFolder);
    return { success: true, message: `Ordner ${targetFolder} erfolgreich synchronisiert` };
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Fehler beim Synchronisieren' });
  }
});
