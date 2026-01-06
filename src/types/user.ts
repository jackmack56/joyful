export interface UserProfile {
  id: string;
  name: string;
  email: string;
  status: number;
  password?: string | null;
  avatarUrl?: string | null;
  motto?: string | null;
  createTime?: number | null;
  lastTime?: number | null;
  ipAddress?: string | null;
  vipLevel?: string | null;
  language?: string | null;
  joyfulStatus?: number | null;
  twoSecret?: string | null;
  googleId?: string | null;
  wechatId?: string | null;
  qqId?: string | null;
  phone?: string | null;
  linuxDo?: string | null;
}
