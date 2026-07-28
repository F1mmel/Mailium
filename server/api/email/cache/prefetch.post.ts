import { defineEventHandler } from 'h3';
import { prefetchWorker } from '../../../utils/prefetchWorker';

export default defineEventHandler(async () => {
  return await prefetchWorker.startPrefetch();
});
