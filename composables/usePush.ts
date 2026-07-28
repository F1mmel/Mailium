import { ref } from 'vue';

const isSupported = ref(false);
const isSubscribed = ref(false);
const permission = ref<NotificationPermission>('default');

export const usePush = () => {
  const checkSupport = () => {
    if (import.meta.server) return false;
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if ('Notification' in window) {
      permission.value = Notification.permission;
    }
    return isSupported.value;
  };

  const registerServiceWorker = async () => {
    if (!checkSupport()) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (e) {
      console.error('Service worker registration failed:', e);
      return null;
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!checkSupport()) return false;

    const perm = await Notification.requestPermission();
    permission.value = perm;
    if (perm !== 'granted') {
      return false;
    }

    const reg = await registerServiceWorker();
    if (!reg) return false;

    try {
      const res: any = await $fetch('/api/push/key');
      const publicKey = res.publicKey;
      const convertedKey = urlBase64ToUint8Array(publicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: subscription
      });

      isSubscribed.value = true;
      return true;
    } catch (e) {
      console.error('Failed to subscribe to push:', e);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    checkSupport,
    registerServiceWorker,
    subscribeToPush
  };
};
