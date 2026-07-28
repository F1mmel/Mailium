import { defineEventHandler, readBody, createError } from 'h3';
import { imapService } from '../../../utils/imap';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accountId, folderName } = body || {};

  if (!accountId || !folderName || !folderName.trim()) {
    throw createError({ statusCode: 400, message: 'accountId und folderName erforderlich' });
  }

  try {
    return await imapService.createFolder(accountId, folderName.trim());
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Ordner konnte nicht erstellt werden' });
  }
});
