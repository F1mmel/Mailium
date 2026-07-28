import { ref, computed } from 'vue';

const user = ref<any>(null);
const isLoading = ref<boolean>(false);
const isChecked = ref<boolean>(false);

export const useAuth = () => {
  const isLoggedIn = computed(() => !!user.value);

  const checkAuthStatus = async (headers?: any) => {
    try {
      isLoading.value = true;
      const res: any = await $fetch('/api/auth/status', { headers });
      if (res && res.authenticated) {
        user.value = res.user;
      } else {
        user.value = null;
      }
    } catch (e) {
      user.value = null;
    } finally {
      isLoading.value = false;
      isChecked.value = true;
    }
  };

  const login = async (credentials: { username?: string; email?: string; password: string }) => {
    try {
      isLoading.value = true;
      const res: any = await $fetch('/api/auth/login', {
        method: 'POST',
        body: credentials,
      });
      user.value = res.user;
      return res;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      user.value = null;
      navigateTo('/login');
    }
  };

  return {
    user,
    isLoggedIn,
    isLoading,
    isChecked,
    checkAuthStatus,
    login,
    logout,
  };
};
