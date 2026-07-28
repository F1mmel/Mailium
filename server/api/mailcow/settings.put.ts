import { defineEventHandler, readBody, createError } from 'h3';
import { updateData } from '../../lib/data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { host, apiKey } = body || {};

  await updateData((data) => {
    if (!data.settings) data.settings = {};
    data.settings.mailcow = {
      host: (host || '').trim(),
      apiKey: (apiKey || '').trim()
    };
  });

  return { success: true, message: 'Mailcow settings updated successfully' };
});
