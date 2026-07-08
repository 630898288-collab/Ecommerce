# 电商商品信息提取插件 - 详细设计文档

## 1. 项目概述

### 1.1 项目背景
本项目是一个 Chrome 浏览器扩展插件，用于提取天猫和京东商品详情页的关键信息，支持 AI 分析和多格式导出，帮助用户进行竞品分析和商品研究。

### 1.2 目标用户
- 电商运营人员
- 产品经理
- 市场调研人员
- 需要进行竞品分析的商家

### 1.3 核心价值
- 自动化提取商品信息，节省手动记录时间
- AI 驱动的深度分析，提供专业的营销策略建议
- 项目管理功能，支持多商品对比分析
- 多格式导出，方便后续处理和报告撰写

---

## 2. 功能需求

### 2.1 信息提取功能
| 分类 | 子项 | 描述 | 状态 |
|------|------|------|------|
| **产品基础信息** | 产品标题 | 商品完整标题 | ✅ |
| | 产品品类 | 商品所属类目层级 | ✅ |
| | 产品所属品牌 | 品牌名称 | ✅ |
| | 到手价格 | 页面显示的最终价格 | ✅ |
| | 销量 | 商品销量数据 | ✅ |
| **产品参数** | 参数信息 | 页面参数区域的所有参数 | ✅ |
| **产品主图** | 主图地址 | 商品主图图片URL（不含视频） | ✅ |
| **产品详情图** | 详情图地址 | 详情页区域的所有图片URL | ✅ |

### 2.2 AI 分析功能
- 一键发送提取的商品信息给 AI 大模型
- AI 按照预设模板生成结构化分析报告
- 支持配置多种大模型（DeepSeek、千问、豆包、ChatGPT）

### 2.3 导出功能
- 导出基础信息为 Excel 格式
- 导出 AI 分析报告为 Markdown 格式

### 2.4 项目分析功能
- 创建/管理本地项目
- 添加商品链接到项目
- 标识商品类型（我的产品/竞品）
- 一键导出项目中所有商品的基础信息

### 2.5 后台设置功能
- 配置大模型 API（provider、apiKey、endpoint、model）
- 预设各模型的默认端点

---

## 3. 架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome 浏览器                              │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │  天猫详情页    │    │  京东详情页    │    │  其他页面      │   │
│  │  content.js   │    │  content.js   │    │  (无注入)     │   │
│  │  TmallParser  │    │  JDParser     │    │               │   │
│  └───────┬───────┘    └───────┬───────┘    └───────────────┘   │
│          │                    │                                 │
│          └────────┬───────────┘                                 │
│                   ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              background service worker                   │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │
│  │  │ ApiClient │  │ Storage   │  │ Export    │           │   │
│  │  │ (AI调用)  │  │ (项目管理)│  │ (Excel/MD)│           │   │
│  │  └───────────┘  └───────────┘  └───────────┘           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                   ▲                                             │
│                   │                                             │
│  ┌────────────────┴─────────────────────────────────────────┐  │
│  │                    Sidebar UI (React)                     │  │
│  │  ┌───────────────────────────────────────────────────┐   │  │
│  │  │ [提取信息] [AI分析] [导出] [项目分析] [设置]         │   │  │
│  │  ├───────────────────────────────────────────────────┤   │  │
│  │  │ 📋 基础信息 │ 📊 参数 │ 🖼️ 图片 │ 🤖 AI报告 │      │   │  │
│  │  │ (可折叠区域)                                      │   │  │
│  │  └───────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 模块职责

| 模块 | 职责 | 文件位置 |
|------|------|----------|
| **content script** | 页面注入，DOM 操作，调用解析器 | `src/content/` |
| **parser** | 解析页面信息，提取商品数据 | `src/parser/` |
| **background** | 后台服务，API 调用，存储管理，导出 | `src/background/` |
| **popup** | 侧栏 UI，用户交互 | `src/popup/` |
| **shared** | 共享类型定义，工具函数 | `src/shared/` |

### 3.3 通信机制

| 通信方 | 方式 | 用途 |
|--------|------|------|
| popup → content | `chrome.tabs.sendMessage` | 触发页面信息提取 |
| content → background | `chrome.runtime.sendMessage` | 发送提取的数据 |
| popup → background | `chrome.runtime.sendMessage` | 请求存储数据、调用 AI、导出文件 |
| background → popup | `chrome.runtime.sendMessage` | 返回存储数据、AI 结果、导出状态 |

---

## 4. 数据结构

### 4.1 ProductInfo（商品信息）

```typescript
interface ProductInfo {
  platform: 'tmall' | 'jd';
  url: string;
  title: string;
  category: string;
  brand: string;
  price: string;
  saleCount: string;
  shopName: string;
  model: string;
  params: Record<string, string>;
  mainImages: string[];
  detailImages: string[];
  extractedAt: string;
}
```

### 4.2 Project（项目）

```typescript
interface Project {
  id: string;
  name: string;
  products: ProjectProduct[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectProduct {
  id: string;
  productInfo: ProductInfo;
  type: 'mine' | 'competitor';
  addedAt: string;
}
```

### 4.3 AIConfig（AI 配置）

```typescript
interface AIConfig {
  provider: 'deepseek' | 'qianwen' | 'doubao' | 'chatgpt';
  apiKey: string;
  model: string;
  endpoint: string;
}

interface AIProviderConfig {
  name: string;
  defaultEndpoint: string;
  defaultModel: string;
}
```

### 4.4 AIResult（AI 分析结果）

```typescript
interface AIResult {
  report: string;
  productTitle: string;
  brandName: string;
  categoryHint: string;
  saleCount: string;
  fileName: string;
  generatedAt: string;
}
```

---

## 5. 页面适配策略

### 5.1 天猫解析器 (TmallParser)

| 字段 | 选择器/策略 | 备用选择器 |
|------|-------------|------------|
| 标题 | `#J_DetailMeta h1.title` | `.tb-detail-hd h1` |
| 价格 | `.tm-price` | `.price-content .tm-price` |
| 销量 | `.tm-count` | `.sale-num` |
| 品牌 | `.tm-brand-name` | `.brand-name` |
| 类目 | `.crumb a:last-child` | `.category-nav a:last-child` |
| 店铺 | `.tb-shop-name a` | `.shop-name a` |
| 参数 | `.attributes-list li` | `table.attributes tr` |
| 主图 | `.tb-thumb-item img` | `.J_ItemImg img` |
| 详情图 | `.detail-content img` | `.desc-content img` |

### 5.2 京东解析器 (JDParser)

| 字段 | 选择器/策略 | 备用选择器 |
|------|-------------|------------|
| 标题 | `.sku-name` | `h1.sku-name` |
| 价格 | `.price J_price` | `.p-price` |
| 销量 | `.J_commentCount` | `.comment-count` |
| 品牌 | `.J_brandName` | `.brand-name` |
| 类目 | `.breadcrumb a:last-child` | `.category a:last-child` |
| 店铺 | `.J_imName` | `.shop-name` |
| 参数 | `.parameter2 .p-parameter-list li` | `.attributes-list li` |
| 主图 | `.J_ItemImg img` | `.spec-items img` |
| 详情图 | `.desc-lazyload-container img` | `.desc-content img` |

### 5.3 图片地址处理

- 提取图片的原始 `src` 属性
- 处理懒加载图片（`data-src`、`data-lazy-src` 等）
- 预留图片地址转译接口，支持后续配置转译规则

---

## 6. AI 分析功能设计

### 6.1 AI 模板

基于用户提供的模板，AI 分析报告包含以下章节：

1. **基本信息** - 商品标题、品牌、型号、店铺、类目、价格、销量、核心参数、链接、采集时间
2. **页面文字分析** - 促销利益点、评价亮点、用户证言、问答模块、推荐商品流、营销广告
3. **视觉分析** - 主图风格、详情页结构、配色与视觉重点、主图作用、详情图作用
4. **核心卖点提炼** - 5个核心卖点及证据
5. **文案表达结构** - 促销吸引+信任背书+场景种草+技术拆解
6. **文案风格说明** - 促销驱动 + 信任驱动 + 场景化
7. **核心定位** - 商品核心定位描述
8. **目标人群推导** - 4类目标人群
9. **痛点洞察** - 显性痛点、隐性顾虑
10. **核心使用场景** - 5个核心场景
11. **卖点内容比例** - 各类型内容占比
12. **前3屏核心表达** - 每屏的核心信息与目的
13. **精品表达提炼** - 功能转体验、设计协同、可复用句式
14. **精品信任状** - 权威认证、销量与榜单、用户口碑、技术专利、售后保障
15. **消费者体验分析** - 打动点、犹豫点
16. **综合结论** - 整体评价
17. **可借鉴点** - 可复制表达、视觉、信任
18. **风险提示** - 绝对化用语、信息缺失、广告干扰、竞品对比

### 6.2 Prompt 设计

```
你是一个专业的电商商品分析专家。请根据以下商品信息，按照指定模板生成一份详细的分析报告。

商品信息：
{productInfo}

请严格按照以下模板格式输出，不要添加任何额外内容：
{template}

输出要求：
1. 所有字段必须基于提供的商品信息填充
2. 如果某字段信息缺失，标注为"未提取"
3. 分析要客观、专业、有数据支撑
4. 格式必须为 Markdown
```

### 6.3 API 端点预设

| Provider | Default Endpoint | Default Model |
|----------|------------------|---------------|
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| 千问 | `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation` | `qwen-turbo` |
| 豆包 | `https://api.doubao.com/v1/chat/completions` | `doubao-pro` |
| ChatGPT | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |

---

## 7. 导出功能设计

### 7.1 Excel 导出（基础信息）

| 列名 | 数据源 |
|------|--------|
| 平台 | productInfo.platform |
| 商品标题 | productInfo.title |
| 品牌 | productInfo.brand |
| 型号 | productInfo.model |
| 类目 | productInfo.category |
| 店铺 | productInfo.shopName |
| 价格 | productInfo.price |
| 销量 | productInfo.saleCount |
| 商品链接 | productInfo.url |
| 采集时间 | productInfo.extractedAt |

### 7.2 Markdown 导出（AI 报告）

- 直接导出 AI 返回的 Markdown 内容
- 文件名格式：`{品牌}_{商品标题}_{日期}.md`
- 支持包含元数据注释

---

## 8. UI 设计

### 8.1 侧栏布局

采用混合式侧栏设计：

```
┌─────────────────────────────────┐
│  🛒 商品信息提取器              │
├─────────────────────────────────┤
│  [提取信息] [AI分析] [导出]     │
│  [项目分析] [设置]              │
├─────────────────────────────────┤
│  ▶ 📋 基础信息                 │
│  ├─ 标题：xxx                  │
│  ├─ 品牌：xxx ✅               │
│  ├─ 价格：xxx ✅               │
│  ├─ 销量：未提取 ❌            │
│  └─ 链接：xxx                  │
├─────────────────────────────────┤
│  ▶ 📊 参数信息                 │
│  ├─ 参数1：xxx                 │
│  ├─ 参数2：xxx                 │
│  └─ (共N项)                    │
├─────────────────────────────────┤
│  ▶ 🖼️ 图片地址                 │
│  ├─ 主图：[img1] [img2] ...    │
│  ├─ 详情图：[img1] [img2] ...  │
│  └─ [复制全部]                 │
├─────────────────────────────────┤
│  ▶ 🤖 AI分析报告               │
│  ├─ (报告预览)                 │
│  └─ [导出报告]                 │
└─────────────────────────────────┘
```

### 8.2 颜色规范

| 用途 | 颜色 |
|------|------|
| 成功状态 | #22c55e (Green) |
| 失败状态 | #ef4444 (Red) |
| 主色调 | #3b82f6 (Blue) |
| 背景色 | #ffffff (White) |
| 边框色 | #e5e7eb (Gray-200) |
| 文字色 | #1f2937 (Gray-800) |

### 8.3 图标规范

| 图标 | 用途 |
|------|------|
| 📋 | 基础信息 |
| 📊 | 参数信息 |
| 🖼️ | 图片地址 |
| 🤖 | AI 分析 |
| 📁 | 项目分析 |
| ⚙️ | 设置 |
| ✅ | 提取成功 |
| ❌ | 提取失败 |

---

## 9. 错误处理

### 9.1 错误类型

| 错误类型 | 处理方式 | UI 表现 |
|----------|----------|---------|
| 页面不支持 | 显示提示信息 | "当前页面不支持信息提取" |
| 提取失败 | 显示 ❌ 标记 | "未提取" |
| AI 调用失败 | 显示错误提示 | "AI 分析失败：{error}" |
| API Key 未配置 | 提示配置 | "请先配置 AI API" |
| 存储失败 | 提示检查权限 | "存储失败，请检查浏览器权限" |
| 网络错误 | 重试机制 | "网络错误，请重试" |

### 9.2 重试机制

- AI 调用失败时，允许用户手动重试
- 网络超时设置为 30 秒
- 最多重试 3 次

---

## 10. 安全设计

### 10.1 API Key 存储

- 使用 Chrome storage.local 存储
- 明文存储（用户已确认）
- 仅在扩展内部使用，不对外暴露

### 10.2 权限控制

| 权限 | 用途 |
|------|------|
| `activeTab` | 访问当前标签页 |
| `storage` | 存储项目和配置数据 |
| `scripting` | 注入 content script |
| `tabs` | 管理标签页 |
| `https://*.tmall.com/*` | 访问天猫页面 |
| `https://*.jd.com/*` | 访问京东页面 |

### 10.3 数据隐私

- 所有数据存储在用户本地浏览器
- 不收集用户个人信息
- AI 分析仅发送商品页面信息，不包含用户身份信息

---

## 11. 技术栈

| 模块 | 技术 |
|------|------|
| 前端 UI | React 18 + TypeScript |
| 样式 | TailwindCSS 3 |
| 构建工具 | Vite |
| 导出 Excel | xlsx 库 |
| 状态管理 | React Context |
| 浏览器扩展 | Manifest V3 |

---

## 12. 项目结构

```
src/
├── background/          # 后台服务
│   ├── service-worker.ts
│   ├── api-client.ts    # AI API 调用
│   ├── storage.ts       # 存储管理
│   └── export.ts        # 导出功能
├── content/             # 页面注入脚本
│   ├── content.ts       # 主入口
│   └── inject.ts        # DOM 注入
├── parser/              # 页面解析器
│   ├── base.ts          # 基础解析器
│   ├── tmall.ts         # 天猫解析器
│   ├── jd.ts            # 京东解析器
│   └── index.ts         # 解析器工厂
├── popup/               # 侧栏 UI
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/      # 组件
│   │   ├── Header.tsx
│   │   ├── BasicInfo.tsx
│   │   ├── ParamsInfo.tsx
│   │   ├── ImageInfo.tsx
│   │   ├── AIReport.tsx
│   │   ├── ProjectPanel.tsx
│   │   └── SettingsPanel.tsx
│   └── context/         # 状态管理
│       └── AppContext.tsx
├── shared/              # 共享模块
│   ├── types.ts         # 类型定义
│   ├── constants.ts     # 常量
│   └── utils.ts         # 工具函数
├── assets/              # 静态资源
│   └── icon.png
└── manifest.json        # 扩展配置
```

---

## 13. 开发流程

### 13.1 开发环境

- Node.js >= 18
- npm >= 9
- Chrome 浏览器

### 13.2 构建命令

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（热更新）
npm run build        # 生产构建
npm run lint         # 代码检查
```

### 13.3 测试方法

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist` 目录

---

## 14. 版本计划

| 版本 | 功能 | 优先级 |
|------|------|--------|
| v1.0 | 基础信息提取（天猫+京东） | P0 |
| v1.1 | AI 分析功能 | P0 |
| v1.2 | 导出功能（Excel+MD） | P1 |
| v1.3 | 项目分析功能 | P1 |
| v1.4 | 后台设置功能 | P2 |
| v1.5 | 图片地址转译配置 | P2 |

---

## 15. 风险与注意事项

1. **页面结构变化**：电商平台可能会更新页面结构，导致解析器失效，需要定期维护
2. **反爬机制**：部分平台可能有反爬策略，需要注意请求频率
3. **CORS 限制**：AI API 调用需通过 background service worker 中转
4. **存储限制**：Chrome storage.local 有 5MB 限制，大量图片地址可能超出限制
5. **图片地址转译**：需用户提供具体转译规则后实现

---

## 附录

### A. AI 分析模板完整内容

见用户提供的模板文档。

### B. 浏览器兼容性

- ✅ Chrome 90+
- ✅ Edge 90+
- ⬜ Firefox（Manifest V3 支持有限）

### C. 平台支持

- ✅ 天猫详情页 (`*.tmall.com/item.htm*`)
- ✅ 京东详情页 (`*.jd.com/*.html`)
- ⬜ 预留扩展接口（拼多多、苏宁等）