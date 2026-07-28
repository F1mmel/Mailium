import { defineEventHandler, readBody, createError } from 'h3';
import { readData } from '../../lib/data';
import { comparePassword } from '../../utils/password';
import { generateToken, setAuthCookie } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, email, password } = body;

  const identifier = username || email;

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      message: 'Benutzername/E-Mail und Passwort erforderlich.',
    });
  }

  const data = await readData();
  const users = data.users || [];

  const user = users.find(
    (u: any) =>
      u.email?.toLowerCase() === identifier.toLowerCase() ||
      u.username?.toLowerCase() === identifier.toLowerCase()
  );

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Ungültige Anmeldedaten.',
    });
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: 'Ungültige Anmeldedaten.',
    });
  }

  const token = generateToken({ id: user.id, email: user.email });
  setAuthCookie(event, token);

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword };
});
