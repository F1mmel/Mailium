import { defineEventHandler, readBody, createError } from 'h3';
import { existsData, updateData } from '../lib/data';
import { hashPassword } from '../utils/password';
import { randomBytes } from 'crypto';
import { resetAuthCache, generateToken, setAuthCookie } from '../utils/auth';

export default defineEventHandler(async (event) => {
  const isConfigured = await existsData();
  if (isConfigured) {
    throw createError({
      statusCode: 403,
      message: 'System bereits konfiguriert.',
    });
  }

  const body = await readBody(event);
  const { username, email, password, mailcowHost, mailcowApiKey } = body;

  const adminEmail = email || 'admin@localhost';
  const adminUsername = username || 'admin';

  if (!password) {
    throw createError({
      statusCode: 400,
      message: 'Ein Passwort ist erforderlich.',
    });
  }

  let emailAccounts: any[] = [];
  let mailcowSettings = null;

  if (mailcowHost && mailcowApiKey) {
      try {
          const host = mailcowHost.replace(/^https?:\/\//, '');
          const mailcowUrl = `https://${host}/api/v1/get/mailbox/all`;
          
          const mailboxes: any = await $fetch(mailcowUrl, {
             headers: {
                 'X-API-Key': mailcowApiKey,
                 'Content-Type': 'application/json'
             }
          });

          if (Array.isArray(mailboxes)) {
              emailAccounts = mailboxes
                .filter((mb: any) => mb.active === 1)
                .map((mb: any) => ({
                 id: `mc_${mb.username}`, 
                 name: mb.name || mb.username,
                 email: mb.username,
                 imapHost: host, 
                 imapPort: 993,
                 imapUser: mb.username,
                 imapPass: '',
                 smtpHost: host,
                 smtpPort: 465, 
                 smtpUser: mb.username,
                 smtpPass: '',
                 tls: true,
                 source: 'mailcow',
                 visible: true
             }));
          }
          
          mailcowSettings = { host, apiKey: mailcowApiKey };
      } catch (e: any) {
          throw createError({
              statusCode: 400,
              message: 'Mailcow Verbindung fehlgeschlagen: ' + (e.message || e)
          });
      }
  }

  const hashedPassword = await hashPassword(password);
  const jwtSecret = randomBytes(64).toString('hex');
  
  const adminUser = {
    id: 'admin',
    username: adminUsername,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    authorName: 'Administrator',
    isAdmin: true,
    accentColor: '#4f46e5'
  };

  await updateData((data) => {
    data.users = [adminUser];
    data.settings = {
        jwtSecret: jwtSecret
    };
    if (mailcowSettings) {
        data.settings.mailcow = mailcowSettings;
    }
    if (emailAccounts.length > 0) {
        data.emailAccounts = emailAccounts;
    }
  });

  resetAuthCache();

  const token = generateToken({
    id: adminUser.id,
    email: adminUser.email
  });

  setAuthCookie(event, token);

  return { message: 'Setup abgeschlossen', user: { id: adminUser.id, username: adminUser.username, email: adminUser.email } };
});
