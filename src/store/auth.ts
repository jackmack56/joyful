import { defineStore } from "pinia";
import type { ForgetPayload, LoginPayload, RegisterPayload, VerifyCodePayload } from "@/api/auth";
import { login as loginRequest, logout as logoutRequest, register as registerRequest, requestVerifyCode, resetPassword } from "@/api/auth";
import { getUserInfo, submitInviteCode, updateUserInfo } from "@/api/user";
import type { UserBasicDetailDTO } from "@/api/user";
import type { UserProfile } from "@/types/user";
import { SIGNATURE_STORAGE_KEY, TOKEN_STORAGE_KEY } from "@/constants/storage";
import { useNotificationStore } from "@/store/notifications";
import { usePlayerStore } from "@/store/player";
import { usePlayer } from "@/composables/usePlayer";

interface AuthState {
  token: string | null;
  signatureKey: string | null;
  loading: boolean;
  error: string | null;
  message: string | null;
  user: UserProfile | null;
  requiresInvite: boolean;
  inviteLoading: boolean;
  banned: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    token: typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
    signatureKey: typeof window !== "undefined" ? localStorage.getItem(SIGNATURE_STORAGE_KEY) : null,
    loading: false,
    error: null,
    message: null,
    user: null,
    requiresInvite: false,
    inviteLoading: false,
    banned: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    setToken(token: string | null): void {
      this.token = token;
      if (typeof window === "undefined") return;
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    },
    setSignatureKey(key: string | null): void {
      this.signatureKey = key;
      if (typeof window === "undefined") return;
      if (key) {
        localStorage.setItem(SIGNATURE_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(SIGNATURE_STORAGE_KEY);
      }
    },
    setMessage(text: string | null): void {
      this.message = text;
    },
    resetError(): void {
      this.error = null;
      this.banned = false;
    },
    async fetchProfile(): Promise<void> {
      if (!this.token) return;
      try {
        const profile = await getUserInfo();
        this.user = profile;
        const status = Number(profile.joyfulStatus ?? 0);
        switch (status) {
          case 2:
            this.requiresInvite = false;
            this.banned = false;
            break;
          case 1:
            this.requiresInvite = true;
            this.setMessage("账号待激活，请输入邀请码");
            this.banned = false;
            break;
          case 0:
            this.requiresInvite = true;
            this.error = "账号已被封禁";
            this.banned = true;
            break;
          default:
            this.requiresInvite = true;
            this.setMessage("请完成激活流程");
            this.banned = false;
            break;
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : "获取用户信息失败";
        this.requiresInvite = false;
      }
    },
    async login(payload: LoginPayload): Promise<void> {
      this.loading = true;
      this.resetError();
      try {
        const data = await loginRequest(payload);
        const token = data.token ?? "";
        const signKey = (data as { sign?: string }).sign ?? null;
        if (!token) throw new Error("未返回登录凭证");
        this.setToken(token);
        this.setSignatureKey(signKey);
        await this.fetchProfile();
        if (!this.requiresInvite) {
          this.setMessage("登录成功");
        } else if (this.error === "账号已被封禁") {
          throw new Error(this.error);
        } else {
          this.setMessage("请输入邀请码以激活账号");
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : "登录失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async register(payload: RegisterPayload): Promise<void> {
      this.loading = true;
      this.resetError();
      try {
        await registerRequest(payload);
        this.setMessage("注册成功，请登录");
      } catch (error) {
        this.error = error instanceof Error ? error.message : "注册失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async resetPassword(payload: ForgetPayload): Promise<void> {
      this.loading = true;
      this.resetError();
      try {
        await resetPassword(payload);
        this.setMessage("重置成功，请使用新密码登录");
      } catch (error) {
        this.error = error instanceof Error ? error.message : "重置密码失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async sendVerifyCode(payload: VerifyCodePayload): Promise<void> {
      this.resetError();
      await requestVerifyCode(payload);
      this.setMessage("验证码已发送");
    },
    async submitInvite(code: string): Promise<void> {
      if (this.banned) {
        this.error = "账号已被封禁，无法激活";
        return;
      }
      if (!code) {
        this.error = "邀请码不能为空";
        return;
      }
      this.inviteLoading = true;
      this.resetError();
      try {
        await submitInviteCode(code);
        await this.fetchProfile();
        if (!this.requiresInvite) {
          this.setMessage("邀请码验证成功");
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : "邀请码验证失败";
        throw error;
      } finally {
        this.inviteLoading = false;
      }
    },
    async updateProfile(payload: UserBasicDetailDTO): Promise<void> {
      if (!this.isAuthenticated) {
        throw new Error("请登录后再修改资料");
      }
      const notificationStore = useNotificationStore();
      this.loading = true;
      try {
        await updateUserInfo(payload);
        if (this.user) {
          this.user = {
            ...this.user,
            ...payload,
          };
        } else {
          await this.fetchProfile();
        }
        notificationStore.push("个人资料已更新", { type: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "更新用户信息失败";
        this.error = message;
        notificationStore.push(message, { type: "error" });
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async logout(): Promise<void> {
      const playerStore = usePlayerStore();
      const player = usePlayer();
      await logoutRequest();
      player.stop();
      playerStore.resetPlayerState();
      this.setToken(null);
      this.setSignatureKey(null);
      this.user = null;
      this.requiresInvite = false;
      this.banned = false;
      this.message = null;
      this.error = null;
    },
  },
});
