import { defineEventHandler } from 'h3';
import { pushService } from '../../utils/push';

export default defineEventHandler((event) => {
  return { publicKey: pushService.getPublicKey() };
});
