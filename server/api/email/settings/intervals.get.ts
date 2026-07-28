import { defineEventHandler } from 'h3';
import { readData } from '../../../lib/data';

export default defineEventHandler(async () => {
  const data = await readData();
  const settings = data.settings || {};

  return {
    cacheInterval: settings.cacheInterval !== undefined ? settings.cacheInterval : 0, // 0 = never
    emailSyncInterval: settings.emailSyncInterval !== undefined ? settings.emailSyncInterval : 30000 // 30s default
  };
});
