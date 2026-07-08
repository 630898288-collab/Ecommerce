var productInfo = null;
var aiResult = null;
var aiAgents = [];
var projects = [];
var cacheHours = 24;
var currentTabId = null;
var editingAgentId = null;

var PROVIDER_CONFIG = {
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    visionModels: ['deepseek-vl2']
  },
  qianwen: {
    name: '千问（通义千问）',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'],
    visionModels: ['qwen-vl-max', 'qwen-vl-plus']
  },
  doubao: {
    name: '豆包（火山方舟）',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    models: ['doubao-pro-4k', 'doubao-pro-32k', 'doubao-1.5-pro', 'doubao-1.5-lite'],
    visionModels: ['doubao-seed-2-1-pro-260628', 'doubao-seed-2-1-turbo-260628', 'doubao-vision-pro-32k', 'doubao-1.5-vision-pro']
  },
  zhipu: {
    name: '智谱清言（GLM）',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-4', 'glm-4-air', 'glm-4-flash', 'glm-4-plus'],
    visionModels: ['glm-4v', 'glm-4v-flash']
  },
  moonshot: {
    name: 'Kimi（月之暗面）',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    visionModels: []
  },
  baidu: {
    name: '文心一言（百度）',
    endpoint: 'https://qianfan.baidubce.com/v2/chat/completions',
    models: ['ernie-bot-4', 'ernie-bot-turbo', 'ernie-4.0-8k', 'ernie-4.0-turbo-8k'],
    visionModels: []
  },
  minimax: {
    name: 'MiniMax',
    endpoint: 'https://api.minimax.chat/v1/chat/completions',
    models: ['abab6.5s-chat', 'abab6.5-chat', 'abab5.5-chat'],
    visionModels: []
  },
  chatgpt: {
    name: 'ChatGPT（OpenAI）',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    visionModels: ['gpt-4o-mini', 'gpt-4o']
  }
};
var PROVIDER_NAMES = {};
Object.keys(PROVIDER_CONFIG).forEach(function(k) { PROVIDER_NAMES[k] = PROVIDER_CONFIG[k].name; });
var AGENT_TYPE_NAMES = { main: '主分析', vision: '多模态', fallback: '降级', custom: '自定义' };

var CACHE_PREFIX = 'product_cache_';
var AI_CACHE_PREFIX = 'ai_result_cache_';

function getCacheKey(url) {
  return CACHE_PREFIX + btoa(unescape(encodeURIComponent(url)));
}

function getAICacheKey(url) {
  return AI_CACHE_PREFIX + btoa(unescape(encodeURIComponent(url)));
}

function saveToCache(url, data) {
  var key = getCacheKey(url);
  var cacheData = {
    data: data,
    timestamp: Date.now()
  };
  chrome.storage.local.set({ [key]: cacheData });
}

function saveAIResultToCache(url, result) {
  var key = getAICacheKey(url);
  var cacheData = {
    data: result,
    timestamp: Date.now()
  };
  chrome.storage.local.set({ [key]: cacheData });
}

function getFromCache(url, callback) {
  var key = getCacheKey(url);
  chrome.storage.local.get(key, function(result) {
    var cache = result[key];
    if (cache && cache.timestamp && cache.data) {
      var age = (Date.now() - cache.timestamp) / (1000 * 60 * 60);
      if (age < cacheHours) {
        callback(cache.data, cache.timestamp);
        return;
      }
    }
    callback(null, null);
  });
}

function getAIResultFromCache(url, callback) {
  var key = getAICacheKey(url);
  chrome.storage.local.get(key, function(result) {
    var cache = result[key];
    if (cache && cache.timestamp && cache.data) {
      var age = (Date.now() - cache.timestamp) / (1000 * 60 * 60);
      if (age < cacheHours) {
        callback(cache.data, cache.timestamp);
        return;
      }
    }
    callback(null, null);
  });
}

function clearAllCache(callback) {
  chrome.storage.local.get(null, function(items) {
    var keysToRemove = [];
    Object.keys(items).forEach(function(key) {
      if (key.indexOf(CACHE_PREFIX) === 0) {
        keysToRemove.push(key);
      }
    });
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove, function() {
        callback && callback(keysToRemove.length);
      });
    } else {
      callback && callback(0);
    }
  });
}

function showError(msg) {
  var bar = document.getElementById('error-bar');
  bar.textContent = msg;
  bar.classList.add('show');
  setTimeout(function() {
    bar.classList.remove('show');
  }, 3000);
}

function copyToUrl(url) {
  var temp = document.createElement('textarea');
  temp.value = url;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
}

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs.length > 0) {
      callback(tabs[0]);
    } else {
      callback(null);
    }
  });
}

function isSupportedPage(url) {
  return /\.tmall\.com/.test(url) || /\.jd\.com/.test(url) || /\.jd\.hk/.test(url) || /\.taobao\.com/.test(url);
}

function extractInfo() {
  getActiveTab(function(tab) {
    if (!tab || !tab.url) {
      showError('无法获取当前标签页');
      return;
    }
    if (!isSupportedPage(tab.url)) {
      showError('请在天猫或京东商品页面使用');
      return;
    }
    currentTabId = tab.id;

    chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_INFO' }, function(response) {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, function() {
          if (chrome.runtime.lastError) {
            showError('无法注入内容脚本: ' + chrome.runtime.lastError.message);
            return;
          }
          chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_INFO' }, function(resp) {
            if (resp && resp.success) {
              handleExtractSuccess(resp.data);
            } else {
              showError(resp && resp.error ? resp.error : '提取失败');
            }
          });
        });
        return;
      }
      if (response && response.success) {
        handleExtractSuccess(response.data);
      } else {
        showError(response && response.error ? response.error : '提取失败');
      }
    });
  });
}

function handleExtractSuccess(data) {
  productInfo = data;
  saveToCache(data.url, data);
  renderInfo();
  renderParams();
  renderImages();
  document.getElementById('cache-badge').style.display = 'inline-block';
  document.getElementById('cache-badge').textContent = '刚提取';
  switchTab('info');
}

function tryLoadCache() {
  getActiveTab(function(tab) {
    if (!tab || !tab.url || !isSupportedPage(tab.url)) return;
    currentTabId = tab.id;
    getFromCache(tab.url, function(data, timestamp) {
      if (data) {
        productInfo = data;
        renderInfo();
        renderParams();
        renderImages();
        var age = Math.round((Date.now() - timestamp) / (1000 * 60));
        var badge = document.getElementById('cache-badge');
        badge.style.display = 'inline-block';
        if (age < 60) {
          badge.textContent = age + '分钟前缓存';
        } else {
          badge.textContent = Math.round(age / 60) + '小时前缓存';
        }
        document.getElementById('header-sub').textContent = '已加载缓存数据';
        
        getAIResultFromCache(tab.url, function(cachedAIResult, aiCacheTime) {
          if (cachedAIResult) {
            aiResult = cachedAIResult;
            renderAIResult(cachedAIResult);
            var aiAge = Math.floor((Date.now() - aiCacheTime) / 60000);
            var aiAgeText = aiAge < 60 ? aiAge + '分钟前缓存' : Math.floor(aiAge / 60) + '小时前缓存';
            showError('✅ AI分析已加载缓存（' + aiAgeText + '）');
          }
        });
      }
    });
  });
}

function renderInfo() {
  if (!productInfo) return;
  document.getElementById('empty-info').style.display = 'none';
  document.getElementById('info-content').style.display = 'block';
  var platform = productInfo.platform === 'tmall' ? '天猫' : '京东';
  document.getElementById('info-platform').textContent = platform;
  document.getElementById('info-platform').className = 'badge ' + (productInfo.platform === 'tmall' ? 'badge-tmall' : 'badge-jd');
  document.getElementById('info-title').textContent = productInfo.title || '-';
  document.getElementById('info-brand').textContent = productInfo.brand || '-';
  document.getElementById('info-model').textContent = productInfo.model || '-';
  document.getElementById('info-price').textContent = productInfo.price ? '¥' + productInfo.price : '-';
  document.getElementById('info-sale').textContent = productInfo.saleCount || '-';
  document.getElementById('info-shop').textContent = productInfo.shopName || '-';
  document.getElementById('info-category').textContent = productInfo.category || '-';
}

function renderParams() {
  var grid = document.getElementById('params-grid');
  var empty = document.getElementById('empty-params');
  if (!productInfo || !productInfo.params || Object.keys(productInfo.params).length === 0) {
    empty.style.display = 'block';
    grid.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  var html = '';
  Object.keys(productInfo.params).forEach(function(key) {
    var val = productInfo.params[key];
    html += '<div class="param-item"><div class="param-key">' + key + '</div><div class="param-val">' + val + '</div></div>';
  });
  grid.innerHTML = html;
}

function renderImages() {
  var grid = document.getElementById('images-grid');
  var empty = document.getElementById('empty-images');
  var imgs = (productInfo && productInfo.detailImages) ? productInfo.detailImages : [];
  if (imgs.length === 0) {
    empty.style.display = 'block';
    grid.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  var html = '';
  imgs.forEach(function(url, idx) {
    html += '<div class="img-item">';
    html += '<img src="' + url + '" onerror="this.style.display=\'none\'" loading="lazy">';
    html += '<div class="img-copy" data-idx="' + idx + '">复制</div>';
    html += '</div>';
  });
  grid.innerHTML = html;
  document.querySelectorAll('.img-copy').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.dataset.idx);
      if (productInfo && productInfo.detailImages && productInfo.detailImages[idx]) {
        copyToUrl(productInfo.detailImages[idx]);
        this.textContent = '已复制';
        var self = this;
        setTimeout(function() { self.textContent = '复制'; }, 1500);
      }
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.panel').forEach(function(p) {
    p.classList.toggle('active', p.id === 'panel-' + tabName);
  });
}

function renderAIResult(result) {
  if (!result) {
    document.getElementById('empty-ai').style.display = 'block';
    document.getElementById('ai-panel').style.display = 'none';
    return;
  }
  document.getElementById('empty-ai').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'none';
  document.getElementById('ai-panel').style.display = 'block';
  var report = formatMarkdown(result.report || result);
  var header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:6px 8px;background:#f3f4f6;border-radius:6px;gap:6px;">' +
    '<span style="font-size:12px;color:#6b7280;">📋 分析报告</span>' +
    '<div style="display:flex;gap:4px;">' +
    '<button id="btn-regenerate-ai" style="background:#3b82f6;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">🔄 续传分析</button>' +
    '<button id="btn-full-regenerate" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">🔄🔄 完全重分析</button>' +
    '</div>' +
    '</div>';
  document.getElementById('ai-result').innerHTML = header + report;
  var regenBtn = document.getElementById('btn-regenerate-ai');
  if (regenBtn) {
    regenBtn.addEventListener('click', function() {
      if (!productInfo) { showError('请先提取商品信息'); return; }
      if (!confirm('确定继续分析？已分析过的图片将跳过，仅分析未完成的图片。')) return;
      chrome.storage.local.remove(getAICacheKey(productInfo.url), function() {
        callAI(false);
      });
    });
  }
  var fullRegenBtn = document.getElementById('btn-full-regenerate');
  if (fullRegenBtn) {
    fullRegenBtn.addEventListener('click', function() {
      if (!productInfo) { showError('请先提取商品信息'); return; }
      if (!confirm('确定完全重新分析？将清除所有图片缓存，全部重新分析。')) return;
      chrome.storage.local.remove(getAICacheKey(productInfo.url), function() {
        callAI(true);
      });
    });
  }
}

var aiProgressListener = null;

function callAI(forceFull) {
  if (typeof forceFull === 'undefined') forceFull = false;
  if (!productInfo) {
    showError('请先提取商品信息');
    return;
  }
  var mainAgent = aiAgents.find(function(a) { return a.type === 'main' && a.enabled && a.apiKey; });
  if (!mainAgent) {
    showError('请先在设置中配置并启用主分析Agent');
    switchTab('settings');
    return;
  }
  switchTab('ai');
  
  getAIResultFromCache(productInfo.url, function(cachedResult, cacheTime) {
    if (cachedResult) {
      document.getElementById('empty-ai').style.display = 'none';
      document.getElementById('ai-loading').style.display = 'none';
      document.getElementById('ai-panel').style.display = 'block';
      aiResult = cachedResult;
      renderAIResult(cachedResult);
      
      var ageMinutes = Math.floor((Date.now() - cacheTime) / 60000);
      var ageText = ageMinutes < 60 ? ageMinutes + '分钟前缓存' : Math.floor(ageMinutes / 60) + '小时前缓存';
      showError('✅ 已加载缓存（' + ageText + '）');
      return;
    }
    
    document.getElementById('empty-ai').style.display = 'none';
    document.getElementById('ai-panel').style.display = 'none';
    document.getElementById('ai-loading').style.display = 'block';
    
    var fill = document.getElementById('ai-progress-fill');
    var text = document.getElementById('ai-progress-text');
    if (fill) fill.style.width = '0%';
    if (text) text.textContent = '正在初始化...';
    
    var batchStatus = document.getElementById('ai-batch-status');
    if (batchStatus) batchStatus.style.display = 'none';
    
    if (aiProgressListener) {
      chrome.runtime.onMessage.removeListener(aiProgressListener);
    }
    
    aiProgressListener = function(message) {
      if (message.type === 'AI_PROGRESS') {
        updateSidePanelProgress(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(aiProgressListener);
    
    chrome.runtime.sendMessage({ 
      type: 'CALL_AI_PROGRESS', 
      data: { productInfo: productInfo, forceFull: forceFull } 
    }, function(response) {
      if (aiProgressListener) {
        chrome.runtime.onMessage.removeListener(aiProgressListener);
        aiProgressListener = null;
      }
      document.getElementById('ai-loading').style.display = 'none';
      if (response && response.success) {
        aiResult = response.data;
        document.getElementById('ai-panel').style.display = 'block';
        renderAIResult(response.data);
        saveAIResultToCache(productInfo.url, aiResult);
      } else {
        showError(response && response.error ? response.error : 'AI分析失败');
        document.getElementById('empty-ai').style.display = 'block';
        document.getElementById('empty-ai').innerHTML = '<div class="empty-icon">❌</div><div class="empty-text">AI分析失败</div><div style="font-size:11px;color:#ef4444;margin-top:4px;">' + (response ? response.error : '未知错误') + '</div>';
      }
    });
  });
}

var totalBatches = 0;
var batchStates = [];

function updateSidePanelProgress(progress) {
  var fill = document.getElementById('ai-progress-fill');
  var text = document.getElementById('ai-progress-text');
  if (!fill || !text) return;
  
  switch (progress.type) {
    case 'text_start':
      text.textContent = '正在使用 ' + (progress.agent || '主Agent') + ' 进行文本分析...';
      fill.style.width = '75%';
      break;
    case 'text_failed':
      text.textContent = '⚠️ ' + (progress.agent || '主Agent') + ' 失败：' + (progress.error || '').substring(0, 60);
      fill.style.width = '50%';
      break;
    case 'fallback_start':
      text.textContent = '🔄 切换到降级Agent：' + progress.agent;
      break;
    case 'text_done':
      text.textContent = (progress.agent || '') + ' 文本分析完成';
      fill.style.width = '100%';
      break;
    case 'vision_start':
      text.textContent = '准备使用 ' + (progress.agent || '视觉Agent') + ' 分析图片（共' + progress.totalImages + '张）...';
      fill.style.width = '5%';
      totalBatches = Math.ceil(progress.totalImages / 3);
      batchStates = new Array(totalBatches).fill('pending');
      renderBatchStatus();
      break;
    case 'image_cached':
      text.textContent = '📦 从缓存加载 ' + progress.cached + '/' + progress.total + ' 张图片结果';
      fill.style.width = '5%';
      for (var ci = 0; ci < Math.ceil(progress.cached / 3); ci++) {
        if (ci < batchStates.length) {
          batchStates[ci] = 'done';
        }
      }
      renderBatchStatus();
      break;
    case 'image_analyzing':
      var largeTag = progress.isLarge ? ' ⚠️大图(' + progress.sizeKB + 'KB)' : '';
      text.textContent = '🔬 分析第 ' + progress.current + '/' + progress.total + ' 张图片' + largeTag + '（成功:' + progress.succeeded + ' 失败:' + progress.failed + '）';
      var analyzePercent = 5 + Math.round((progress.current / progress.total) * 65);
      fill.style.width = Math.min(analyzePercent, 70) + '%';
      break;
    case 'image_analyzed':
      text.textContent = '✅ 第 ' + progress.current + '/' + progress.total + ' 张完成（成功:' + progress.succeeded + ' 失败:' + progress.failed + '）';
      var donePercent = 5 + Math.round((progress.current / progress.total) * 65);
      fill.style.width = Math.min(donePercent, 70) + '%';
      var batchIdx2 = Math.floor((progress.current - 1) / 3);
      if (batchIdx2 >= 0 && batchIdx2 < batchStates.length && batchStates[batchIdx2] !== 'error') {
        batchStates[batchIdx2] = 'done';
        renderBatchStatus();
      }
      break;
    case 'image_download':
      text.textContent = '📥 下载第' + progress.batch + '/' + progress.totalBatches + '批图片: ' + progress.current + '/' + progress.total + '（成功:' + progress.downloaded + '）';
      var downloadPercent = 5 + Math.round((progress.batch - 1) / progress.totalBatches * 65) + Math.round((progress.current / progress.total) * (65 / progress.totalBatches));
      fill.style.width = Math.min(downloadPercent, 70) + '%';
      if (progress.batch > 0 && progress.batch <= batchStates.length && batchStates[progress.batch - 1] === 'pending') {
        batchStates[progress.batch - 1] = 'processing';
        renderBatchStatus();
      }
      break;
    case 'image_batch':
      var percent = 5 + Math.round((progress.current / progress.total) * 65);
      fill.style.width = percent + '%';
      for (var i = 0; i < progress.current - 1; i++) {
        if (i < batchStates.length && batchStates[i] !== 'error') {
          batchStates[i] = 'done';
        }
      }
      var curIdx = progress.current - 1;
      if (curIdx >= 0 && curIdx < batchStates.length && batchStates[curIdx] !== 'error') {
        batchStates[curIdx] = 'processing';
      }
      for (var j = progress.current; j < batchStates.length; j++) {
        if (batchStates[j] !== 'error') {
          batchStates[j] = 'pending';
        }
      }
      text.textContent = '图片分析第 ' + progress.current + '/' + progress.total + ' 批（成功:' + progress.succeeded + ' 失败:' + progress.failed + '）';
      renderBatchStatus();
      break;
    case 'image_batch_error':
      var errBatch = progress.current - 1;
      if (errBatch >= 0 && errBatch < batchStates.length) {
        batchStates[errBatch] = 'error';
      }
      text.textContent = '⚠️ 第' + progress.current + '批失败：' + progress.error.substring(0, 50);
      renderBatchStatus();
      break;
    case 'image_retry':
      text.textContent = '🔄 重试失败图片（成功:' + progress.retried + ' 仍失败:' + progress.stillFailed + '）';
      break;
    case 'done':
      fill.style.width = '70%';
      text.textContent = '图片分析完成（成功:' + progress.succeeded + '张 失败:' + progress.failed + '张）';
      break;
    default:
      text.textContent = '分析中...';
  }
}

function renderBatchStatus() {
  var container = document.getElementById('ai-batch-list');
  var statusBox = document.getElementById('ai-batch-status');
  if (!container || !statusBox) return;
  if (totalBatches === 0) {
    statusBox.style.display = 'none';
    return;
  }
  statusBox.style.display = 'block';
  var html = '';
  for (var i = 0; i < totalBatches; i++) {
    var state = batchStates[i] || 'pending';
    var bgColor = state === 'done' ? '#10b981' : (state === 'error' ? '#ef4444' : (state === 'processing' ? '#3b82f6' : '#d1d5db'));
    var titleText = state === 'done' ? '第' + (i + 1) + '批完成' : (state === 'error' ? '第' + (i + 1) + '批失败' : (state === 'processing' ? '第' + (i + 1) + '批处理中' : '第' + (i + 1) + '批等待中'));
    html += '<div class="batch-dot" data-batch="' + i + '" title="' + titleText + '" style="width:20px;height:20px;border-radius:4px;background:' + bgColor + ';display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:500;transition:background 0.3s;">' + (i + 1) + '</div>';
  }
  container.innerHTML = html;
}

function formatMarkdown(text) {
  var lines = text.split('\n');
  var html = '';
  lines.forEach(function(line) {
    if (line.startsWith('### ')) {
      html += '<h3>' + line.substring(4) + '</h3>';
    } else if (line.startsWith('## ')) {
      html += '<h2>' + line.substring(3) + '</h2>';
    } else if (line.startsWith('# ')) {
      html += '<h1>' + line.substring(2) + '</h1>';
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      html += '<p>' + line + '</p>';
    } else if (line.trim() === '') {
      html += '<br>';
    } else {
      html += '<p>' + line + '</p>';
    }
  });
  return html;
}

function exportExcel() {
  if (!productInfo) {
    showError('请先提取商品信息');
    return;
  }
  chrome.runtime.sendMessage({ type: 'EXPORT_EXCEL', data: { products: [productInfo] } }, function(response) {
    if (response && response.success) {
      var blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      var title = productInfo.title ? productInfo.title.substring(0, 20).replace(/[\\/:*?"<>|]/g, '_') : '商品信息';
      a.download = title + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      showError('导出失败');
    }
  });
}

function exportReport() {
  if (!aiResult) {
    showError('请先进行AI分析');
    return;
  }
  // 仅导出 AI 报告本身的内容（报告模板里已包含商品基本信息和参数）
  var reportContent = (aiResult && typeof aiResult === 'object' && aiResult.report) ? aiResult.report : aiResult;
  var blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  var title = productInfo && productInfo.title ? productInfo.title.substring(0, 20).replace(/[\\/:*?"<>|]/g, '_') : 'AI分析报告';
  a.download = title + '_AI分析报告.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showError('✅ AI报告已导出');
}

function exportProductInfo() {
  if (!productInfo) {
    showError('请先提取商品信息');
    return;
  }
  var content = '# 商品信息\n\n';
  content += '## 基础信息\n\n';
  content += '- 平台：' + (productInfo.platform === 'tmall' ? '天猫' : '京东') + '\n';
  content += '- 标题：' + (productInfo.title || '-') + '\n';
  content += '- 品牌：' + (productInfo.brand || '-') + '\n';
  content += '- 型号：' + (productInfo.model || '-') + '\n';
  content += '- 类目：' + (productInfo.category || '-') + '\n';
  content += '- 价格：' + (productInfo.price ? '¥' + productInfo.price : '-') + '\n';
  content += '- 销量：' + (productInfo.saleCount || '-') + '\n';
  content += '- 店铺：' + (productInfo.shopName || '-') + '\n';
  content += '- 商品链接：' + (productInfo.url || '-') + '\n';
  content += '- 采集时间：' + (productInfo.extractedAt || new Date().toISOString()) + '\n';
  content += '\n## 产品参数\n\n';
  if (productInfo.params && Object.keys(productInfo.params).length > 0) {
    var keys = Object.keys(productInfo.params);
    keys.forEach(function(key) {
      content += '- ' + key + '：' + productInfo.params[key] + '\n';
    });
  } else {
    content += '暂无参数信息\n';
  }
  var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  var title = (productInfo.title || '商品信息').substring(0, 20).replace(/[\\/:*?"<>|]/g, '_');
  a.download = title + '_商品信息.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showError('✅ 商品信息已导出');
}

function loadSettings() {
  chrome.runtime.sendMessage({ type: 'GET_AGENTS' }, function(resp) {
    if (resp && resp.success) {
      aiAgents = resp.data;
      renderAgentList();
    }
  });
  chrome.storage.local.get(['cacheHours'], function(result) {
    if (result.cacheHours) {
      cacheHours = result.cacheHours;
      var el = document.getElementById('cache-hours');
      if (el) el.value = cacheHours;
    }
  });
}

function renderAgentList() {
  var list = document.getElementById('agent-list');
  if (!list) return;
  if (aiAgents.length === 0) {
    list.innerHTML = '<div style="color:#9ca3af;text-align:center;padding:12px;">暂无Agent，请添加</div>';
    return;
  }
  var html = '';
  aiAgents.forEach(function(agent) {
    var typeColor = agent.type === 'main' ? '#3b82f6' : (agent.type === 'vision' ? '#8b5cf6' : (agent.type === 'fallback' ? '#f59e0b' : '#6b7280'));
    var hasKey = agent.apiKey && agent.apiKey.length > 0;
    html += '<div style="background:#f9fafb;border-radius:6px;padding:10px;margin-bottom:8px;border:1px solid #e5e7eb;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
    html += '<div style="display:flex;align-items:center;gap:6px;flex:1;">';
    html += '<label style="display:flex;align-items:center;cursor:pointer;"><input type="checkbox" data-action="toggle-agent" data-id="' + agent.id + '" ' + (agent.enabled ? 'checked' : '') + ' style="margin-right:4px;"></label>';
    html += '<span style="background:' + typeColor + ';color:white;padding:1px 6px;border-radius:4px;font-size:10px;">' + AGENT_TYPE_NAMES[agent.type] + '</span>';
    html += '<span style="font-weight:500;font-size:12px;">' + agent.name + '</span>';
    if (!hasKey) html += '<span style="color:#ef4444;font-size:10px;">⚠️</span>';
    html += '</div>';
    html += '<div><button class="mini-btn mini-btn-blue" data-action="edit-agent" data-id="' + agent.id + '">编辑</button> ';
    html += '<button class="mini-btn mini-btn-red" data-action="delete-agent" data-id="' + agent.id + '">删除</button></div>';
    html += '</div>';
    html += '<div style="font-size:11px;color:#6b7280;margin-top:4px;">' + PROVIDER_NAMES[agent.provider] + ' · ' + agent.model + '</div>';
    html += '</div>';
  });
  list.innerHTML = html;
  
  list.querySelectorAll('[data-action="toggle-agent"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      chrome.runtime.sendMessage({ type: 'TOGGLE_AGENT', data: { id: this.dataset.id, enabled: this.checked } }, function(resp) {
        if (resp && resp.success) aiAgents = resp.data;
      });
    });
  });
  list.querySelectorAll('[data-action="edit-agent"]').forEach(function(btn) {
    btn.addEventListener('click', function() { showAgentEditor(this.dataset.id); });
  });
  list.querySelectorAll('[data-action="delete-agent"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var agent = aiAgents.find(function(a) { return a.id === btn.dataset.id; });
      if (!agent || !confirm('确定删除Agent「' + agent.name + '」吗？')) return;
      chrome.runtime.sendMessage({ type: 'DELETE_AGENT', data: { id: btn.dataset.id } }, function(resp) {
        if (resp && resp.success) { aiAgents = resp.data; renderAgentList(); }
      });
    });
  });
}

function showAgentEditor(agentId) {
  var agent = agentId ? aiAgents.find(function(a) { return a.id === agentId; }) : null;
  editingAgentId = agentId;
  var editor = document.getElementById('agent-editor');
  editor.style.display = 'block';
  
  var currentProvider = agent ? agent.provider : 'deepseek';
  var currentType = agent ? agent.type : 'custom';
  var isVisionType = currentType === 'vision';
  var cfg = PROVIDER_CONFIG[currentProvider];
  var modelList = isVisionType ? (cfg.visionModels.length > 0 ? cfg.visionModels : cfg.models) : cfg.models;
  var currentModel = agent ? agent.model : modelList[0];
  
  var html = '<div class="settings-section"><div class="settings-title">' + (agent ? '编辑Agent' : '添加Agent') + '</div>';
  html += '<div class="form-group"><label class="form-label">名称</label><input type="text" class="form-input" id="agent-name" value="' + (agent ? agent.name : '') + '" placeholder="如：主分析模型"></div>';
  html += '<div class="form-group"><label class="form-label">类型</label><select class="form-input" id="agent-type">';
  ['main', 'vision', 'fallback', 'custom'].forEach(function(t) {
    html += '<option value="' + t + '"' + (currentType === t ? ' selected' : '') + '>' + AGENT_TYPE_NAMES[t] + '</option>';
  });
  html += '</select></div>';
  html += '<div class="form-group"><label class="form-label">服务商</label><select class="form-input" id="agent-provider">';
  Object.keys(PROVIDER_CONFIG).forEach(function(p) {
    html += '<option value="' + p + '"' + (currentProvider === p ? ' selected' : '') + '>' + PROVIDER_CONFIG[p].name + '</option>';
  });
  html += '</select></div>';
  html += '<div class="form-group"><label class="form-label">API Key</label><input type="password" class="form-input" id="agent-apikey" value="' + (agent ? agent.apiKey : '') + '"></div>';
  html += '<div class="form-group"><label class="form-label">模型</label>';
  html += '<input type="text" class="form-input" id="agent-model" list="model-list" value="' + currentModel + '" placeholder="选择或输入模型ID">';
  html += '<datalist id="model-list">';
  modelList.forEach(function(m) {
    html += '<option value="' + m + '">';
  });
  html += '</datalist>';
  html += '<div id="vision-hint" style="display:' + (currentType === 'vision' ? 'block' : 'none') + ';font-size:11px;color:#f59e0b;margin-top:4px;">⚠️ 多模态Agent必须选择支持视觉的模型（带 vl/vision 字样）</div>';
  html += '</div>';
  html += '<div class="form-group"><label class="form-label">端点</label><input type="text" class="form-input" id="agent-endpoint" value="' + (agent ? agent.endpoint : cfg.endpoint) + '"></div>';
  html += '<div style="display:flex;gap:6px;margin-top:8px;">';
  html += '<button class="btn btn-primary" id="btn-save-agent" style="flex:1;">保存</button>';
  html += '<button class="btn btn-gray" id="btn-cancel-agent" style="flex:1;">取消</button>';
  html += '</div></div>';
  editor.innerHTML = html;
  
  function refreshModelList() {
    var p = document.getElementById('agent-provider').value;
    var t = document.getElementById('agent-type').value;
    var c = PROVIDER_CONFIG[p];
    var list = t === 'vision' ? (c.visionModels.length > 0 ? c.visionModels : c.models) : c.models;
    var dl = document.getElementById('model-list');
    dl.innerHTML = '';
    list.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m;
      dl.appendChild(opt);
    });
    var modelInput = document.getElementById('agent-model');
    if (list.indexOf(modelInput.value) < 0) {
      modelInput.value = list[0];
    }
    document.getElementById('agent-endpoint').value = c.endpoint;
    var hint = document.getElementById('vision-hint');
    if (hint) {
      if (t === 'vision') {
        hint.style.display = 'block';
        if (c.visionModels.length === 0) {
          hint.textContent = '⚠️ 该服务商暂无可选视觉模型，请手动输入支持视觉的模型ID';
        } else {
          hint.textContent = '⚠️ 多模态Agent必须选择支持视觉的模型（带 vl/vision 字样）';
        }
      } else {
        hint.style.display = 'none';
      }
    }
  }
  
  document.getElementById('agent-provider').addEventListener('change', refreshModelList);
  document.getElementById('agent-type').addEventListener('change', refreshModelList);
  
  document.getElementById('btn-save-agent').addEventListener('click', function() {
    var newAgent = {
      id: editingAgentId || ('agent_' + Date.now()),
      name: document.getElementById('agent-name').value || '未命名Agent',
      type: document.getElementById('agent-type').value,
      provider: document.getElementById('agent-provider').value,
      apiKey: document.getElementById('agent-apikey').value,
      model: document.getElementById('agent-model').value,
      endpoint: document.getElementById('agent-endpoint').value,
      enabled: true,
      isVision: document.getElementById('agent-type').value === 'vision'
    };
    chrome.runtime.sendMessage({ type: 'SAVE_AGENT', data: { agent: newAgent } }, function(resp) {
      if (resp && resp.success) {
        aiAgents = resp.data;
        renderAgentList();
        editor.style.display = 'none';
        showError('Agent已保存');
      }
    });
  });
  
  document.getElementById('btn-cancel-agent').addEventListener('click', function() {
    editor.style.display = 'none';
  });
}

function loadProjects() {
  chrome.storage.local.get(['projects'], function(result) {
    projects = result.projects || [];
    renderProjects();
  });
}

function renderProjects() {
  var list = document.getElementById('project-list');
  if (projects.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-text">暂无项目</div></div>';
    return;
  }
  var html = '';
  projects.forEach(function(p) {
    html += '<div class="project-item">';
    html += '<div class="project-header">';
    html += '<span class="project-name">📁 ' + p.name + ' (' + p.products.length + '个)</span>';
    html += '<div>';
    html += '<button class="mini-btn mini-btn-blue" data-action="export-project" data-id="' + p.id + '">导出</button> ';
    html += '<button class="mini-btn mini-btn-red" data-action="delete-project" data-id="' + p.id + '">删除</button>';
    html += '</div></div>';
    if (p.products.length > 0) {
      p.products.forEach(function(item) {
        html += '<div class="project-product"><span class="tag ' + (item.type === 'mine' ? 'tag-mine' : 'tag-competitor') + '">' + (item.type === 'mine' ? '我的' : '竞品') + '</span>' + (item.productInfo.title || '').substring(0, 25) + '...</div>';
      });
    }
    html += '<div class="project-add-buttons">';
    html += '<button class="add-btn add-mine" data-action="add-mine" data-id="' + p.id + '">➕ 添加为我的产品</button>';
    html += '<button class="add-btn add-competitor" data-action="add-competitor" data-id="' + p.id + '">➕ 添加为竞品</button>';
    html += '</div>';
    html += '</div>';
  });
  list.innerHTML = html;

  document.querySelectorAll('[data-action="delete-project"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var proj = projects.find(function(p) { return p.id === id; });
      if (!proj || !confirm('确定删除项目「' + proj.name + '」吗？')) return;
      projects = projects.filter(function(p) { return p.id !== id; });
      chrome.storage.local.set({ projects: projects }, function() {
        renderProjects();
      });
    });
  });

  document.querySelectorAll('[data-action="export-project"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var proj = projects.find(function(p) { return p.id === id; });
      if (!proj) return;
      var products = proj.products.map(function(p) {
        var info = Object.assign({}, p.productInfo);
        info.type = p.type;
        return info;
      });
      chrome.runtime.sendMessage({ type: 'EXPORT_EXCEL', data: { products: products } }, function(response) {
        if (response && response.success) {
          var blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = proj.name.replace(/[\\/:*?"<>|]/g, '_') + '.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          showError('导出失败');
        }
      });
    });
  });

  document.querySelectorAll('[data-action="add-mine"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      addToProject(this.dataset.id, 'mine');
    });
  });

  document.querySelectorAll('[data-action="add-competitor"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      addToProject(this.dataset.id, 'competitor');
    });
  });
}

function addToProject(projectId, type) {
  if (!productInfo) {
    showError('请先提取商品信息');
    return;
  }
  var proj = projects.find(function(p) { return p.id === projectId; });
  if (!proj) return;
  var exists = proj.products.find(function(p) { return p.productInfo && p.productInfo.url === productInfo.url; });
  if (exists) {
    showError('该商品已在项目中');
    return;
  }
  proj.products.push({ type: type, productInfo: productInfo, addedAt: Date.now() });
  chrome.storage.local.set({ projects: projects }, function() {
    renderProjects();
    showError('已添加到项目');
  });
}

function createProject() {
  var name = document.getElementById('new-project-name').value.trim();
  if (!name) return;
  var newProj = { id: Date.now().toString(), name: name, products: [] };
  projects.push(newProj);
  chrome.storage.local.set({ projects: projects }, function() {
    document.getElementById('new-project-name').value = '';
    renderProjects();
  });
}

function init() {
  loadSettings();
  loadProjects();
  
  document.getElementById('btn-extract').addEventListener('click', extractInfo);
  document.getElementById('btn-ai').addEventListener('click', function() { callAI(false); });
  document.getElementById('btn-excel').addEventListener('click', exportExcel);
  document.getElementById('btn-report').addEventListener('click', exportReport);
  document.getElementById('btn-export-info').addEventListener('click', exportProductInfo);
  document.getElementById('btn-help').addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
  });
  document.getElementById('btn-add-agent').addEventListener('click', function() {
    showAgentEditor(null);
  });
  document.getElementById('btn-create-project').addEventListener('click', createProject);
  document.getElementById('btn-clear-cache').addEventListener('click', function() {
    if (!confirm('确定清除所有缓存数据吗？')) return;
    clearAllCache(function(count) {
      showError('已清除 ' + count + ' 条缓存');
    });
  });
  document.getElementById('cache-hours').addEventListener('change', function() {
    cacheHours = parseInt(this.value) || 24;
    chrome.storage.local.set({ cacheHours: cacheHours });
  });

  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      switchTab(this.dataset.tab);
    });
  });

  tryLoadCache();

  chrome.tabs.onActivated.addListener(function() {
    tryLoadCache();
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.active) {
      tryLoadCache();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
