import { db } from '../utils/db';
import { imapService } from '../utils/imap';
import { pushService } from '../utils/push';
import { emitRefresh } from '../utils/events';
import { prefetchWorker } from '../utils/prefetchWorker';

const monitoredAccounts = new Map<string, any>();

export default defineNitroPlugin((nitroApp) => {
    startPushWorker();
});

export async function startPushWorker() {
    console.log('Starting Push Worker Manager...');
    await syncMonitors();
    setInterval(syncMonitors, 20000);
    setInterval(checkScheduledPrefetch, 30000);
}

async function checkScheduledPrefetch() {
    try {
        const data = await db.read();
        const cacheInterval = data.settings?.cacheInterval || 0;
        if (cacheInterval > 0 && !prefetchWorker.getState().isRunning) {
            const last = prefetchWorker.getLastAutoPrefetchTime();
            if (Date.now() - last >= cacheInterval) {
                console.log('Triggering scheduled background cache prefetch...');
                prefetchWorker.startPrefetch();
            }
        }
    } catch (e) {
        console.error('Error checking scheduled prefetch:', e);
    }
}

export async function syncMonitors() {
    try {
        const data = await db.read();
        const accounts = data.emailAccounts || [];
        const validAccounts = accounts.filter((a: any) => a.imapPass && a.imapPass.trim().length > 0 && a.visible !== false); 
        const validIds = new Set(validAccounts.map((a: any) => a.id));

        for (const account of validAccounts) {
            if (!monitoredAccounts.has(account.id)) {
                monitorAccount(account);
            }
        }

        for (const [id] of monitoredAccounts) {
            if (!validIds.has(id)) {
                console.log(`Account ${id} removed or disabled, stopping push monitor.`);
                stopMonitor(id);
            }
        }
    } catch (e) {
        console.error('Error syncing push monitors:', e);
    }
}

function stopMonitor(accountId: string) {
    const client = monitoredAccounts.get(accountId);
    if (client) {
        try {
            client.removeAllListeners();
            client.logout().catch(() => {});
            client.close();
        } catch (e) {
            console.error(`Error stopping monitor for ${accountId}:`, e);
        }
        monitoredAccounts.delete(accountId);
    }
}

async function monitorAccount(account: any) {
    if (monitoredAccounts.has(account.id) && monitoredAccounts.get(account.id) !== null) return;
    
    monitoredAccounts.set(account.id, null); 

    console.log(`Starting push monitor for ${account.email}...`);
    
    try {
        const client = await imapService.getClient(account.id);
        monitoredAccounts.set(account.id, client);
        
        await client.mailboxOpen('INBOX');
        
        client.on('exists', async (data: any) => {
            console.log(`Message event in ${account.email} (exists: ${data.count})`);
            // Always emit UI refresh so the frontend inbox updates in-place
            emitRefresh(account.id);
            
            try {
                const message = await client.fetchOne('*', { envelope: true, source: false });
                
                if (message && message.envelope) {
                    const msgDate = message.envelope.date ? new Date(message.envelope.date).getTime() : 0;
                    const isRecent = (Date.now() - msgDate) < 180000; // Only notify if email is truly new (received in last 3 minutes)

                    if (isRecent) {
                        const subject = message.envelope.subject || 'No Subject';
                        const from = message.envelope.from?.[0]?.name || message.envelope.from?.[0]?.address || 'Unknown';
                        
                        await pushService.notifyAll({
                            title: `Neue E-Mail von ${from}`,
                            body: subject,
                            url: `/?folder=INBOX&account=${account.id}&messageId=${message.uid}`
                        });
                    }
                }
            } catch (e) {
                console.error('Error fetching new message details for push:', e);
            }
        });

        client.on('close', () => {
            if (monitoredAccounts.has(account.id)) {
                console.log(`Push connection closed for ${account.email}, retrying in 30s...`);
                monitoredAccounts.delete(account.id);
                setTimeout(() => monitorAccount(account), 30000);
            }
        });

        client.on('error', (err: any) => {
            console.error(`IMAP Error for ${account.email}:`, err);
        });

    } catch (e) {
        console.error(`Failed to start push monitor for ${account.email}:`, e);
        monitoredAccounts.delete(account.id);
        setTimeout(() => {
             db.read().then(data => {
                 const current = data.emailAccounts?.find((a: any) => a.id === account.id);
                 if (current && current.imapPass && current.visible !== false) {
                     monitorAccount(account);
                 }
             });
        }, 30000);
    }
}
