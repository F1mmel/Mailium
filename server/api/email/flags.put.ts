import { defineEventHandler, readBody, createError } from 'h3';
import { imapService } from '../../utils/imap';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accountId, folder, uid, flags, add } = body;

  if (!accountId || !folder || !uid || !flags || add === undefined) {
    throw createError({ statusCode: 400, message: 'Erforderliche Parameter fehlen' });
  }

  try {
    await imapService.updateFlags(accountId, folder, uid, flags, add);
    return { success: true };
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Fehler beim Aktualisieren der Flags' });
  }
});
