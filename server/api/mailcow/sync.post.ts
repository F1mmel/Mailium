import { defineEventHandler, createError } from 'h3';
import { mailcowService } from '../../utils/mailcow';

export default defineEventHandler(async (event) => {
  try {
    const result = await mailcowService.syncAccounts();
    return result;
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Mailcow Sync fehlgeschlagen' });
  }
});
