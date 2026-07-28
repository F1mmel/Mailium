import { defineEventHandler } from 'h3';
import { getAuthUser } from '../../utils/auth';
import { readData } from '../../lib/data';

export default defineEventHandler(async (event) => {
  const payload = getAuthUser(event);
  if (!payload) {
    return { authenticated: false, user: null };
  }

  const data = await readData();
  const user = (data.users || []).find((u: any) => u.id === payload.id);

  if (!user) {
    return { authenticated: false, user: null };
  }

  const { password, ...userWithoutPassword } = user;
  return { authenticated: true, user: userWithoutPassword };
});
