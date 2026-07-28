import { defineEventHandler, readBody, createError } from 'h3';
import { imapService } from '../../../utils/imap';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { accountId, oldPath, newPath } = body || {};

  if (!accountId || !oldPath || !newPath) {
    throw createError({ statusCode: 400, message: 'accountId, oldPath and newPath required' });
  }

  try {
    return await imapService.renameFolder(accountId, oldPath, newPath.trim());
  } catch (e: any) {
    throw createError({ statusCode: 500, message: e?.message || 'Failed to rename folder' });
  }
});
