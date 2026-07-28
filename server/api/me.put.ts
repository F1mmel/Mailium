import { defineEventHandler, readBody, createError } from 'h3';
import { getAuthUser } from '../utils/auth';
import { updateData } from '../lib/data';
import { hashPassword } from '../utils/password';

export default defineEventHandler(async (event) => {
  const payload = getAuthUser(event);
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Nicht angemeldet' });
  }

  const body = await readBody(event);
  const { username, email, password, accentColor } = body;

  let newHashedPassword: string | null = null;
  if (password && password.trim() !== '') {
    newHashedPassword = await hashPassword(password);
  }

  let updatedUser: any = null;

  await updateData((data) => {
    const userIndex = (data.users || []).findIndex((u: any) => u.id === payload.id);
    if (userIndex === -1) return;

    if (username) data.users[userIndex].username = username;
    if (email) data.users[userIndex].email = email;
    if (accentColor) data.users[userIndex].accentColor = accentColor;
    if (newHashedPassword) data.users[userIndex].password = newHashedPassword;

    const { password: _, ...rest } = data.users[userIndex];
    updatedUser = rest;
  });

  if (!updatedUser) {
    throw createError({ statusCode: 404, message: 'Benutzer konnte nicht aktualisiert werden' });
  }

  return updatedUser;
});
