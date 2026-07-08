import { AIConfig, AIProvider, AIResult, Message, MessageType, ProductInfo, Project, ProjectProduct } from '../shared/types';
import { AI_PROVIDERS, STORAGE_KEYS } from '../shared/constants';
import { generateId, sanitizeFilename } from '../shared/utils';

const AI_TEMPLATE = `<!-- report-meta {"productTitle":"{productTitle}","brandName":"{brandName}","categoryHint":"{categoryHint}","saleCount":"{saleCount}","fileName":""} -->

# 商品分析报告

## 基本信息
- **商品标题**：{productTitle}（实际页面标题：{title}）
- **品牌**：{brand}
- **商品型号**：{model}
- **店铺**：{shopName}
- **类目**：{category}
- **页面可见价格**：{price}
- **页面销量**：{saleCount}
- **核心参数**：
{paramsList}
- **商品链接**：\`{url}\`
- **采集时间**：{extractedAt}

## 页面文字分析
页面文案呈现明显的电商详情页结构化特征。文案主要包含：
- 促销利益点：未提取
- 评价亮点：未提取
- 用户证言：未提取
- 问答模块：未提取
- 推荐商品流：未提取
- 营销广告：未提取

## 视觉分析
整体视觉为电商详情页标准风格。

- **主图风格**：未提取
- **详情页结构**：未提取
- **配色与视觉重点**：未提取
- **主图作用**：吸引点击，展示产品外观
- **详情图作用**：深度说服，展示产品细节

## 核心卖点提炼
1. **未提取**：未提取
2. **未提取**：未提取
3. **未提取**：未提取
4. **未提取**：未提取
5. **未提取**：未提取

## 文案表达结构
页面文案采用标准电商详情页结构。

## 文案风格说明
未提取

## 核心定位
未提取

## 目标人群推导
1. **未提取**
2. **未提取**
3. **未提取**
4. **未提取**

## 痛点洞察
- **显性痛点**：未提取
- **隐性顾虑**：未提取

## 核心使用场景
1. **未提取**
2. **未提取**
3. **未提取**
4. **未提取**
5. **未提取**

## 卖点内容比例
- 功能卖点：未提取
- 场景描绘与情感共鸣：未提取
- 价格促销与赠品：未提取
- 评价/用户证言信任：未提取
- 设计外观与质感：未提取
- 品牌背书：未提取

## 前 3 屏核心表达
1. **第1屏**：未提取
2. **第2屏**：未提取
3. **第3屏**：未提取

## 精品表达提炼
- **功能转体验**：未提取
- **设计协同**：未提取
- **可复用句式**：未提取

## 精品信任状
- **权威认证**：未提取
- **销量与榜单**：未提取
- **用户口碑**：未提取
- **技术专利**：未提取
- **售后保障**：未提取

## 消费者体验分析
- **打动点**：未提取
- **犹豫点**：未提取

## 综合结论
未提取

## 可借鉴点
- **可复制表达**：未提取
- **可复制视觉**：未提取
- **可复制信任**：未提取

## 风险提示
- **绝对化用语风险**：未提取
- **信息缺失风险**：未提取
- **非相关广告干扰**：未提取
- **竞品对比含糊**：未提取

---

**可直接复用到我司产品的表达建议**：
未提取

<!-- auto-product-params -->
## 商品参数
{allParams}`;

async function getStorage<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

async function setStorage(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

async function callAI(productInfo: ProductInfo, config: AIConfig): Promise<AIResult> {
  const template = AI_TEMPLATE
    .replace(/{productTitle}/g, productInfo.title.substring(0, 30))
    .replace(/{brandName}/g, productInfo.brand)
    .replace(/{categoryHint}/g, productInfo.category)
    .replace(/{saleCount}/g, productInfo.saleCount || '未提取')
    .replace(/{title}/g, productInfo.title)
    .replace(/{brand}/g, productInfo.brand)
    .replace(/{model}/g, productInfo.model || '未提取')
    .replace(/{shopName}/g, productInfo.shopName || '未提取')
    .replace(/{category}/g, productInfo.category || '未提取')
    .replace(/{price}/g, productInfo.price || '未提取')
    .replace(/{url}/g, productInfo.url)
    .replace(/{extractedAt}/g, productInfo.extractedAt);

  const paramsList = Object.keys(productInfo.params).length > 0
    ? Object.entries(productInfo.params).slice(0, 10).map(([k, v]) => `  - ${k}：${v}`).join('\n')
    : '  - 未提取到参数';
  
  const allParams = Object.keys(productInfo.params).length > 0
    ? Object.entries(productInfo.params).map(([k, v]) => `- ${k}：${v}`).join('\n')
    : '- 未提取到参数';

  const filledTemplate = template
    .replace(/{paramsList}/g, paramsList)
    .replace(/{allParams}/g, allParams);

  const prompt = `你是一个专业的电商商品分析专家。请根据以下商品信息，按照指定模板生成一份详细的分析报告。

商品信息：
- 标题：${productInfo.title}
- 品牌：${productInfo.brand}
- 价格：${productInfo.price}
- 销量：${productInfo.saleCount}
- 类目：${productInfo.category}
- 店铺：${productInfo.shopName}
- 型号：${productInfo.model}
- 参数：${JSON.stringify(productInfo.params)}
- 主图数量：${productInfo.mainImages.length}
- 详情图数量：${productInfo.detailImages.length}

请严格按照以下模板格式输出，不要添加任何额外内容：
${filledTemplate}

输出要求：
1. 所有字段必须基于提供的商品信息填充
2. 如果某字段信息缺失，标注为"未提取"
3. 分析要客观、专业、有数据支撑
4. 格式必须为 Markdown
5. 保持模板的结构和顺序不变`;

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  let report = '';
  if (data.choices && data.choices[0] && data.choices[0].message) {
    report = data.choices[0].message.content;
  } else if (data.output && data.output.text) {
    report = data.output.text;
  } else if (data.result) {
    report = data.result;
  }

  return {
    report,
    productTitle: productInfo.title.substring(0, 30),
    brandName: productInfo.brand,
    categoryHint: productInfo.category,
    saleCount: productInfo.saleCount || '未提取',
    fileName: `${sanitizeFilename(productInfo.brand)}-${sanitizeFilename(productInfo.title.substring(0, 30))}-${new Date().toISOString().split('T')[0]}.md`,
    generatedAt: new Date().toISOString(),
  };
}

function exportExcel(products: ProductInfo[]): string {
  const headers = ['平台', '商品标题', '品牌', '型号', '类目', '店铺', '价格', '销量', '商品链接', '采集时间'];
  
  const rows = products.map((p) => [
    p.platform === 'tmall' ? '天猫' : '京东',
    p.title,
    p.brand,
    p.model,
    p.category,
    p.shopName,
    p.price,
    p.saleCount,
    p.url,
    p.extractedAt,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${(c as string).replace(/"/g, '""')}"`).join(','))].join('\n');
  
  return csvContent;
}

async function exportMD(report: string, fileName: string): Promise<string> {
  return report;
}

chrome.runtime.onMessage.addListener(async (message: Message, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'CALL_AI': {
        const { productInfo, config } = message.data as { productInfo: ProductInfo; config: AIConfig };
        const result = await callAI(productInfo, config);
        sendResponse({ success: true, data: result });
        break;
      }
      case 'GET_STORAGE': {
        const { key } = message.data as { key: string };
        const data = await getStorage(key);
        sendResponse({ success: true, data });
        break;
      }
      case 'SET_STORAGE': {
        const { key, value } = message.data as { key: string; value: unknown };
        await setStorage(key, value);
        sendResponse({ success: true });
        break;
      }
      case 'EXPORT_EXCEL': {
        const { products } = message.data as { products: ProductInfo[] };
        const csv = exportExcel(products);
        sendResponse({ success: true, data: csv });
        break;
      }
      case 'EXPORT_MD': {
        const { report, fileName } = message.data as { report: string; fileName: string };
        const md = await exportMD(report, fileName);
        sendResponse({ success: true, data: md });
        break;
      }
      case 'GET_PROJECTS': {
        const projects = await getStorage<Project[]>(STORAGE_KEYS.PROJECTS) || [];
        sendResponse({ success: true, data: projects });
        break;
      }
      case 'CREATE_PROJECT': {
        const { name } = message.data as { name: string };
        const projects = await getStorage<Project[]>(STORAGE_KEYS.PROJECTS) || [];
        const newProject: Project = {
          id: generateId(),
          name,
          products: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        projects.push(newProject);
        await setStorage(STORAGE_KEYS.PROJECTS, projects);
        sendResponse({ success: true, data: newProject });
        break;
      }
      case 'DELETE_PROJECT': {
        const { id } = message.data as { id: string };
        let projects = await getStorage<Project[]>(STORAGE_KEYS.PROJECTS) || [];
        projects = projects.filter((p) => p.id !== id);
        await setStorage(STORAGE_KEYS.PROJECTS, projects);
        sendResponse({ success: true });
        break;
      }
      case 'UPDATE_PROJECT': {
        const { id, name, products } = message.data as { id: string; name?: string; products?: ProjectProduct[] };
        let projects = await getStorage<Project[]>(STORAGE_KEYS.PROJECTS) || [];
        const index = projects.findIndex((p) => p.id === id);
        if (index !== -1) {
          projects[index] = {
            ...projects[index],
            ...(name && { name }),
            ...(products && { products }),
            updatedAt: new Date().toISOString(),
          };
          await setStorage(STORAGE_KEYS.PROJECTS, projects);
        }
        sendResponse({ success: true, data: projects[index] });
        break;
      }
      case 'ADD_TO_PROJECT': {
        const { projectId, productInfo, type } = message.data as { projectId: string; productInfo: ProductInfo; type: 'mine' | 'competitor' };
        let projects = await getStorage<Project[]>(STORAGE_KEYS.PROJECTS) || [];
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          const existingProduct = project.products.find((p) => p.productInfo.url === productInfo.url);
          if (!existingProduct) {
            project.products.push({
              id: generateId(),
              productInfo,
              type,
              addedAt: new Date().toISOString(),
            });
            project.updatedAt = new Date().toISOString();
            await setStorage(STORAGE_KEYS.PROJECTS, projects);
          }
          sendResponse({ success: true, data: project });
        } else {
          sendResponse({ success: false, error: '项目不存在' });
        }
        break;
      }
      default: {
        sendResponse({ success: false, error: '未知消息类型' });
      }
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : '处理失败',
    });
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const existingConfig = await getStorage<AIConfig>(STORAGE_KEYS.AI_CONFIG);
  if (!existingConfig) {
    const defaultProvider: AIProvider = 'deepseek';
    const providerConfig = AI_PROVIDERS[defaultProvider];
    await setStorage(STORAGE_KEYS.AI_CONFIG, {
      provider: defaultProvider,
      apiKey: '',
      model: providerConfig.defaultModel,
      endpoint: providerConfig.defaultEndpoint,
    });
  }
  
  const existingProjects = await getStorage<Project[]>(STORAGE_KEYS.PROJECTS);
  if (!existingProjects) {
    await setStorage(STORAGE_KEYS.PROJECTS, []);
  }
});
