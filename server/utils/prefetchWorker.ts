import { readData } from '../lib/data';
import { imapService } from './imap';

export interface PrefetchState {
  isRunning: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed';
  accountsProcessed: number;
  foldersProcessed: number;
  messagesCached: number;
  startTime: number | null;
  endTime: number | null;
  error?: string;
}

let prefetchState: PrefetchState = {
  isRunning: false,
  status: 'idle',
  accountsProcessed: 0,
  foldersProcessed: 0,
  messagesCached: 0,
  startTime: null,
  endTime: null
};

let lastAutoPrefetchTime = 0;

export const prefetchWorker = {
  getState(): PrefetchState {
    return { ...prefetchState };
  },

  getLastAutoPrefetchTime(): number {
    return lastAutoPrefetchTime;
  },

  setLastAutoPrefetchTime(t: number) {
    lastAutoPrefetchTime = t;
  },

  async startPrefetch(): Promise<PrefetchState> {
    if (prefetchState.isRunning) {
      return this.getState();
    }

    prefetchState = {
      isRunning: true,
      status: 'running',
      accountsProcessed: 0,
      foldersProcessed: 0,
      messagesCached: 0,
      startTime: Date.now(),
      endTime: null
    };

    // Run in background asynchronously without blocking handler return
    (async () => {
      try {
        const data = await readData();
        const validAccounts = (data.emailAccounts || []).filter(
          (a: any) => a.hasPassword !== false && a.imapPass && a.visible !== false
        );

        for (const acc of validAccounts) {
          try {
            prefetchState.accountsProcessed++;
            const folderList = await imapService.fetchFolders(acc.id);

            for (const folder of folderList) {
              prefetchState.foldersProcessed++;
              try {
                const msgRes = await imapService.fetchMessages(acc.id, folder.path, true);
                const msgList = msgRes.messages || [];

                for (const msg of msgList) {
                  try {
                    await imapService.fetchMessageDetail(acc.id, folder.path, msg.id);
                    prefetchState.messagesCached++;
                  } catch (err) {
                    console.error(`Prefetch msg ${msg.id} in ${folder.path} error:`, err);
                  }
                }
              } catch (err) {
                console.error(`Prefetch folder ${folder.path} error:`, err);
              }
            }
          } catch (err) {
            console.error(`Prefetch account ${acc.email} error:`, err);
          }
        }

        prefetchState.status = 'completed';
      } catch (err: any) {
        console.error('Background prefetch failed:', err);
        prefetchState.status = 'failed';
        prefetchState.error = err?.message || 'Prefetch failed';
      } finally {
        prefetchState.isRunning = false;
        prefetchState.endTime = Date.now();
        lastAutoPrefetchTime = Date.now();
      }
    })();

    return this.getState();
  }
};
