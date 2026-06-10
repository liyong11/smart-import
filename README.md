# 万能导入 V2 - 智能多格式批量下单系统

## 技术栈
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS 4
- Neon PostgreSQL
- 阿里云通义千问 (Qwen) API
- @tanstack/react-virtual (虚拟列表)

## 部署

### 环境变量
在 Vercel 项目设置中配置以下环境变量：

```
DASHSCOPE_API_KEY=sk-your-api-key
DATABASE_URL=postgresql://user:pass@host/dbname
```

### 部署步骤
1. Push 代码到 GitHub
2. 在 Vercel 中 Import 该仓库
3. 配置环境变量
4. 部署完成

## 本地开发

```bash
npm install
npm run dev
```

## 功能模块
- 文件导入：支持 Excel/Word/PDF 拖拽上传
- AI规则生成：大模型自动分析文件结构生成解析规则
- 规则管理：创建、编辑、删除、复制解析规则
- 数据预览：类Excel表格，支持内联编辑、实时校验
- 运单列表：查看已提交的历史运单，支持搜索分页

## 大模型说明
- 模型：阿里云通义千问 qwen-plus
- 调用方式：OpenAI 兼容 API
- Prompt设计：系统提示词引导AI分析文件结构并输出JSON格式规则配置
- API Key 通过环境变量 DASHSCOPE_API_KEY 配置
