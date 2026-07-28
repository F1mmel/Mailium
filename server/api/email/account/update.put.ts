import { defineEventHandler, readBody, createError } from 'h3';
import { updateData } from '../../../lib/data';
import { syncMonitors } from '../../../plugins/push-worker';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { id, password, imapPass, smtpPass, name, visible, imapHost, imapPort, smtpHost, smtpPort, clearPassword } = body;

  if (!id) {
    throw createError({ statusCode: 400, message: 'Account ID is required' });
  }

  const passToSet = password || imapPass;

  await updateData((data) => {
    const acc = data.emailAccounts?.find((a: any) => a.id === id);
    if (acc) {
      if (clearPassword) {
        acc.imapPass = '';
        acc.smtpPass = '';
      } else if (passToSet !== undefined && passToSet !== '') {
        acc.imapPass = passToSet;
        acc.smtpPass = smtpPass || passToSet;
      }
      if (name !== undefined) acc.name = name;
      if (visible !== undefined) acc.visible = visible;
      if (imapHost !== undefined) acc.imapHost = imapHost;
      if (imapPort !== undefined) acc.imapPort = parseInt(imapPort, 10) || 993;
      if (smtpHost !== undefined) acc.smtpHost = smtpHost;
      if (smtpPort !== undefined) acc.smtpPort = parseInt(smtpPort, 10) || 465;
    }
  });

  syncMonitors().catch(() => {});

  return { message: 'Account updated successfully' };
});
