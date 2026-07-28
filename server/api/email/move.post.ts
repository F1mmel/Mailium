import { defineEventHandler, readBody, createError } from 'h3';
import { imapService } from '../../utils/imap';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accountId, uid, uids, fromFolder, toFolder } = body;

  if (!accountId || (!uid && (!uids || uids.length === 0)) || !fromFolder || !toFolder) {
    throw createError({ statusCode: 400, message: 'AccountId, UIDs, fromFolder und toFolder erforderlich' });
  }

  const targetUids = uids || [uid];

  try {
    await imapService.moveMessages(accountId, targetUids, fromFolder, toFolder);
    return { success: true, message: `${targetUids.length} Nachrichten verschoben` };
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Fehler beim Verschieben' });
  }
});
