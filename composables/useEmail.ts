import { ref, computed, watch } from 'vue';

const allAccounts = ref<any[]>([]);
const accounts = ref<any[]>([]);
const selectedAccountId = ref<string | null>(null);
const folders = ref<Record<string, any[]>>({});
const isLoadingFolders = ref(false);
const isSyncing = ref(false);
const lastSyncTimestamp = ref<number>(Date.now());
const isComposeOpen = ref(false);
const syncInterval = ref<number>(30000); // Default 30s
const cacheIntervalSetting = ref<number>(0); // Default 0 (Never)
const isInitialSyncDone = ref(false);

// Client-Side Instant In-Memory & LocalStorage Disk Cache per Account & Folder
const clientMessagesCache = ref<Record<string, { messages: any[]; total: number }>>({});

// Hydrate client cache from localStorage on client init
if (import.meta.client) {
  try {
    const raw = localStorage.getItem('mailium_client_messages_cache');
    if (raw) {
      clientMessagesCache.value = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load client cache from localStorage:', e);
  }

  watch(clientMessagesCache, (newVal) => {
    try {
      localStorage.setItem('mailium_client_messages_cache', JSON.stringify(newVal));
    } catch (e) {
      // LocalStorage full or quota exceeded
    }
  }, { deep: true });
}

const isPasswordModalOpen = ref(false);
const accountNeedingPassword = ref<any | null>(null);

let syncTimer: any = null;
let globalEventSource: EventSource | null = null;

export const useEmail = () => {
  const currentAccount = computed(() => {
    return accounts.value.find(a => a.id === selectedAccountId.value) || null;
  });

  const totalUnreadCount = computed(() => {
    let total = 0;
    Object.values(folders.value).forEach(accountFolders => {
      if (!Array.isArray(accountFolders)) return;
      accountFolders.forEach((f: any) => {
        if (f.unseen && typeof f.unseen === 'number') {
          total += f.unseen;
        }
      });
    });
    return total;
  });

  const checkAccountPassword = (accountId?: string | null) => {
    const targetId = accountId || selectedAccountId.value;
    if (!targetId) return true;

    const acc = accounts.value.find(a => a.id === targetId);
    if (acc && !acc.hasPassword) {
      accountNeedingPassword.value = acc;
      isPasswordModalOpen.value = true;
      return false;
    }
    return true;
  };

  const fetchIntervalSettings = async () => {
    if (!import.meta.client) return;
    try {
      const res: any = await $fetch('/api/email/settings/intervals');
      cacheIntervalSetting.value = res.cacheInterval !== undefined ? res.cacheInterval : 0;
      syncInterval.value = res.emailSyncInterval !== undefined ? res.emailSyncInterval : 30000;
    } catch (e) {
      console.error('Failed to fetch interval settings:', e);
    }
  };

  const updateIntervalSettings = async (cacheInt: number, syncInt: number) => {
    if (!import.meta.client) return;
    cacheIntervalSetting.value = cacheInt;
    syncInterval.value = syncInt;
    try {
      await $fetch('/api/email/settings/intervals', {
        method: 'PUT',
        body: {
          cacheInterval: cacheInt,
          emailSyncInterval: syncInt
        }
      });
    } catch (e) {
      console.error('Failed to update interval settings:', e);
    }
  };

  const fetchAccounts = async (includeHidden: boolean = false) => {
    if (!import.meta.client) return;
    try {
      await fetchIntervalSettings();
      const data: any = await $fetch('/api/email/accounts');
      allAccounts.value = data || [];
      
      if (includeHidden) {
        accounts.value = data || [];
      } else {
        accounts.value = (data || []).filter((a: any) => a.visible !== false);
      }

      // Check URL query param first before selecting default first account
      const route = useRoute();
      const qAccount = route.query.account as string;
      if (qAccount && accounts.value.length > 0) {
        const found = accounts.value.find(a => a.email.toLowerCase() === qAccount.toLowerCase() || a.id === qAccount);
        if (found) {
          selectedAccountId.value = found.id;
        }
      }

      if (accounts.value.length > 0 && !selectedAccountId.value) {
        selectedAccountId.value = accounts.value[0].id;
      }

      if (selectedAccountId.value) {
        checkAccountPassword(selectedAccountId.value);
      }

      // Purge client messages cache for accounts missing password
      (data || []).forEach((acc: any) => {
        if (!acc.hasPassword) {
          Object.keys(clientMessagesCache.value).forEach(key => {
            if (key.startsWith(`${acc.id}:`)) {
              delete clientMessagesCache.value[key];
            }
          });
        }
      });
    } catch (e) {
      console.error('Failed to fetch accounts:', e);
    }
  };

  const fetchFolders = async (accountId: string, force: boolean = false) => {
    if (!import.meta.client || !accountId) return;
    const acc = accounts.value.find(a => a.id === accountId);
    if (acc && !acc.hasPassword) {
      folders.value = {
        ...folders.value,
        [accountId]: []
      };
      return;
    }
    if (!force && folders.value[accountId] && folders.value[accountId].length > 0) {
      return;
    }
    try {
      const res: any = await $fetch('/api/email/folders', {
        query: { accountId }
      });
      const fetchedFolders = Array.isArray(res) ? res : (res?.folders || []);
      folders.value = {
        ...folders.value,
        [accountId]: fetchedFolders
      };
    } catch (e: any) {
      console.error(`Failed to fetch folders for account ${accountId}:`, e);
    }
  };

  const createFolder = async (accountId: string, folderName: string) => {
    if (!import.meta.client) return;
    try {
      const res: any = await $fetch('/api/email/folder/create', {
        method: 'POST',
        body: { accountId, folderName }
      });
      await fetchFolders(accountId, true);
      return res;
    } catch (e) {
      console.error('Failed to create folder:', e);
      throw e;
    }
  };

  const syncAccount = async (accountId?: string) => {
    if (!import.meta.client) return;
    isSyncing.value = true;
    try {
      const targetId = accountId || selectedAccountId.value;
      if (targetId) {
        const acc = accounts.value.find(a => a.id === targetId);
        if (acc && !acc.hasPassword) {
          checkAccountPassword(targetId);
          return;
        }
        await $fetch('/api/email/sync', {
          method: 'POST',
          body: { accountId: targetId }
        });
        await fetchFolders(targetId, true);
      } else {
        await Promise.all(accounts.value.map(async (acc) => {
          if (acc.hasPassword) {
            await $fetch('/api/email/sync', {
              method: 'POST',
              body: { accountId: acc.id }
            }).catch(() => {});
            await fetchFolders(acc.id, true).catch(() => {});
          }
        }));
      }
      lastSyncTimestamp.value = Date.now();
    } catch (e) {
      console.error('Failed to sync account:', e);
    } finally {
      isSyncing.value = false;
    }
  };

  const startAutoSyncTimer = () => {
    if (!import.meta.client) return;
    if (syncTimer) clearInterval(syncTimer);

    if (syncInterval.value > 0) {
      syncTimer = setInterval(() => {
        if (!isSyncing.value && accounts.value.length > 0) {
          syncAccount();
        }
      }, syncInterval.value);
    }
  };

  watch(syncInterval, () => {
    startAutoSyncTimer();
  });

  const initGlobalPush = () => {
    if (!import.meta.client) return;
    startAutoSyncTimer();
  };

  const decrementUnseen = (accountId?: string | null, folderPath?: string | null, delta: number = 1) => {
    if (!accountId) return;
    const path = folderPath || 'INBOX';
    const accFolders = folders.value[accountId];
    if (accFolders && Array.isArray(accFolders)) {
      const folder = accFolders.find((f: any) =>
        f.path === path || f.name === path || (path === 'INBOX' && (f.name === 'Inbox' || f.path === 'INBOX'))
      );
      if (folder && typeof folder.unseen === 'number') {
        folder.unseen = Math.max(0, folder.unseen - delta);
      }
    }
  };

  const incrementUnseen = (accountId?: string | null, folderPath?: string | null, delta: number = 1) => {
    if (!accountId) return;
    const path = folderPath || 'INBOX';
    const accFolders = folders.value[accountId];
    if (accFolders && Array.isArray(accFolders)) {
      const folder = accFolders.find((f: any) =>
        f.path === path || f.name === path || (path === 'INBOX' && (f.name === 'Inbox' || f.path === 'INBOX'))
      );
      if (folder) {
        folder.unseen = (folder.unseen || 0) + delta;
      }
    }
  };

  return {
    allAccounts,
    accounts,
    selectedAccountId,
    currentAccount,
    folders,
    isLoadingFolders,
    isSyncing,
    lastSyncTimestamp,
    isComposeOpen,
    totalUnreadCount,
    isPasswordModalOpen,
    accountNeedingPassword,
    clientMessagesCache,
    fetchAccounts,
    fetchFolders,
    createFolder,
    syncAccount,
    checkAccountPassword,
    initGlobalPush,
    updateIntervalSettings,
    decrementUnseen,
    incrementUnseen
  };
};
