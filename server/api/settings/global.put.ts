import { defineEventHandler, readBody } from 'h3';
import { updateData } from '../../lib/data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  await updateData((data) => {
    if (!data.settings) data.settings = {};
    Object.assign(data.settings, body);
  });
  return { success: true };
});
