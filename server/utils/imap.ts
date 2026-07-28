import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { readData } from '../lib/data';
import { writeBody, readBody, readFolderCache, writeFolderCache, deleteFolderCache } from '../lib/storage';

const syncLocks = new Map<string, Promise<void>>();

export const imapService = {
  async getClient(accountId: string) {
    const data = await readData();
    const account = data.emailAccounts?.find((a: any) => a.id === accountId);

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    if (!account.imapPass) {
      throw new Error('Passwort erforderlich');
    }

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort || 993,
      secure: account.imapPort !== 143,
      auth: {
        user: account.email,
        pass: account.imapPass
      },
      logger: false,
      clientInfo: {
        name: 'Mailium App',
        version: '2.0.2'
      }
    });

    await client.connect();
    return client;
  },

  async fetchFolders(accountId: string) {
    const client = await this.getClient(accountId);
    try {
      const list = await client.list({ statusQuery: { unseen: true } });
      const results: any[] = [];

      for (const f of list) {
        let unseen = f.status?.unseen;
        if (unseen === undefined || unseen === null) {
          const cached = await readFolderCache(accountId, f.path);
          if (cached && cached.messages && Array.isArray(cached.messages)) {
            unseen = cached.messages.filter((m: any) => !m.isRead && (!m.flags || !m.flags.includes('\\Seen'))).length;
          } else {
            unseen = 0;
          }
        }

        results.push({
          path: f.path,
          name: (f.name || f.path || '').toUpperCase() === 'INBOX' ? 'Inbox' : f.name,
          flags: Array.from(f.flags || []),
          unseen: unseen || 0
        });
      }

      return results;
    } finally {
      await client.logout();
    }
  },

  async createFolder(accountId: string, folderName: string) {
    const client = await this.getClient(accountId);
    try {
      await client.mailboxCreate(folderName);
      return { success: true, folderName };
    } finally {
      await client.logout();
    }
  },

  async renameFolder(accountId: string, oldPath: string, newPath: string) {
    if (oldPath.toUpperCase() === 'INBOX' || oldPath === 'INBOX') {
      throw new Error('Die INBOX kann nicht umbenannt werden.');
    }
    const client = await this.getClient(accountId);
    try {
      await client.mailboxRename(oldPath, newPath);
      await deleteFolderCache(accountId, oldPath);
      return { success: true, oldPath, newPath };
    } finally {
      await client.logout();
    }
  },

  async deleteFolder(accountId: string, folderPath: string) {
    if (folderPath.toUpperCase() === 'INBOX' || folderPath === 'INBOX') {
      throw new Error('Die INBOX kann nicht gelöscht werden.');
    }
    const client = await this.getClient(accountId);
    try {
      await client.mailboxDelete(folderPath);
      await deleteFolderCache(accountId, folderPath);
      return { success: true, folderPath };
    } finally {
      await client.logout();
    }
  },

  async fetchMessages(accountId: string, folder: string = 'INBOX', arg3?: any, arg4?: any, arg5?: boolean) {
    let forceSync = false;
    if (typeof arg3 === 'boolean') {
      forceSync = arg3;
    } else if (typeof arg5 === 'boolean') {
      forceSync = arg5;
    }

    const dbData = await readData();
    const account = dbData.emailAccounts?.find((a: any) => a.id === accountId);
    if (!account || !account.imapPass) {
        throw new Error('AUTH_REQUIRED');
    }

    const lockKey = `${accountId}:${folder}`;
    if (syncLocks.has(lockKey)) {
        await syncLocks.get(lockKey);
        const cached = await readFolderCache(accountId, folder);
        return cached || { messages: [], total: 0 };
    }

    const cached = await readFolderCache(accountId, folder);

    if (cached && cached.messages && cached.messages.length > 0 && !forceSync) {
        this.syncMessages(accountId, folder).catch(err => console.error('Background sync failed:', err));
        return cached;
    }

    await this.syncMessages(accountId, folder);
    const refreshed = await readFolderCache(accountId, folder);
    return refreshed || { messages: [], total: 0 };
  },

  async syncMessages(accountId: string, folder: string = 'INBOX') {
      const lockKey = `${accountId}:${folder}`;
      if (syncLocks.has(lockKey)) return syncLocks.get(lockKey);

      const syncPromise = (async () => {
          const client = await this.getClient(accountId);
          const messages: any[] = [];
          let total = 0;

          const dbData = await readData();
          const account = dbData.emailAccounts?.find((a: any) => a.id === accountId);

          try {
            const lock = await client.getMailboxLock(folder);
            try {
                const status = await client.status(folder, { messages: true });
                total = status.messages || 0;
                
                if (total > 0) {
                    const to = total;
                    const fromIdx = Math.max(1, total - 49);
                    const range = `${fromIdx}:${to}`;

                    const mapAddress = (addr: any) => ({
                        name: addr.name || (addr.address?.toLowerCase() === account?.email?.toLowerCase() ? account.name : ''),
                        address: addr.address || ''
                    });

                    for await (const message of client.fetch(range, { envelope: true, flags: true, bodyStructure: true }, { changedSince: 0n })) {
                        const envelope = message.envelope;
                        
                        let attachmentMeta: any[] = [];
                        if (message.bodyStructure) {
                            const extractParts = (part: any) => {
                                if (part.disposition === 'attachment' || (part.disposition === 'inline' && part.parameters?.name)) {
                                    attachmentMeta.push({
                                        filename: part.parameters?.name || part.dispositionParameters?.filename || 'attachment',
                                        contentType: part.type,
                                        size: part.size
                                    });
                                }
                                if (part.childNodes) {
                                    part.childNodes.forEach(extractParts);
                                }
                            };
                            extractParts(message.bodyStructure);
                        }

                        const bodyKey = `${accountId}_${folder}_${message.uid}`;
                        const cachedBody = await readBody(bodyKey);
                        const snippetText = cachedBody?.snippet || '';

                        messages.push({
                            id: message.uid.toString(),
                            uid: message.uid,
                            subject: envelope.subject || '(Kein Betreff)',
                            from: envelope.from ? envelope.from.map(mapAddress) : [],
                            to: envelope.to ? envelope.to.map(mapAddress) : [],
                            date: envelope.date,
                            flags: Array.from(message.flags),
                            isRead: message.flags.has('\\Seen'),
                            snippet: snippetText,
                            attachments: attachmentMeta
                        });
                    }
                }
            } finally {
                lock.release();
            }

            messages.reverse();
            await writeFolderCache(accountId, folder, { messages, total, lastSync: new Date().toISOString() });
          } finally {
            await client.logout();
          }
      })();

      syncLocks.set(lockKey, syncPromise);
      try {
          await syncPromise;
      } finally {
          syncLocks.delete(lockKey);
      }
  },

  async fetchMessageDetail(accountId: string, folder: string = 'INBOX', uid: string) {
    const dbData = await readData();
    const account = dbData.emailAccounts?.find((a: any) => a.id === accountId);
    if (!account || !account.imapPass) {
        throw new Error('AUTH_REQUIRED');
    }

    const cachedFolder = await readFolderCache(accountId, folder);
    const cachedMsg = cachedFolder?.messages?.find((m: any) => m.uid.toString() === uid.toString());

    if (cachedMsg && cachedMsg.html !== undefined) {
      return cachedMsg;
    }

    const bodyKey = `${accountId}_${folder}_${uid}`;
    const cachedBody = await readBody(bodyKey);
    if (cachedBody) {
        const fullMsg = { ...cachedMsg, ...cachedBody };
        if (cachedFolder && cachedMsg) {
             Object.assign(cachedMsg, cachedBody);
             await writeFolderCache(accountId, folder, cachedFolder);
        }
        return fullMsg;
    }

    const client = await this.getClient(accountId);
    try {
      const lock = await client.getMailboxLock(folder);
      let parsed: any = null;
      let flags: string[] = [];

      try {
        const message = await client.fetchOne(uid, { source: true, flags: true }, { uid: true });
        if (!message || !message.source) {
          throw new Error(`Message ${uid} not found`);
        }
        flags = Array.from(message.flags);
        parsed = await simpleParser(message.source);
      } finally {
        lock.release();
      }

      const attachments = (parsed.attachments || []).map((att: any) => ({
        filename: att.filename || 'attachment',
        contentType: att.contentType,
        size: att.size,
        contentId: att.contentId
      }));

      const bodyData = {
        html: parsed.html || (parsed.textAsHtml ? parsed.textAsHtml : parsed.text ? `<pre>${parsed.text}</pre>` : ''),
        text: parsed.text || '',
        snippet: (parsed.text || '').substring(0, 150).replace(/\s+/g, ' '),
        attachments
      };

      await writeBody(bodyKey, bodyData);

      const dbData = await readData();
      const account = dbData.emailAccounts?.find((a: any) => a.id === accountId);
      const mapAddress = (addr: any) => ({
          name: addr.name || (addr.address?.toLowerCase() === account?.email?.toLowerCase() ? account.name : ''),
          address: addr.address || ''
      });

      const fullMsg = {
        id: uid.toString(),
        uid: parseInt(uid, 10),
        subject: parsed.subject || '(Kein Betreff)',
        from: parsed.from?.value ? parsed.from.value.map(mapAddress) : [],
        to: parsed.to?.value ? parsed.to.value.map(mapAddress) : [],
        date: parsed.date || new Date(),
        flags,
        isRead: flags.includes('\\Seen'),
        ...bodyData
      };

      if (cachedFolder && cachedMsg) {
          Object.assign(cachedMsg, fullMsg);
          await writeFolderCache(accountId, folder, cachedFolder);
      }

      return fullMsg;
    } finally {
      await client.logout();
    }
  },

  async fetchMessageBody(accountId: string, folder: string = 'INBOX', uid: string) {
    return this.fetchMessageDetail(accountId, folder, uid);
  },

  async moveMessages(accountId: string, uids: string[], fromFolder: string, toFolder: string) {
    const client = await this.getClient(accountId);
    try {
      const lock = await client.getMailboxLock(fromFolder);
      try {
        const uidRange = uids.join(',');
        await client.messageMove(uidRange, toFolder, { uid: true });
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }

    const fromCache = await readFolderCache(accountId, fromFolder);
    if (fromCache && fromCache.messages) {
        const uidSet = new Set(uids.map(u => u.toString()));
        fromCache.messages = fromCache.messages.filter((m: any) => !uidSet.has(m.uid.toString()));
        fromCache.total = Math.max(0, fromCache.total - uids.length);
        await writeFolderCache(accountId, fromFolder, fromCache);
    }
  },

  async updateFlags(accountId: string, folder: string, uid: string, flags: string[], add: boolean) {
    const client = await this.getClient(accountId);
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        if (add) {
          await client.messageFlagsAdd(uid, flags, { uid: true });
        } else {
          await client.messageFlagsRemove(uid, flags, { uid: true });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }

    const cachedFolder = await readFolderCache(accountId, folder);
    if (cachedFolder && cachedFolder.messages) {
        const msg = cachedFolder.messages.find((m: any) => m.uid.toString() === uid.toString());
        if (msg) {
            const currentFlags = new Set(msg.flags || []);
            flags.forEach(f => {
                if (add) currentFlags.add(f);
                else currentFlags.delete(f);
            });
            msg.flags = Array.from(currentFlags);
            
            if (flags.some(f => f.toLowerCase() === '\\\\seen' || f.toLowerCase() === '\\seen')) {
                msg.isRead = add;
            }
            await writeFolderCache(accountId, folder, cachedFolder);
        }
    }
  },

  async appendSentMessage(accountId: string, content: string | Buffer, folder: string = 'Sent') {
     const client = await this.getClient(accountId);
     try {
       await client.append(folder, content, ['\\Seen']);
     } catch (e) {
       console.error('Failed to append to Sent:', e);
     } finally {
       await client.logout();
     }
  }
};
