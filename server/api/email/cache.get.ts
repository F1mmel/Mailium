import { defineEventHandler } from 'h3';
import { getStorageStats } from '../../lib/storage';

export default defineEventHandler(async () => {
  return await getStorageStats();
});
