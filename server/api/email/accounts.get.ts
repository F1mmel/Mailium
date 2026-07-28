import { defineEventHandler } from 'h3';
import { readData } from '../../lib/data';

export default defineEventHandler(async (event) => {
  const data = await readData();
  const accounts = data.emailAccounts || [];
  
  return accounts.map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    email: acc.email,
    aliases: acc.aliases || [],
    imapHost: acc.imapHost,
    imapPort: acc.imapPort,
    smtpHost: acc.smtpHost,
    smtpPort: acc.smtpPort,
    hasPassword: !!acc.imapPass,
    source: acc.source,
    visible: acc.visible !== false
  }));
});
