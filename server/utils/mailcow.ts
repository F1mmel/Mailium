import { db } from './db';

export const mailcowService = {
  async getSettings() {
    const data = await db.read();
    return data.settings?.mailcow || {};
  },

  async syncAccounts() {
    const settings = await this.getSettings();
    
    if (!settings.host || !settings.apiKey) {
      console.log('Mailcow sync skipped: Not configured or missing credentials');
      return { added: 0, total: 0, message: 'Mailcow not configured' };
    }

    const host = settings.host.startsWith('http') ? settings.host : `https://${settings.host}`;
    const mailboxUrl = `${host}/api/v1/get/mailbox/all`;
    const aliasUrl = `${host}/api/v1/get/alias/all`;

    try {
      console.log('Syncing with Mailcow:', mailboxUrl);
      
      const [mbRes, aliasRes] = await Promise.all([
        $fetch(mailboxUrl, { headers: { 'X-API-Key': settings.apiKey, 'Content-Type': 'application/json' } }),
        $fetch(aliasUrl, { headers: { 'X-API-Key': settings.apiKey, 'Content-Type': 'application/json' } }).catch(() => [])
      ]);

      const mailboxes: any = mbRes;
      const aliases: any = aliasRes;
      
      if (!Array.isArray(mailboxes)) {
         console.warn('Mailcow response is not an array:', mailboxes);
         return { added: 0, total: 0, error: 'Invalid response format' };
      }

      const aliasMap: Record<string, string[]> = {};
      if (Array.isArray(aliases)) {
          aliases.forEach((a: any) => {
              if (String(a.active) === '1' && a.goto) {
                  const targets = a.goto.split(',').map((t: string) => t.trim().toLowerCase());
                  targets.forEach((target: string) => {
                      if (!aliasMap[target]) aliasMap[target] = [];
                      if (a.address && a.address.includes('@')) {
                          aliasMap[target].push(a.address.toLowerCase());
                      }
                  });
              }
          });
      }

      const data = await db.read();
      const existingAccounts = data.emailAccounts || [];
      const existingEmails = new Set(existingAccounts.map((a: any) => a.email.toLowerCase()));
      const newAccounts: any[] = [];
      const updatedAccounts: any[] = [...existingAccounts];

      for (const mb of mailboxes) {
          const email = (mb.username || mb.email || '').toLowerCase();
          const name = mb.name || mb.local_part || email.split('@')[0];
          const mailboxAliases = aliasMap[email] || [];
          
          if (email && !existingEmails.has(email)) {
              newAccounts.push({
                  id: Math.random().toString(36).substring(2, 15),
                  name: name,
                  email: email,
                  aliases: mailboxAliases,
                  imapHost: settings.host.replace(/^https?:\/\//, ''),
                  imapPort: 993,
                  imapUser: email,
                  imapPass: '', 
                  smtpHost: settings.host.replace(/^https?:\/\//, ''),
                  smtpPort: 465,
                  smtpUser: email,
                  smtpPass: '',
                  tls: true,
                  source: 'mailcow',
                  visible: true
              });
          } else if (email) {
              const accIdx = updatedAccounts.findIndex(a => a.email.toLowerCase() === email);
              if (accIdx !== -1) {
                  updatedAccounts[accIdx].aliases = mailboxAliases;
              }
          }
      }

      await db.write({
          emailAccounts: [...updatedAccounts, ...newAccounts]
      });

      return { added: newAccounts.length, total: mailboxes.length };

    } catch (e: any) {
      console.error('Mailcow sync failed:', e);
      throw e;
    }
  }
};
