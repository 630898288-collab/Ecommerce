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

## 视觉分析
### 整体设计调性
### 视觉重点
### 优秀画面表达
### 核心呈现场景
### 技术呈现方式

## 文案表达结构
### 内容模块分析
### 模块顺序与逻辑

## 核心卖点提炼
1. 
2. 
3. 
4. 
5. 

## 卖点内容比例
### 核心卖点与辅助卖点识别
### 内容分配比例分析

## 文案风格说明

## 核心定位

## 目标人群推导
1. 
2. 
3. 
4. 

## 痛点洞察
- **显性痛点**：
- **隐性顾虑**：

## 核心使用场景
1. 
2. 
3. 
4. 
5. 

## 前 3 屏核心表达
1. **第1屏**：
2. **第2屏**：
3. **第3屏**：

## 精品表达提炼
- **功能转体验**：
- **设计协同**：
- **可复用句式**：

## 精品信任状
- **权威认证**：
- **销量与榜单**：
- **用户口碑**：
- **技术专利**：
- **售后保障**：

## 消费者体验分析
- **打动点**：
- **犹豫点**：

## 综合结论

## 可借鉴点
- **可复制表达**：
- **可复制视觉**：
- **可复制信任**：

## 风险提示
- **绝对化用语风险**：
- **信息缺失风险**：
- **非相关广告干扰**：
- **竞品对比含糊**：

---

**可直接复用到我司产品的表达建议**：

<!-- auto-product-params -->
## 商品参数
{allParams}`;

const AI_PROVIDERS = {
  deepseek: { name: 'DeepSeek', defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions', defaultModel: 'deepseek-chat', defaultVisionModel: 'deepseek-vl2' },
  qianwen: { name: '千问', defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', defaultModel: 'qwen-turbo', defaultVisionModel: 'qwen-vl-max' },
  doubao: { name: '豆包', defaultEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', defaultModel: 'doubao-pro-4k', defaultVisionModel: 'doubao-seed-2-1-pro-260628' },
  zhipu: { name: '智谱', defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', defaultModel: 'glm-4', defaultVisionModel: 'glm-4v' },
  moonshot: { name: 'Kimi', defaultEndpoint: 'https://api.moonshot.cn/v1/chat/completions', defaultModel: 'moonshot-v1-8k', defaultVisionModel: '' },
  baidu: { name: '百度', defaultEndpoint: 'https://qianfan.baidubce.com/v2/chat/completions', defaultModel: 'ernie-bot-4', defaultVisionModel: '' },
  minimax: { name: 'MiniMax', defaultEndpoint: 'https://api.minimax.chat/v1/chat/completions', defaultModel: 'abab6.5s-chat', defaultVisionModel: '' },
  chatgpt: { name: 'ChatGPT', defaultEndpoint: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o-mini', defaultVisionModel: 'gpt-4o-mini' },
};

const STORAGE_KEYS = { PROJECTS: 'projects', AI_AGENTS: 'aiAgents' };

const AGENT_TYPES = {
  main: { name: '主分析Agent', desc: '负责主要的文本分析和报告生成' },
  vision: { name: '多模态Agent', desc: '负责图片内容分析（支持视觉）' },
  fallback: { name: '降级Agent', desc: '主Agent失效时自动调用' },
  custom: { name: '自定义Agent', desc: '自定义用途的Agent' },
};

function getDefaultAgents() {
  return [
    {
      id: 'agent_main',
      name: '主分析模型',
      type: 'main',
      provider: 'deepseek',
      apiKey: '',
      model: 'deepseek-chat',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      enabled: true,
      isVision: false
    },
    {
      id: 'agent_fallback',
      name: '降级模型',
      type: 'fallback',
      provider: 'qianwen',
      apiKey: '',
      model: 'qwen-turbo',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      enabled: false,
      isVision: false
    },
    {
      id: 'agent_vision',
      name: '图片分析模型',
      type: 'vision',
      provider: 'qianwen',
      apiKey: '',
      model: 'qwen-vl-max',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      enabled: false,
      isVision: true
    }
  ];
}

async function getAgents() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AI_AGENTS);
  if (result[STORAGE_KEYS.AI_AGENTS]) {
    return result[STORAGE_KEYS.AI_AGENTS];
  }
  const defaults = getDefaultAgents();
  await setStorage(STORAGE_KEYS.AI_AGENTS, defaults);
  return defaults;
}

async function getActiveAgent(type) {
  const agents = await getAgents();
  return agents.find(a => a.type === type && a.enabled && a.apiKey);
}

async function getFallbackAgent(excludeId) {
  const agents = await getAgents();
  return agents.find(a => a.id !== excludeId && a.enabled && a.apiKey && (a.type === 'fallback' || a.type === 'main'));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function sanitizeFilename(filename) {
  return filename.replace(/[\\/:*?"<>|]/g, '_').trim();
}

async function getStorage(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

async function setStorage(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

const VISION_CACHE_PREFIX = 'vision_cache_';
const VISION_CACHE_HOURS = 24 * 7;

function getVisionCacheKey(url) {
  return VISION_CACHE_PREFIX + btoa(unescape(encodeURIComponent(url)));
}

async function getVisionCache(url) {
  const key = getVisionCacheKey(url);
  const data = await getStorage(key);
  if (data && data.timestamp && data.result) {
    const age = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    if (age < VISION_CACHE_HOURS) {
      return data.result;
    }
  }
  return null;
}

async function saveVisionCache(url, result) {
  const key = getVisionCacheKey(url);
  await setStorage(key, { result, timestamp: Date.now() });
}

async function clearAllVisionCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const keys = Object.keys(items).filter(k => k.startsWith(VISION_CACHE_PREFIX));
      chrome.storage.local.remove(keys, () => resolve(keys.length));
    });
  });
}

const BATCH_SIZE = 3;
const MAX_VISION_IMAGES = 20;
const MAX_RETRY_IMAGES = 5;
const FETCH_TIMEOUT = 120000;
const BATCH_DELAY = 1000;
const LARGE_IMAGE_THRESHOLD = 1500000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`请求超时（${timeout / 1000}秒）`);
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

async function downloadImageToBase64(url) {
  console.log(`[图片下载] 开始下载: ${url.substring(0, 80)}...`);
  const response = await fetchWithTimeout(url, {
    headers: {
      'Referer': url,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 30000,
  });
  
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
  }
  
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk);
  }
  const base64 = btoa(binary);
  const mimeType = blob.type || 'image/jpeg';
  console.log(`[图片下载] 完成，大小: ${(bytes.byteLength / 1024).toFixed(1)}KB`);
  return `data:${mimeType};base64,${base64}`;
}

async function downloadImagesToBase64(urls, onProgress) {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const base64 = await downloadImageToBase64(urls[i]);
      results.push({ success: true, url: urls[i], base64 });
    } catch (e) {
      console.error(`[图片下载] 第 ${i + 1} 张图片下载失败:`, e.message);
      results.push({ success: false, url: urls[i], error: e.message });
    }
    
    if (onProgress) {
      onProgress({
        type: 'image_download',
        current: i + 1,
        total: urls.length,
        downloaded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      });
    }
  }
  return results;
}

function buildPrompt(productInfo, filledTemplate) {
  return `你是一个专业的电商商品分析专家。请根据以下商品信息，按照指定模板生成一份详细的分析报告。

【商品信息】
- 标题：${productInfo.title}
- 品牌：${productInfo.brand}
- 价格：${productInfo.price}
- 销量：${productInfo.saleCount}
- 类目：${productInfo.category}
- 店铺：${productInfo.shopName}
- 型号：${productInfo.model}
- 参数：${JSON.stringify(productInfo.params)}
- 详情图数量：${productInfo.detailImages ? productInfo.detailImages.length : 0}

【模板使用说明】
请按照模板结构填充内容，各模块分析要求如下：

1. **视觉分析**：基于商品图片分析
   - 整体设计调性：页面的整体视觉风格、配色方案、设计语言
   - 视觉重点：页面中最吸引眼球的元素和设计重点
   - 优秀画面表达：哪些画面设计做得好，为什么好
   - 核心呈现场景：图片主要呈现的使用场景和情境
   - 技术呈现方式：产品技术参数和功能如何通过视觉表达

2. **文案表达结构**：基于详情页内容分析
   - 内容模块分析：识别页面包含哪些内容模块（如：产品介绍、功能说明、用户评价、售后保障等）
   - 模块顺序与逻辑：各模块的排列顺序和逻辑关系

3. **核心卖点提炼**：从商品信息中提炼5个核心卖点

4. **卖点内容比例**：分析详情页内容结构
   - 核心卖点与辅助卖点识别：区分哪些是核心卖点，哪些是辅助卖点
   - 内容分配比例分析：各卖点在页面中所占的篇幅和位置权重

5. **文案风格说明**：描述页面文案的语言风格

6. **其他章节**：基于商品信息进行合理推断

请严格按照以下模板格式输出，不要添加任何额外内容：
${filledTemplate}

【输出要求】
1. 必须填充模板中所有空字段，不得保留空白
2. 如果某字段信息缺失或无法分析，标注为"未提取"
3. 分析要客观、专业、有数据支撑
4. 格式必须为 Markdown，保持模板结构和顺序不变
5. 每个章节至少写2-3句话的分析内容
6. 基于商品标题、参数和图片内容进行合理推断`;
}

function buildFilledTemplate(productInfo) {
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

  return template
    .replace(/{paramsList}/g, paramsList)
    .replace(/{allParams}/g, allParams);
}

async function callTextAPI(agent, prompt) {
  const response = await fetchWithTimeout(agent.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agent.apiKey}`,
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[${agent.name}] API调用失败: ${response.status} ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return extractResponse(data);
}

function extractResponse(data, provider) {
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  if (data.output && typeof data.output === 'string') {
    return data.output;
  }
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.content && Array.isArray(item.content)) {
        const textParts = item.content.filter(c => c.type === 'output_text' || c.type === 'text').map(c => c.text || '');
        if (textParts.length > 0) return textParts.join('\n');
      }
    }
  }
  if (data.result) return data.result;
  throw new Error('无法解析API响应');
}

async function callVisionAPI(agent, images, prompt) {
  console.log(`[视觉分析] Agent: ${agent.name}, 模型: ${agent.model}, 图片数: ${images.length}, 服务商: ${agent.provider}`);

  const useResponsesAPI = /\/responses\/?$/.test(agent.endpoint);
  let endpoint = agent.endpoint;
  let body;

  if (useResponsesAPI) {
    console.log(`[视觉分析] 使用Responses API格式: ${endpoint}`);
    const inputContent = [];
    images.forEach((imgData) => {
      if (imgData.startsWith('data:')) {
        inputContent.push({ type: 'input_image', image_url: imgData });
      } else {
        inputContent.push({ type: 'input_image', image_url: imgData });
      }
    });
    inputContent.push({ type: 'input_text', text: prompt });
    body = JSON.stringify({
      model: agent.model,
      input: [{ role: 'user', content: inputContent }],
    });
  } else {
    console.log(`[视觉分析] 使用Chat Completions API格式: ${endpoint}`);
    const content = [{ type: 'text', text: prompt }];
    images.forEach((imgData) => {
      if (imgData.startsWith('data:')) {
        content.push({ type: 'image_url', image_url: { url: imgData } });
      } else {
        content.push({ type: 'image_url', image_url: { url: imgData } });
      }
    });
    body = JSON.stringify({
      model: agent.model,
      messages: [{ role: 'user', content: content }],
      temperature: 0.5,
    });
  }

  let response;
  try {
    response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.apiKey}`,
      },
      body,
    });
  } catch (fetchErr) {
    console.error('[视觉分析] 网络请求失败:', fetchErr);
    throw new Error(`[${agent.name}] 网络请求失败: ${fetchErr.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[视觉分析] API返回错误 ${response.status}:`, errorText);
    let hint = '';
    if (response.status === 404) {
      hint = '（可能原因：该模型不支持视觉分析，或API地址/格式有误）';
    } else if (response.status === 401 || response.status === 403) {
      hint = '（可能原因：API Key 错误或无权限访问该模型）';
    } else if (response.status === 400) {
      hint = '（可能原因：请求格式错误，或该模型不支持图片输入）';
    }
    throw new Error(`[${agent.name}] API返回 ${response.status}: ${errorText.substring(0, 200)} ${hint}`);
  }

  const data = await response.json();
  console.log('[视觉分析] API响应:', JSON.stringify(data).substring(0, 300));
  return extractResponse(data, agent.provider);
}

async function callTextWithFallback(agent, prompt, onProgress) {
  try {
    if (onProgress) onProgress({ type: 'text_start', agent: agent.name });
    const result = await callTextAPI(agent, prompt);
    if (onProgress) onProgress({ type: 'text_done', agent: agent.name });
    return result;
  } catch (e) {
    console.error(`主Agent [${agent.name}] 失败:`, e.message);
    if (onProgress) onProgress({ type: 'text_failed', agent: agent.name, error: e.message });
    
    const fallback = await getFallbackAgent(agent.id);
    if (!fallback) {
      throw new Error(`主Agent失败且无可用降级Agent: ${e.message}`);
    }
    console.log(`切换到降级Agent: ${fallback.name}`);
    if (onProgress) onProgress({ type: 'fallback_start', agent: fallback.name, reason: e.message });
    const result = await callTextAPI(fallback, prompt);
    if (onProgress) onProgress({ type: 'text_done', agent: fallback.name });
    return result;
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function analyzeImages(productInfo, visionAgent, onProgress, forceFull = false) {
  const detailImages = productInfo.detailImages || [];
  if (detailImages.length === 0) {
    console.log('[视觉分析] 无详情图片，跳过图片分析');
    return { analysis: '', failedImages: [] };
  }

  const imagesToAnalyze = detailImages.slice(0, MAX_VISION_IMAGES);
  const totalImages = imagesToAnalyze.length;
  const skippedCount = detailImages.length - totalImages;
  if (skippedCount > 0) {
    console.log(`[视觉分析] 图片数量超过${MAX_VISION_IMAGES}张，仅分析前${MAX_VISION_IMAGES}张，跳过${skippedCount}张`);
  }

  console.log(`[视觉分析] 共 ${totalImages} 张图片，断点续载: ${forceFull ? '关闭（完全重新分析）' : '开启'}`);

  const imageResults = new Array(totalImages).fill(null);
  const failedImages = [];
  const succeededImages = [];
  let cachedCount = 0;

  const visionPrompt = `你是一个电商产品分析专家。请分析这张商品详情图片，提取关键信息：

请用结构化的方式描述这张图片的内容，包括：
1. 图片展示的产品特点/功能
2. 图片中的文字信息
3. 图片的视觉风格和设计元素
4. 图片传达的核心卖点
5. 图片的构图和布局方式

请用简洁清晰的语言描述。`;

  if (!forceFull) {
    console.log('[视觉分析] 检查图片缓存...');
    for (let i = 0; i < totalImages; i++) {
      const cached = await getVisionCache(imagesToAnalyze[i]);
      if (cached) {
        imageResults[i] = cached;
        succeededImages.push(i);
        cachedCount++;
      }
    }
    console.log(`[视觉分析] 从缓存加载 ${cachedCount}/${totalImages} 张图片结果`);
    if (onProgress && cachedCount > 0) {
      onProgress({
        type: 'image_cached',
        cached: cachedCount,
        total: totalImages,
      });
    }
  }

  const totalBatches = Math.ceil(totalImages / BATCH_SIZE);
  const uncachedCount = imageResults.filter(r => r === null).length;

  if (uncachedCount === 0) {
    console.log('[视觉分析] 所有图片均已缓存，无需重新分析');
  } else {
    console.log(`[视觉分析] 需分析 ${uncachedCount} 张新图片`);
  }

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStartIdx = batchIdx * BATCH_SIZE;
    const batchEndIdx = Math.min(batchStartIdx + BATCH_SIZE, totalImages);
    const batchImageIndices = [];
    const batchImageUrls = [];

    for (let i = batchStartIdx; i < batchEndIdx; i++) {
      if (imageResults[i] === null) {
        batchImageIndices.push(i);
        batchImageUrls.push(imagesToAnalyze[i]);
      }
    }

    if (batchImageUrls.length === 0) {
      if (onProgress) {
        onProgress({
          type: 'image_batch',
          current: batchIdx + 1,
          total: totalBatches,
          succeeded: succeededImages.length,
          failed: failedImages.length,
        });
      }
      continue;
    }

    console.log(`[视觉分析] 第 ${batchIdx + 1}/${totalBatches} 批，需分析 ${batchImageUrls.length} 张新图片`);

    console.log(`[视觉分析] 开始下载第 ${batchIdx + 1} 批图片...`);
    const downloadResults = await downloadImagesToBase64(batchImageUrls, (progress) => {
      if (onProgress) {
        onProgress({
          type: 'image_download',
          current: progress.current,
          total: progress.total,
          downloaded: progress.downloaded,
          failed: progress.failed,
          batch: batchIdx + 1,
          totalBatches: totalBatches,
        });
      }
    });

    for (let j = 0; j < batchImageUrls.length; j++) {
      const imgIdx = batchImageIndices[j];
      const dlResult = downloadResults[j];
      
      if (!dlResult.success) {
        failedImages.push({ index: imgIdx, url: dlResult.url, error: dlResult.error });
        console.error(`[视觉分析] 第 ${imgIdx + 1} 张图片下载失败: ${dlResult.error}`);
        continue;
      }

      console.log(`[视觉分析] 开始分析第 ${imgIdx + 1} 张图片...`);
      const imgSize = dlResult.base64.length;
      const isLargeImage = imgSize > LARGE_IMAGE_THRESHOLD;
      if (isLargeImage) {
        console.log(`[视觉分析] ⚠️ 第 ${imgIdx + 1} 张图片较大（${(imgSize/1024).toFixed(0)}KB），单独分析`);
      }
      if (onProgress) {
        onProgress({
          type: 'image_analyzing',
          current: imgIdx + 1,
          total: totalImages,
          succeeded: succeededImages.length,
          failed: failedImages.length,
          isLarge: isLargeImage,
          sizeKB: Math.round(imgSize / 1024),
        });
      }
      try {
        const result = await callVisionAPI(visionAgent, [dlResult.base64], visionPrompt);
        imageResults[imgIdx] = result;
        succeededImages.push(imgIdx);
        await saveVisionCache(dlResult.url, result);
        console.log(`[视觉分析] 第 ${imgIdx + 1} 张图片分析成功，已缓存`);
      } catch (e) {
        failedImages.push({ index: imgIdx, url: dlResult.url, error: e.message });
        console.error(`[视觉分析] 第 ${imgIdx + 1} 张图片分析失败: ${e.message}`);
        if (onProgress) {
          onProgress({
            type: 'image_batch_error',
            current: batchIdx + 1,
            total: totalBatches,
            error: e.message.substring(0, 100),
            imageIndex: imgIdx + 1,
          });
        }
      }

      if (onProgress) {
        onProgress({
          type: 'image_analyzed',
          current: imgIdx + 1,
          total: totalImages,
          succeeded: succeededImages.length,
          failed: failedImages.length,
        });
      }

      if (j < batchImageUrls.length - 1) {
        await sleep(BATCH_DELAY);
      }
    }

    if (onProgress) {
      onProgress({
        type: 'image_batch',
        current: batchIdx + 1,
        total: totalBatches,
        succeeded: succeededImages.length,
        failed: failedImages.length,
      });
    }

    if (batchIdx < totalBatches - 1) {
      console.log(`[视觉分析] 等待 ${BATCH_DELAY}ms 后处理下一批...`);
      await sleep(BATCH_DELAY);
    }
  }

  if (failedImages.length > 0) {
    const retryImages = failedImages.slice(0, MAX_RETRY_IMAGES);
    console.log(`[视觉分析] 有 ${failedImages.length} 张图片失败，重试前 ${retryImages.length} 张...`);
    const retrySuccess = [];
    for (let i = 0; i < retryImages.length; i++) {
      const failed = retryImages[i];
      try {
        console.log(`[视觉分析] 重试下载并分析第 ${failed.index + 1} 张图片...`);
        const base64 = await downloadImageToBase64(failed.url);
        const result = await callVisionAPI(visionAgent, [base64], visionPrompt);
        imageResults[failed.index] = result;
        retrySuccess.push(failed.index);
        await saveVisionCache(failed.url, result);
        console.log(`[视觉分析] 第 ${failed.index + 1} 张图片重试成功，已缓存`);
      } catch (e2) {
        console.error(`[视觉分析] 重试第 ${failed.index + 1} 张图片失败:`, e2.message);
      }
      if (i < retryImages.length - 1) {
        await sleep(BATCH_DELAY);
      }
    }
    if (retrySuccess.length > 0 && onProgress) {
      onProgress({
        type: 'image_retry',
        retried: retrySuccess.length,
        stillFailed: failedImages.length - retrySuccess.length,
      });
    }
    const stillFailed = failedImages.filter(f => !retrySuccess.includes(f.index));
    const finalAnalysis = [];
    for (let i = 0; i < totalImages; i++) {
      if (imageResults[i]) {
        finalAnalysis.push(`--- 第${i + 1}张图片 ---\n${imageResults[i]}`);
      }
    }
    const finalSucceeded = succeededImages.length + retrySuccess.length;
    console.log(`[视觉分析] 完成。成功: ${finalSucceeded}, 失败: ${stillFailed.length}`);
    return { analysis: finalAnalysis.join('\n\n'), failedImages: stillFailed };
  }

  const finalAnalysis = [];
  for (let i = 0; i < totalImages; i++) {
    if (imageResults[i]) {
      finalAnalysis.push(`--- 第${i + 1}张图片 ---\n${imageResults[i]}`);
    }
  }
  console.log(`[视觉分析] 完成。成功: ${succeededImages.length}, 失败: ${failedImages.length}`);
  return { analysis: finalAnalysis.join('\n\n'), failedImages: failedImages };
}

async function callAIWithProgress(productInfo, onProgress, forceFull = false) {
  const mainAgent = await getActiveAgent('main');
  if (!mainAgent) {
    throw new Error('未找到启用的主分析Agent，请在设置中配置并启用');
  }
  
  const visionAgent = await getActiveAgent('vision');
  const useVision = visionAgent && productInfo.detailImages && productInfo.detailImages.length > 0;
  
  const filledTemplate = buildFilledTemplate(productInfo);

  if (!useVision) {
    if (onProgress) onProgress({ type: 'text_start', agent: mainAgent.name });
    const report = await callTextWithFallback(mainAgent, buildPrompt(productInfo, filledTemplate), onProgress);
    return {
      report,
      productTitle: productInfo.title.substring(0, 30),
      brandName: productInfo.brand,
      categoryHint: productInfo.category,
      saleCount: productInfo.saleCount || '未提取',
      fileName: `${sanitizeFilename(productInfo.brand)}-${sanitizeFilename(productInfo.title.substring(0, 30))}-${new Date().toISOString().split('T')[0]}.md`,
      generatedAt: new Date().toISOString(),
      failedImages: [],
      usedAgent: mainAgent.name
    };
  }

  if (onProgress) onProgress({ type: 'vision_start', totalImages: productInfo.detailImages.length, agent: visionAgent.name });
  
  const { analysis: imageAnalysis, failedImages } = await analyzeImages(productInfo, visionAgent, (prog) => {
    if (onProgress) onProgress(prog);
  }, forceFull);

  if (onProgress) onProgress({ type: 'text_start', agent: mainAgent.name });
  
  const combinedPrompt = `你是一个专业的电商商品分析专家。请根据以下商品信息和图片分析结果，按照指定模板生成一份详细的分析报告。

【商品基本信息】
- 标题：${productInfo.title}
- 品牌：${productInfo.brand}
- 价格：${productInfo.price}
- 销量：${productInfo.saleCount}
- 类目：${productInfo.category}
- 店铺：${productInfo.shopName}
- 型号：${productInfo.model}
- 参数：${JSON.stringify(productInfo.params)}

【图片分析结果（非常重要）】
${imageAnalysis || '无图片分析结果'}

${failedImages && failedImages.length > 0 ? `【注意】有 ${failedImages.length} 张图片分析失败，未纳入分析。失败的图片索引：${failedImages.map(f => f.index + 1).join(', ')}` : ''}

【模板使用说明】
请按照模板结构填充内容，各模块分析要求如下：

1. **视觉分析**：基于商品图片分析（必须充分利用图片分析结果）
   - 整体设计调性：页面的整体视觉风格、配色方案、设计语言
   - 视觉重点：页面中最吸引眼球的元素和设计重点
   - 优秀画面表达：哪些画面设计做得好，为什么好
   - 核心呈现场景：图片主要呈现的使用场景和情境
   - 技术呈现方式：产品技术参数和功能如何通过视觉表达

2. **文案表达结构**：基于详情页内容分析
   - 内容模块分析：识别页面包含哪些内容模块（如：产品介绍、功能说明、用户评价、售后保障等）
   - 模块顺序与逻辑：各模块的排列顺序和逻辑关系

3. **核心卖点提炼**：从商品信息和图片内容中提炼5个核心卖点

4. **卖点内容比例**：分析详情页内容结构
   - 核心卖点与辅助卖点识别：区分哪些是核心卖点，哪些是辅助卖点
   - 内容分配比例分析：各卖点在页面中所占的篇幅和位置权重

5. **文案风格说明**：描述页面文案的语言风格

6. **其他章节**：基于商品信息和图片内容进行合理推断

请严格按照以下模板格式输出，不要添加任何额外内容：
${filledTemplate}

【输出要求】
1. 必须填充模板中所有空字段，不得保留空白
2. 如果某字段信息缺失或无法分析，标注为"未提取"
3. 分析要客观、专业、有数据支撑
4. 格式必须为 Markdown，保持模板结构和顺序不变
5. 每个章节至少写2-3句话的分析内容
6. 必须充分利用图片分析结果，特别是"视觉分析"章节
7. 页面文字分析章节要结合图片中识别到的文字信息
8. 基于商品标题、参数和图片内容进行合理推断和分析`;

  const report = await callTextWithFallback(mainAgent, combinedPrompt, onProgress);

  return {
    report,
    productTitle: productInfo.title.substring(0, 30),
    brandName: productInfo.brand,
    categoryHint: productInfo.category,
    saleCount: productInfo.saleCount || '未提取',
    fileName: `${sanitizeFilename(productInfo.brand)}-${sanitizeFilename(productInfo.title.substring(0, 30))}-${new Date().toISOString().split('T')[0]}.md`,
    generatedAt: new Date().toISOString(),
    failedImages: failedImages || [],
    usedAgent: mainAgent.name,
    usedVisionAgent: visionAgent.name
  };
}

async function callAI(productInfo) {
  const result = await callAIWithProgress(productInfo, null);
  return result;
}

function exportExcel(products) {
  const allParamKeys = new Set();
  products.forEach((p) => {
    if (p.params && typeof p.params === 'object') {
      Object.keys(p.params).forEach((k) => allParamKeys.add(k));
    }
  });
  
  const paramKeys = Array.from(allParamKeys);
  
  const headers = [
    '类型',
    '平台',
    '商品标题',
    '品牌',
    '型号',
    '类目',
    '店铺',
    '价格',
    '销量',
    '商品链接',
    ...paramKeys,
    '详情图片地址',
    '采集时间'
  ];
  
  const rows = products.map((p) => {
    const row = [
      p.type === 'mine' ? '我的产品' : (p.type === 'competitor' ? '竞品' : ''),
      p.platform === 'tmall' ? '天猫' : '京东',
      p.title || '',
      p.brand || '',
      p.model || '',
      p.category || '',
      p.shopName || '',
      p.price || '',
      p.saleCount || '',
      p.url || '',
    ];
    
    paramKeys.forEach((key) => {
      row.push(p.params && p.params[key] ? p.params[key] : '');
    });
    
    const detailImages = p.detailImages && Array.isArray(p.detailImages) ? p.detailImages.join('\n') : '';
    row.push(detailImages);
    
    row.push(p.extractedAt || '');
    
    return row;
  });

  const csvContent = [
    headers.join(','), 
    ...rows.map((r) => r.map((c) => `"${(c + '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'CALL_AI': {
      const { productInfo } = message.data;
      callAI(productInfo).then((result) => {
        sendResponse({ success: true, data: result });
      }).catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
    case 'CALL_AI_PROGRESS': {
      const { productInfo, forceFull } = message.data;
      callAIWithProgress(productInfo, (progress) => {
        try {
          chrome.runtime.sendMessage({ type: 'AI_PROGRESS', data: progress });
        } catch (e) {
          console.error('[AI进度] 发送进度消息失败:', e);
        }
      }, forceFull).then((result) => {
        console.log('[AI分析] 完成');
        sendResponse({ success: true, data: result });
      }).catch((err) => {
        console.error('[AI分析] 失败:', err);
        console.error('[AI分析] 错误堆栈:', err.stack);
        sendResponse({ success: false, error: err.message || '未知错误' });
      });
      return true;
    }
    case 'GET_AGENTS': {
      getAgents().then((agents) => {
        sendResponse({ success: true, data: agents });
      });
      return true;
    }
    case 'SAVE_AGENT': {
      const { agent } = message.data;
      getAgents().then((agents) => {
        const idx = agents.findIndex(a => a.id === agent.id);
        if (idx >= 0) {
          agents[idx] = agent;
        } else {
          agents.push(agent);
        }
        return setStorage(STORAGE_KEYS.AI_AGENTS, agents).then(() => agents);
      }).then((agents) => {
        sendResponse({ success: true, data: agents });
      });
      return true;
    }
    case 'DELETE_AGENT': {
      const { id } = message.data;
      getAgents().then((agents) => {
        const filtered = agents.filter(a => a.id !== id);
        return setStorage(STORAGE_KEYS.AI_AGENTS, filtered).then(() => filtered);
      }).then((agents) => {
        sendResponse({ success: true, data: agents });
      });
      return true;
    }
    case 'TOGGLE_AGENT': {
      const { id, enabled } = message.data;
      getAgents().then((agents) => {
        const agent = agents.find(a => a.id === id);
        if (agent) {
          agent.enabled = enabled;
          return setStorage(STORAGE_KEYS.AI_AGENTS, agents).then(() => agents);
        }
        return agents;
      }).then((agents) => {
        sendResponse({ success: true, data: agents });
      });
      return true;
    }
    case 'GET_STORAGE': {
      const { key } = message.data;
      getStorage(key).then((data) => {
        sendResponse({ success: true, data });
      });
      return true;
    }
    case 'SET_STORAGE': {
      const { key, value } = message.data;
      setStorage(key, value).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }
    case 'EXPORT_EXCEL': {
      const { products } = message.data;
      const csv = exportExcel(products);
      sendResponse({ success: true, data: csv });
      break;
    }
    case 'EXPORT_MD': {
      const { report, fileName } = message.data;
      sendResponse({ success: true, data: report });
      break;
    }
    case 'GET_PROJECTS': {
      getStorage(STORAGE_KEYS.PROJECTS).then((projects) => {
        sendResponse({ success: true, data: projects || [] });
      });
      return true;
    }
    case 'CREATE_PROJECT': {
      const { name } = message.data;
      getStorage(STORAGE_KEYS.PROJECTS).then((projects) => {
        const list = projects || [];
        const newProject = {
          id: generateId(),
          name,
          products: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(newProject);
        return setStorage(STORAGE_KEYS.PROJECTS, list).then(() => newProject);
      }).then((newProject) => {
        sendResponse({ success: true, data: newProject });
      });
      return true;
    }
    case 'ADD_TO_PROJECT': {
      const { projectId, type, productInfo } = message.data;
      getStorage(STORAGE_KEYS.PROJECTS).then((projects) => {
        const list = projects || [];
        const proj = list.find(p => p.id === projectId);
        if (proj) {
          proj.products.push({ type, productInfo, addedAt: Date.now() });
          proj.updatedAt = new Date().toISOString();
          return setStorage(STORAGE_KEYS.PROJECTS, list).then(() => proj);
        }
        return proj;
      }).then((proj) => {
        sendResponse({ success: true, data: proj });
      });
      return true;
    }
    case 'DELETE_PROJECT': {
      const { projectId } = message.data;
      getStorage(STORAGE_KEYS.PROJECTS).then((projects) => {
        const list = (projects || []).filter(p => p.id !== projectId);
        return setStorage(STORAGE_KEYS.PROJECTS, list).then(() => list);
      }).then((list) => {
        sendResponse({ success: true, data: list });
      });
      return true;
    }
    default:
      break;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async () => {
  const agents = await getAgents();
  if (!agents || agents.length === 0) {
    await setStorage(STORAGE_KEYS.AI_AGENTS, getDefaultAgents());
  }

  const existingProjects = await getStorage(STORAGE_KEYS.PROJECTS);
  if (!existingProjects) {
    await setStorage(STORAGE_KEYS.PROJECTS, []);
  }
});
