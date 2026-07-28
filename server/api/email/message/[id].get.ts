import { defineEventHandler, getQuery, createError } from 'h3';
import { imapService } from '../../../utils/imap';

export default defineEventHandler(async (event) => {
  const uid = event.context.params?.id;
  const query = getQuery(event);
  const accountId = query.accountId as string;
  const folder = (query.folder as string) || 'INBOX';

  if (!uid || !accountId) {
    throw createError({ statusCode: 400, message: 'Message ID and accountId are required' });
  }

  try {
    const message = await imapService.fetchMessageDetail(accountId, folder, uid);
    if (!message) {
      throw createError({ statusCode: 404, message: 'Message not found' });
    }
    return message;
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to load message' });
  }
});
