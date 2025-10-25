# 📄 Resume Agent｜AI 简历生成系统

**Version:** v1.0 (Public Frontend + Cloudflare Worker API)  
**Author:** Zheng Sijie (Stella)

---

## 🧭 项目简介  

**Resume Agent** 是一个基于 AI 的简历生成工具。  
用户只需输入姓名、学校、专业、岗位等基础信息，  
系统即可生成一份完整的、符合岗位特征的中文简历。  

该项目采用前后端分离架构：  

| 模块 | 平台 | 功能 |
|------|------|------|
| 前端 (Frontend) | **Vercel** | 负责用户输入、简历渲染与导出 |
| 后端 (Backend) | **Cloudflare Worker** | 调用 OpenAI / OpenRouter 接口，生成简历文本 |

---

## ⚙️ 部署结构  

```
ResumeAgent_Deployable/
├── index.html
├── script.js
├── config.js
├── /styles/
├── /public/
└── vercel.json
```

后端部署在：  
`https://resume-api.sijiesijiezheng.workers.dev`

---

## 🚀 使用方法  

### 1️⃣ 填写信息  
- 姓名  
- 学校  
- 专业  
- 申请岗位  
- 技能关键词（可选）  
- 补充说明（可选）  

### 2️⃣ 生成简历  
点击 **“生成完整简历”** 按钮，系统会自动调用后端 API。  

### 3️⃣ 导出文件  
可导出为 **PDF** 或 **Word** 文件。  

---

## 🔐 后端说明  

本项目前端使用 `config.js` 指定后端接口地址：  

```js
const API_URL = "https://resume-api.sijiesijiezheng.workers.dev";
```

Cloudflare Worker 内部自动检测 Key 类型（支持 OpenAI / OpenRouter），  
无需暴露 Key 到前端。  

---

## 🧩 开发者说明  

| 环境变量 | 示例值 | 说明 |
|-----------|---------|------|
| `OPENAI_API_KEY` | sk-xxxxx | OpenAI API Key |
| `OPENROUTER_API_KEY` | sk-or-xxxxx | OpenRouter API Key |

---

## 🌐 前端部署 (Vercel)  

1️⃣ 创建 GitHub 仓库并上传项目文件。  
2️⃣ 打开 [Vercel](https://vercel.com/new) → 导入仓库。  
3️⃣ 部署后访问生成的域名。  

---

## ☁️ 后端部署 (Cloudflare Worker)  

1️⃣ 新建 Worker 并上传 `worker.js`  
2️⃣ 设置环境变量：  
   - `OPENAI_API_KEY` 或 `OPENROUTER_API_KEY`  
3️⃣ 部署后测试接口。  

---

## 🧠 技术栈  

- **Frontend:** HTML / CSS / JavaScript  
- **Backend:** Cloudflare Worker (Node fetch API)  
- **AI Provider:** OpenAI / OpenRouter  
- **Deploy:** Vercel + Cloudflare  

---

## 💬 联系与版权  

**Author:** Zheng Sijie (Stella)  
**Contact:** sijiesijiezheng@gmail.com  
**Copyright © 2025 Resume Agent Project**  
禁止未经授权的商用转载。
