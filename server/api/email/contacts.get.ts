import { defineEventHandler, getQuery, createError } from 'h3';
import { readData } from '../../lib/data';
import { readFolderCache } from '../../lib/storage';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const accountId = query.accountId as string;

  if (!accountId) {
    throw createError({ statusCode: 400, message: 'AccountId erforderlich' });
  }

  const data = await readData();
  const account = data.emailAccounts?.find((a: any) => a.id === accountId);
  const ownEmail = account?.email?.toLowerCase() || '';

  const contactsMap = new Map<string, { name: string; address: string }>();
  const commonFolders = ['INBOX', 'Sent', 'Archive', 'Trash', 'Junk'];

  for (const folder of commonFolders) {
    const folderData = await readFolderCache(accountId, folder);
    if (folderData && folderData.messages) {
      folderData.messages.forEach((msg: any) => {
        if (msg.from) {
          msg.from.forEach((f: any) => {
            if (f.address && f.address.toLowerCase() !== ownEmail) {
              const key = f.address.toLowerCase();
              if (!contactsMap.has(key)) {
                contactsMap.set(key, {
                  name: f.name || f.address,
                  address: f.address
                });
              }
            }
          });
        }
        if (msg.to) {
          msg.to.forEach((t: any) => {
            if (t.address && t.address.toLowerCase() !== ownEmail) {
              const key = t.address.toLowerCase();
              if (!contactsMap.has(key)) {
                contactsMap.set(key, {
                  name: t.name || t.address,
                  address: t.address
                });
              }
            }
          });
        }
      });
    }
  }

  return Array.from(contactsMap.values());
});
