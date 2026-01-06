# Joyful Dawn

Tauri + Vue 3 + TypeScript 音乐播放器，前端通过 Vite + Pinia + Tailwind 构建，桌面端由 Tauri 承载。所有音乐数据均通过既有的 Java API 获取，可在 Web / Windows / macOS 端共享同一套交互与主题体验。

## ✨ 功能亮点

- API 驱动：封装 `fetchMusicList` 与 `fetchMusicDetail`，支持关键字、类型、随机等查询参数，所有请求统一走 Axios 拦截器，可配置代理、 Token、超时与重试次数。
- 播放体验：内置单曲循环 / 列表循环 / 随机播放，上一首 / 下一首 / 进度拖拽 / 音量调节，状态自动持久化到 `localStorage` 并在启动时恢复。
- 歌词联动：解析 LRC 时间戳并与 `<audio>` 进度实时同步，高亮当前行，滚动到视窗中心，没有歌词时展示占位。
- UI/UX：响应式布局、桌面窗口拖拽区域、播放列表抽屉（双击即播）、搜索工具栏、播放控制条、Now Playing 卡片等。
- 主题切换：亮色 / 暗色 / 跟随系统三种模式，CSS 变量与 Tailwind `dark` 模式同步，偏好同样持久化。
- 错误与空态：接口异常、音频加载失败均会浮现提示，并提供重试入口。

## 🧱 目录结构

```
joyful
├── src
│   ├── api/          # API 封装
│   ├── components/   # 播放器 UI 组件
│   ├── composables/  # 播放器 / 主题逻辑
│   ├── router/       # Vue Router 配置
│   ├── store/        # Pinia 状态
│   ├── types/        # 复用类型定义
│   └── views/        # PlayerView 页面
├── src-tauri/        # Tauri (Rust Shell) 配置
├── .env.example      # API 与网络配置示例
└── tailwind.config.js
```

## ⚙️ 环境要求

- Node.js 18+（推荐 20），npm 8+。
- Rust toolchain（含 `cargo`），用于构建 Tauri 桌面端。
- iOS / Android 目标需额外安装各平台 SDK（可按 Tauri 文档执行 `npm run tauri android init`、`npm run tauri ios init`）。

## 🚀 快速开始

1. 安装依赖

   ```bash
   npm install
   ```

2. 配置环境变量并根据实际 API / 反代修改

   ```bash
   # 开发环境 (.env.development)
   # VITE_PROXY_TARGET=http://localhost:8891
   # VITE_HTTP_TIMEOUT=20000
   # VITE_HTTP_RETRY=1

   # 生产环境 (.env.production)
   # VITE_PROXY_TARGET=https://api.example.com
   ```

3. 开发模式

   - Web 预览：`npm run dev`
   - 桌面端（Tauri）：`npm run tauri dev`

4. 生产构建

   ```bash
   npm run build          # 仅构建前端
   npm run tauri build    # 打包桌面应用
   ```

## 🌐 API & 反代配置

| 功能          | 路径 | 主要参数                                                                                                      |
| ------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| 获取列表      | `/api/v1/music/getMusicList` | `pageNum`, `pageSize`, `orderByColumn`, `isAsc`, `keyword`, `type (RECOMMEND/ALL/SONG/SINGER/ALBUM/PLAYLIST)`, `random` |
| 获取歌曲详情  | `/api/v1/music/getMusicDetail` | `musicId`                                                                                                         |

- 所有前端请求统一使用相对前缀 `/prod`（Axios `baseURL=/prod`），必须经过反向代理再转到真实 API。例如本地调试请求路径为 `http://localhost:1420/prod/api/v1/music/homeSong`，由 Vite devServer 将 `/prod` 代理到 `VITE_PROXY_TARGET`（默认 `http://localhost:8891`）。
- 生产部署需在网关 / Nginx 等反代中配置同样的前缀转发：`/prod/(.*)` → `VITE_PROXY_TARGET/$1`，并保留跨域头或同域部署。
- Axios 请求统一注入 Token（预留在 `localStorage.JOYFUL_AUTH_TOKEN`），并支持可配置超时与重试，便于服务端限流或 5xx 处理。

## 🎧 播放 & 状态

- `<audio>` 播放内核封装在 `usePlayer` 中，全局单例负责 `play/pause/seek/volume/mode`，并在 `PlaybackControls`、页面等组件中共享。
- Pinia `playerStore` 保存播放队列、当前索引、模式、进度、音量等，并持久化到 `localStorage`，实现桌面 / Web 重启后继续播放。
- 歌词解析位于 `utils/lrc.ts`，支持多时间戳、毫秒精度，`LyricsPanel` 自动滚动高亮。
- `uiStore` 负责主题与播放列表抽屉，`useTheme` 会监听系统主题变更并动态切换 Tailwind `dark` 类。

## 🧪 验证

- 默认 `npm run build` 仅运行 `vite build`（已跳过类型检查以避免严格 TS 阻塞打包）；如需检查类型可单独执行 `npm run type-check`。
- 可根据需要新增 Vitest 单测，例如歌词解析 / 播放模式切换（在 `tests/` 中补充）。

## 📝 其它说明

- 部署时务必保证 `/prod` 前缀的反代存在（Web 网关或 Tauri 所在网络环境），对应上游地址由 `VITE_PROXY_TARGET` 控制。
- 所有网络错误、音频错误都会在 UI 中展示，并提供重新加载按钮。
- 主题切换组件位于 `src/components/ui/ThemeToggle.vue`，可扩展更多方案（如跟随系统 + 指定配色方案）。
