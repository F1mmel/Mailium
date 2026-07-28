import { defineEventHandler } from 'h3';
import { readData } from '../../lib/data';

export default defineEventHandler(async () => {
  const data = await readData();
  const mailcow = data.settings?.mailcow || {};

  return {
    host: mailcow.host || '',
    apiKey: mailcow.apiKey || ''
  };
});
