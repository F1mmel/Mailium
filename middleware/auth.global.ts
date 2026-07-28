export default defineNuxtRouteMiddleware(async (to, from) => {
  const publicRoutes = ['/login', '/setup'];
  if (publicRoutes.includes(to.path)) {
    return;
  }

  const { isLoggedIn, checkAuthStatus } = useAuth();
  
  if (!isLoggedIn.value) {
    const headers = useRequestHeaders(['cookie']);
    await checkAuthStatus(headers);
  }

  if (!isLoggedIn.value) {
    return navigateTo('/login');
  }
});
