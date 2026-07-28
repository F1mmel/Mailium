export default defineNuxtRouteMiddleware(async (to, from) => {
  const isSetupPage = to.path === '/setup';

  try {
    const res: any = await $fetch('/api/setup');
    const configured = res?.configured;

    if (!configured && !isSetupPage) {
      return navigateTo('/setup');
    }

    if (configured && isSetupPage) {
      return navigateTo('/');
    }
  } catch (error) {
    console.error('Failed to check setup status', error);
  }
});
