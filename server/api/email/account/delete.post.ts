import { defineEventHandler, readBody, createError } from 'h3';
import { updateData } from '../../../lib/data';
import { syncMonitors } from '../../../plugins/push-worker';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { id } = body || {};

  if (!id) {
    throw createError({ statusCode: 400, message: 'Account ID is required' });
  }

  await updateData((data) => {
    if (data.emailAccounts) {
      data.emailAccounts = data.emailAccounts.filter((a: any) => a.id !== id);
    }
  });

  syncMonitors().catch(() => {});

  return { success: true, message: 'Account deleted' };
});
