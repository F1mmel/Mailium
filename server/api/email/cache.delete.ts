import { defineEventHandler } from 'h3';
import { clearAllStorage, getStorageStats } from '../../lib/storage';

export default defineEventHandler(async () => {
  const before = await getStorageStats();
  await clearAllStorage();
  return { success: true, freedMb: before.sizeMb };
});
