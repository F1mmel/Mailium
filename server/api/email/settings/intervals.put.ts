import { defineEventHandler, readBody } from 'h3';
import { updateData } from '../../../lib/data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { cacheInterval, emailSyncInterval } = body || {};

  await updateData((data) => {
    if (!data.settings) data.settings = {};
    if (cacheInterval !== undefined) data.settings.cacheInterval = parseInt(cacheInterval, 10);
    if (emailSyncInterval !== undefined) data.settings.emailSyncInterval = parseInt(emailSyncInterval, 10);
  });

  return { success: true, message: 'Interval settings updated' };
});
