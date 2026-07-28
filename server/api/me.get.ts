import { defineEventHandler, createError } from 'h3';
import { getAuthUser } from '../utils/auth';
import { readData } from '../lib/data';

export default defineEventHandler(async (event) => {
  const payload = getAuthUser(event);
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Nicht angemeldet' });
  }

  const data = await readData();
  const user = (data.users || []).find((u: any) => u.id === payload.id);
  if (!user) {
    throw createError({ statusCode: 404, message: 'Benutzer nicht gefunden' });
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
});
