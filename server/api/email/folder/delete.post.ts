import { defineEventHandler, readBody, createError } from 'h3';
import { imapService } from '../../../utils/imap';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accountId, folderPath } = body || {};

  if (!accountId || !folderPath) {
    throw createError({ statusCode: 400, message: 'accountId and folderPath required' });
  }

  try {
    return await imapService.deleteFolder(accountId, folderPath);
  } catch (e: any) {
    throw createError({ statusCode: 500, message: e?.message || 'Failed to delete folder' });
  }
});
