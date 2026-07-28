import jwt from 'jsonwebtoken';
import { H3Event, setCookie, getCookie } from 'h3';
import { readDataSync } from '../lib/data';

const JWT_EXPIRES_IN = '30d';

interface UserPayload {
  id: string;
  email: string;
}

let secretCache: string | null = null;

export const resetAuthCache = () => {
  secretCache = null;
};

export const getJwtSecret = () => {
  if (secretCache) return secretCache;
  
  const data = readDataSync();
  
  secretCache = data.settings?.jwtSecret || 'supersecretjwtkeythatshouldbechangedinproduction';
  return secretCache!;
};

export const generateToken = (payload: { id: string, email: string }): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    return jwt.verify(token, getJwtSecret()) as UserPayload;
  } catch (error) {
    return null;
  }
};

export const setAuthCookie = (event: H3Event, token: string) => {
  const req = event.node.req;
  const isHttps = !!(req.socket as any)?.encrypted || req.headers['x-forwarded-proto'] === 'https';

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: isHttps,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
  });
};

export const clearAuthCookie = (event: H3Event) => {
  setCookie(event, 'auth_token', '', {
    httpOnly: true,
    secure: false,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
  });
};

export const getAuthUser = (event: H3Event): UserPayload | null => {
  const token = getCookie(event, 'auth_token');
  if (!token) {
    return null;
  }
  return verifyToken(token);
};
