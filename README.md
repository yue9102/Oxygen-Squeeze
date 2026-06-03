---
title: 氧气捏捏
emoji: 🫧
colorFrom: green
colorTo: gray
sdk: docker
app_port: 8000
pinned: false
---

# 氧气捏捏 🫧

把每天通勤听的 AI 播客，捏成属于你自己的认知框架。

贴一条播客链接，AI 提炼成可滑动的知识卡片，并自动归入「AI 认知 / 行业知识 / 产品思维 / 趋势与商业」四大类，随听随长成一座私人知识书架。

---

## 下载与安装

### 📱 安卓
到 [Releases](../../releases) 页，下载最新版的 `氧气捏捏-vX.X.apk`，在手机上打开安装（需在系统设置里允许「安装未知来源应用」）。

### 🍎 iPhone / iPad
用 Safari 打开已部署的网址 → 点底部「分享」→「添加到主屏幕」。之后从桌面图标进入，就是全屏 App 体验（PWA）。

> 两个平台都需要先部署后端（见下文），App 才能联网工作。

---

## 技术架构

```
React PWA  ──┐
             ├─►  FastAPI  ──►  DeepSeek API
Android APK ─┘   (同时托管 PWA 静态资源)
             (Capacitor)        本地 JSON 存储
```

- **前端**：React + Vite + Framer Motion，可装为 PWA，也用 Capacitor 打包成安卓 APK
- **后端**：FastAPI，抓取小宇宙 / Apple Podcasts 节目信息，调用 DeepSeek 提炼洞察
- **存储**：JSON 文件（个人工具，无需数据库）
- **一个部署搞定**：后端同时对外提供 `/api/*` 和可安装的 PWA

---

## 部署后端（免费）

1. 把仓库 push 到你的 GitHub
2. 登录 [render.com](https://render.com) → **New → Blueprint** → 连接此仓库（会自动读取 `render.yaml`）
3. 部署时在服务的 **Environment** 里填入 `DEEPSEEK_API_KEY`（从 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 获取）
4. 部署完成后得到一个网址，如 `https://oxygen-squeeze.onrender.com`
   - 这个网址直接就能在手机浏览器打开、添加到主屏幕（PWA）

### 让 APK 也连上后端
APK 是离线打包的，需要在打包时写入后端地址：

1. GitHub 仓库 → **Settings → Secrets and variables → Actions → Variables**
2. 新建变量 `VITE_API_BASE`，值填后端网址（如上面的 Render 地址）
3. 打一个新 tag（见下文），CI 会用这个地址重新构建 APK

---

## 发布新版本

```bash
git tag v1.0
git push origin v1.0
```

打 tag 后，GitHub Actions 会自动在云端构建 APK 并创建一个 Release，把 `.apk` 挂上去。

---

## 本地开发

```bash
# 后端
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "DEEPSEEK_API_KEY=你的key" > .env
uvicorn main:app --reload --port 8000

# 前端（另开一个终端）
cd frontend
npm install
npm run dev          # http://localhost:5173
```

---

## 说明

- Render 免费实例的磁盘是临时的，重新部署后 `data/` 会重置。要长期保存可挂持久磁盘或换数据库。
- APK 为 debug 包，安装时系统会提示来源未知，属正常。正式上架应用商店需各自的开发者账号与签名。
