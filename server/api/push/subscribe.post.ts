import { defineEventHandler, readBody, createError } from 'h3';
import { pushService } from '../../utils/push';

export default defineEventHandler(async (event) => {
  const subscription = await readBody(event);
  if (!subscription || !subscription.endpoint) {
    throw createError({ statusCode: 400, message: 'Ungültiges Subscription Objekt' });
  }

  await pushService.addSubscription(subscription);
  return { success: true, message: 'Push-Abonnement gespeichert' };
});
