import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from "@/store/auth";

const PlayerView = () => import("@/views/PlayerView.vue");
const AuthView = () => import("@/views/AuthView.vue");
const ProfileView = () => import("@/views/ProfileView.vue");
const HomeView = () => import("@/views/HomeView.vue");

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/auth",
      name: "auth",
      component: AuthView,
    },
    {
      path: "/home",
      name: "home",
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: "/player",
      name: "player",
      component: PlayerView,
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: "/",
      redirect: { name: "home" },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "auth" },
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchProfile();
    } catch (error) {
      console.warn(error);
    }
  }
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated || authStore.requiresInvite || authStore.banned) {
      return { name: "auth" };
    }
  }
  if (to.name === "auth" && authStore.isAuthenticated && !authStore.requiresInvite && !authStore.banned) {
    return { name: "home" };
  }
  return true;
});

export default router;
