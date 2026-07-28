import { defineEventHandler, readBody, createError } from 'h3';
import { updateData } from '../../lib/data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, email, imapHost, imapPort, imapUser, imapPass, smtpHost, smtpPort, smtpUser, smtpPass, tls } = body;

  if (!email || !imapHost || !imapUser || !imapPass) {
    throw createError({ statusCode: 400, message: 'Erforderliche Felder fehlen' });
  }

  const id = Math.random().toString(36).substring(2, 15);
  const newAccount = {
    id,
    name: name || email,
    email,
    imapHost,
    imapPort: Number(imapPort) || 993,
    imapUser,
    imapPass,
    smtpHost: smtpHost || imapHost,
    smtpPort: Number(smtpPort) || 465,
    smtpUser: smtpUser || imapUser,
    smtpPass: smtpPass || imapPass,
    tls: tls !== undefined ? tls : true,
    visible: true
  };

  await updateData((data) => {
    if (!data.emailAccounts) data.emailAccounts = [];
    data.emailAccounts.push(newAccount);
  });

  return { id, message: 'Konto hinzugefügt' };
});
