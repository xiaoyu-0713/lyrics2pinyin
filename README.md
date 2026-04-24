# 中文歌词多音字处理系统 (Lyrics Polyphone Processing System)

这是一个基于 React (Vite) + Node.js (Express) 的中文歌词多音字检测与替换系统。它可以帮助用户检测歌词中的多音字，提供基于上下文的正确读音，并支持将多音字替换为同音的非多音字。

## 项目结构

- `frontend/`: 前端 React 项目，使用 Vite 构建，UI 框架使用 Ant Design。
- `backend/`: 后端 Node.js 项目，使用 Express 和 TypeScript，核心多音字识别基于 `pinyin-pro`。

## 本地运行指南

要让其他人（或你自己）在本地正常运行这个项目，请按照以下步骤操作：

### 环境要求

- [Node.js](https://nodejs.org/) (推荐 v16 或以上版本)
- npm (Node.js 自带) 或 yarn

### 1. 克隆项目

首先将代码克隆到本地，并进入项目根目录：

```bash
git clone https://github.com/xiaoyu-0713/lyrics2pinyin.git
cd lyrics2pinyin
```

### 2. 启动后端服务

后端负责多音字的解析、同音字推荐和文件处理。打开一个终端窗口，执行以下命令：

```bash
cd backend

# 安装后端依赖
npm install

# 启动后端开发服务器 (默认运行在 http://localhost:3001)
npm run dev
```
*(注意：后端使用了 nodemon，代码修改后会自动重启)*

### 3. 启动前端服务

打开**另一个新的终端窗口**，执行以下命令：

```bash
# 确保你在项目的根目录下，如果不在，请先 cd 回根目录
cd frontend

# 安装前端依赖
npm install

# 启动前端开发服务器 (默认运行在 http://localhost:5173)
npm run dev
```

### 4. 访问系统

前端启动成功后，终端会显示一个本地访问地址。
在浏览器中打开：`http://localhost:5173/` 即可使用本系统。

## 核心功能说明

1. **单个运行**：输入单段文本，检测并高亮多音字，展示多音字统计及替换配置。
2. **批量运行**：支持上传 TXT/CSV/Excel 文件，批量处理多条歌词数据，并支持导出结果。
3. **多音字库配置**：支持全局配置替换字典，可以强制指定某些多音字的替换字，或者配置忽略特定的多音字。
