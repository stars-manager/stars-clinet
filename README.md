# GitHub Star Manager

一个用于管理 GitHub Star（收藏）的 Web 应用。

## 功能

- [x] 📥 从 GitHub 拉取并展示 Star 列表
- [x] 🔍 本地快捷搜索
- [ ] ✨ AI 快捷搜索
- [x] 🏷️ 自定义标签分类管理
- [ ] 🤖 AI 辅助自动添加标签
- [x] 🔐 GitHub Token 认证，无需登录本地操作
- [x] 📦 GitHub 数据存储

## 技术栈

- **React 18** + **TypeScript**
- **Vite** - 构建工具
- **TDesign React** - UI 组件库
- **Zustand** - 状态管理
- **Octokit** - GitHub API 客户端

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 使用说明

首次使用需要在设置中配置 GitHub Personal Access Token 以访问 GitHub API。
