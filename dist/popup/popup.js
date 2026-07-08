var productInfo = null;
var aiResult = null;
var aiAgents = [];
var projects = [];
var cacheHours = 24;
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

function showError(msg) {
  var bar = document.getElementById('error-bar');
  bar.textContent = '❌ ' + msg;
  bar.style.display = 'block';
  setTimeout(function() { bar.style.display = 'none'; }, 5000);
}

function setLoading(isLoading) {
  document.getElementById('btn-extract').textContent = isLoading ? '处理中...' : '提取信息';
  document.getElementById('btn-extract').disabled = isLoading;
  document.getElementById('btn-ai').disabled = isLoading || !productInfo;
}

function renderBasicInfo(info) {
  var html = '<div class="info-row"><span class="info-label">标题：</span><span class="info-value">' + (info.title || '未提取') + '</span></div>' +
             '<div class="info-row"><span class="info-label">品牌：</span><span class="info-value">' + (info.brand || '未提取') + '</span></div>' +
             '<div class="info-row"><span class="info-label">价格：</span><span class="info-value">' + (info.price || '未提取') + '</span></div>' +
             '<div class="info-row"><span class="info-label">销量：</span><span class="info-value">' + (info.saleCount || '未提取') + '</span></div>' +
             '<div class="info-row"><span class="info-label">店铺：</span><span class="info-value">' + (info.shopName || '未提取') + '</span></div>' +
             '<div class="info-row"><span class="info-label">型号：</span><span class="info-value">' + (info.model || '未提取') + '</span></div>' +
             '<div class="info-row"><span class="info-label">链接：</span><span class="info-value"><a href="' + info.url + '" target="_blank">' + info.url + '</a></span></div>';
  document.getElementById('tab-basic').innerHTML = html;
}

function renderParams(params) {
  var html = '';
  var keys = Object.keys(params);
  if (keys.length === 0) {
    html = '<div class="empty-state"><div class="empty-icon">📭</div><div>未提取到参数</div></div>';
  } else {
    keys.forEach(function(key) {
      html += '<div class="param-item"><span style="color:#6b7280;">' + key + '：</span><span>' + params[key] + '</span></div>';
    });
  }
  document.getElementById('tab-params').innerHTML = html;
}

function renderImages(main, detail) {
  var allImages = main.concat(detail);
  var html = '';
  if (allImages.length === 0) {
    html = '<div class="empty-state"><div class="empty-icon">🖼️</div><div>未提取到图片</div></div>';
  } else {
    html = '<div style="margin-bottom:8px;"><button class="btn btn-secondary" onclick="copyAllImages()">复制全部图片地址</button></div><div class="image-grid">';
    allImages.forEach(function(url) {
      html += '<div class="image-item"><img src="' + url + '" alt="" loading="lazy"><div class="image-overlay"><button class="copy-btn" onclick="copyImageUrl(\'' + url + '\')">复制地址</button></div></div>';
    });
    html += '</div>';
  }
  document.getElementById('tab-images').innerHTML = html;
}

function renderAIReport(result) {
  if (!result) {
    document.getElementById('tab-ai').innerHTML = '<div class="empty-state"><div class="empty-icon">🤖</div><div>点击"AI分析"按钮</div><div style="font-size:12px;margin-top:4px;">生成专业分析报告</div></div>';
    return;
  }
  var report = (result.report || result)
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
  var header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px;background:#f3f4f6;border-radius:6px;gap:6px;">' +
    '<span style="font-size:12px;color:#6b7280;">📋 分析报告</span>' +
    '<div style="display:flex;gap:4px;">' +
    '<button id="btn-regenerate" style="background:#3b82f6;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">🔄 续传分析</button>' +
    '<button id="btn-full-regenerate" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">🔄🔄 完全重分析</button>' +
    '</div>' +
    '</div>';
  document.getElementById('tab-ai').innerHTML = header + '<div class="report-container">' + report + '</div>';
  
  var regenBtn = document.getElementById('btn-regenerate');
  if (regenBtn) {
    regenBtn.addEventListener('click', function() {
      if (!productInfo) { showError('请先提取商品信息'); return; }
      if (!confirm('确定继续分析？已分析过的图片将跳过，仅分析未完成的图片。')) return;
      chrome.storage.local.remove(getAICacheKey(productInfo.url), function() {
        startAIAnalysis(false);
      });
    });
  }
  var fullRegenBtn = document.getElementById('btn-full-regenerate');
  if (fullRegenBtn) {
    fullRegenBtn.addEventListener('click', function() {
      if (!productInfo) { showError('请先提取商品信息'); return; }
      if (!confirm('确定完全重新分析？将清除所有图片缓存，全部重新分析。')) return;
      chrome.storage.local.remove(getAICacheKey(productInfo.url), function() {
        startAIAnalysis(true);
      });
    });
  }
}

function renderSettings() {
  var html = '<div class="setting-section"><div style="font-weight:600;margin-bottom:8px;">🤖 AI Agent 管理</div>';
  
  if (aiAgents.length === 0) {
    html += '<div style="color:#9ca3af;text-align:center;padding:16px;">暂无Agent，请添加</div>';
  } else {
    aiAgents.forEach(function(agent) {
      var typeColor = agent.type === 'main' ? '#3b82f6' : (agent.type === 'vision' ? '#8b5cf6' : (agent.type === 'fallback' ? '#f59e0b' : '#6b7280'));
      var hasKey = agent.apiKey && agent.apiKey.length > 0;
      html += '<div style="background:#f9fafb;border-radius:8px;padding:10px;margin-bottom:8px;border:1px solid #e5e7eb;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
      html += '<div style="display:flex;align-items:center;gap:6px;">';
      html += '<label style="display:flex;align-items:center;cursor:pointer;"><input type="checkbox" data-action="toggle-agent" data-id="' + agent.id + '" ' + (agent.enabled ? 'checked' : '') + ' style="margin-right:4px;"></label>';
      html += '<span style="background:' + typeColor + ';color:white;padding:1px 6px;border-radius:4px;font-size:10px;">' + AGENT_TYPE_NAMES[agent.type] + '</span>';
      html += '<span style="font-weight:500;font-size:13px;">' + agent.name + '</span>';
      if (!hasKey) {
        html += '<span style="color:#ef4444;font-size:10px;">⚠️未配置Key</span>';
      }
      html += '</div>';
      html += '<div><button class="btn btn-secondary btn-sm" data-action="edit-agent" data-id="' + agent.id + '">编辑</button> ';
      html += '<button class="btn btn-secondary btn-sm" data-action="delete-agent" data-id="' + agent.id + '" style="color:#ef4444;">删除</button></div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#6b7280;margin-top:4px;">' + PROVIDER_NAMES[agent.provider] + ' · ' + agent.model + '</div>';
      html += '</div>';
    });
  }
  
  html += '<button class="btn btn-primary" id="btn-add-agent" style="width:100%;margin-top:8px;">➕ 添加Agent</button>';
  html += '</div>';
  
  html += '<div class="setting-section"><div>缓存有效期（小时）</div><input class="setting-input" type="number" id="cache-hours" value="' + cacheHours + '" min="1" max="168"></div>';
  html += '<div class="setting-section"><button class="btn btn-secondary" id="btn-clear-cache" style="width:100%;">🗑️ 清除所有缓存</button></div>';
  html += '<div class="setting-note"><div>使用说明</div><ul>';
  html += '<li><b>主分析Agent</b>：负责文本分析和报告生成</li>';
  html += '<li><b>多模态Agent</b>：负责图片内容分析（需启用）</li>';
  html += '<li><b>降级Agent</b>：主Agent失效时自动切换</li>';
  html += '<li><b>自定义Agent</b>：可添加任意用途的Agent</li>';
  html += '<li>每个Agent可独立启用/停用</li>';
  html += '<li>图片分析每批最多5张图</li>';
  html += '</ul></div>';
  
  document.getElementById('settings-panel').innerHTML = html;
  
  document.getElementById('btn-add-agent').addEventListener('click', function() {
    showAgentEditor(null);
  });
  
  document.querySelectorAll('[data-action="toggle-agent"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      var id = this.dataset.id;
      var enabled = this.checked;
      chrome.runtime.sendMessage({ type: 'TOGGLE_AGENT', data: { id: id, enabled: enabled } }, function(resp) {
        if (resp && resp.success) {
          aiAgents = resp.data;
        }
      });
    });
  });
  
  document.querySelectorAll('[data-action="edit-agent"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      showAgentEditor(this.dataset.id);
    });
  });
  
  document.querySelectorAll('[data-action="delete-agent"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var agent = aiAgents.find(function(a) { return a.id === id; });
      if (!agent || !confirm('确定删除Agent「' + agent.name + '」吗？')) return;
      chrome.runtime.sendMessage({ type: 'DELETE_AGENT', data: { id: id } }, function(resp) {
        if (resp && resp.success) {
          aiAgents = resp.data;
          renderSettings();
        }
      });
    });
  });
  
  document.getElementById('cache-hours').addEventListener('change', function() {
    cacheHours = parseInt(this.value) || 24;
    chrome.storage.local.set({ cacheHours: cacheHours });
  });
  
  document.getElementById('btn-clear-cache').addEventListener('click', function() {
    if (!confirm('确定清除所有缓存数据吗？')) return;
    chrome.storage.local.get(null, function(items) {
      var keysToRemove = [];
      Object.keys(items).forEach(function(key) {
        if (key.indexOf(CACHE_PREFIX) === 0) {
          keysToRemove.push(key);
        }
      });
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, function() {
          alert('已清除 ' + keysToRemove.length + ' 条缓存');
        });
      } else {
        alert('暂无缓存数据');
      }
    });
  });
}

function showAgentEditor(agentId) {
  var agent = agentId ? aiAgents.find(function(a) { return a.id === agentId; }) : null;
  editingAgentId = agentId;
  
  var currentProvider = agent ? agent.provider : 'deepseek';
  var currentType = agent ? agent.type : 'custom';
  var isVisionType = currentType === 'vision';
  var cfg = PROVIDER_CONFIG[currentProvider];
  var modelList = isVisionType ? (cfg.visionModels.length > 0 ? cfg.visionModels : cfg.models) : cfg.models;
  var currentModel = agent ? agent.model : modelList[0];
  
  var html = '<div class="setting-section">';
  html += '<div style="font-weight:600;margin-bottom:8px;">' + (agent ? '编辑Agent' : '添加Agent') + '</div>';
  html += '<div class="setting-section"><div>名称</div><input class="setting-input" id="agent-name" value="' + (agent ? agent.name : '') + '" placeholder="如：主分析模型"></div>';
  html += '<div class="setting-section"><div>类型</div><select class="setting-input" id="agent-type">';
  ['main', 'vision', 'fallback', 'custom'].forEach(function(t) {
    html += '<option value="' + t + '"' + (currentType === t ? ' selected' : '') + '>' + AGENT_TYPE_NAMES[t] + '</option>';
  });
  html += '</select></div>';
  html += '<div class="setting-section"><div>服务商</div><select class="setting-input" id="agent-provider">';
  Object.keys(PROVIDER_CONFIG).forEach(function(p) {
    html += '<option value="' + p + '"' + (currentProvider === p ? ' selected' : '') + '>' + PROVIDER_CONFIG[p].name + '</option>';
  });
  html += '</select></div>';
  html += '<div class="setting-section"><div>API Key</div><input class="setting-input" type="password" id="agent-apikey" value="' + (agent ? agent.apiKey : '') + '"></div>';
  html += '<div class="setting-section"><div>模型</div>';
  html += '<input class="setting-input" id="agent-model" list="model-list" value="' + currentModel + '" placeholder="选择或输入模型ID">';
  html += '<datalist id="model-list">';
  modelList.forEach(function(m) {
    html += '<option value="' + m + '">';
  });
  html += '</datalist>';
  html += '<div id="vision-hint" style="display:' + (currentType === 'vision' ? 'block' : 'none') + ';font-size:11px;color:#f59e0b;margin-top:4px;">⚠️ 多模态Agent必须选择支持视觉的模型（带 vl/vision 字样）</div>';
  html += '</div>';
  html += '<div class="setting-section"><div>端点</div><input class="setting-input" id="agent-endpoint" value="' + (agent ? agent.endpoint : cfg.endpoint) + '"></div>';
  html += '<div style="display:flex;gap:8px;margin-top:8px;">';
  html += '<button class="btn btn-primary" id="btn-save-agent" style="flex:1;">保存</button>';
  html += '<button class="btn btn-secondary" id="btn-cancel-agent" style="flex:1;">取消</button>';
  html += '</div></div>';
  
  document.getElementById('settings-panel').innerHTML = html;
  
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
        renderSettings();
        showError('Agent已保存');
      }
    });
  });
  
  document.getElementById('btn-cancel-agent').addEventListener('click', function() {
    renderSettings();
  });
}

function renderProjects() {
  var html = '<div class="project-create"><input type="text" class="project-input" id="new-project-name" placeholder="新建项目名称"><button class="btn btn-green" id="btn-create-project">创建</button></div>';
  if (projects.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">📁</div><div>暂无项目</div><div style="font-size:12px;margin-top:4px;">创建项目来管理商品</div></div>';
  } else {
    projects.forEach(function(p) {
      html += '<div class="project-item"><div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-weight:500;">📁 ' + p.name + ' (' + p.products.length + '个商品)</div><div><button class="mini-btn-green" data-action="export" data-id="' + p.id + '">导出</button> <button class="mini-btn-red" data-action="delete" data-id="' + p.id + '">删除</button></div></div>';
      if (p.products.length > 0) {
        html += '<div style="margin-top:8px;">';
        p.products.forEach(function(item) {
          html += '<div class="product-item"><span class="tag ' + (item.type === 'mine' ? 'tag-mine' : 'tag-competitor') + '">' + (item.type === 'mine' ? '我的产品' : '竞品') + '</span>' + item.productInfo.title.substring(0, 30) + '...</div>';
        });
        html += '</div>';
      }
      html += '<div class="project-add-buttons"><button class="add-mine" data-action="add-mine" data-id="' + p.id + '">➕ 添加为我的产品</button><button class="add-competitor" data-action="add-competitor" data-id="' + p.id + '">➕ 添加为竞品</button></div></div>';
    });
  }
  document.getElementById('project-panel').innerHTML = html;
  
  var createBtn = document.getElementById('btn-create-project');
  if (createBtn) {
    createBtn.addEventListener('click', function() {
      var name = document.getElementById('new-project-name').value.trim();
      if (!name) return;
      var newProject = { id: Date.now().toString(), name: name, products: [] };
      projects.push(newProject);
      chrome.storage.local.set({ projects: projects });
      document.getElementById('new-project-name').value = '';
      renderProjects();
    });
  }
  
  document.querySelectorAll('[data-action="delete"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var project = projects.find(function(p) { return p.id === id; });
      if (!project || !confirm('确定删除项目「' + project.name + '」吗？')) return;
      projects = projects.filter(function(p) { return p.id !== id; });
      chrome.storage.local.set({ projects: projects });
      renderProjects();
    });
  });
  
  document.querySelectorAll('[data-action="export"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.dataset.id;
      var project = projects.find(function(p) { return p.id === id; });
      if (!project) return;
      var products = project.products.map(function(p) {
        var info = Object.assign({}, p.productInfo);
        info.type = p.type;
        return info;
      });
      chrome.runtime.sendMessage({ type: 'EXPORT_EXCEL', data: { products: products } }, function(response) {
        if (response && response.success) {
          var blob = new Blob([response.data], { type: 'text/csv' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = project.name.replace(/[\\/:*?"<>|]/g, '_') + '.csv';
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
  if (!productInfo) { showError('请先提取商品信息'); return; }
  var project = projects.find(function(p) { return p.id === projectId; });
  if (project) {
    var exists = project.products.find(function(p) { return p.productInfo.url === productInfo.url; });
    if (!exists) {
      project.products.push({ id: Date.now().toString(), productInfo: productInfo, type: type });
      chrome.storage.local.set({ projects: projects });
    }
    renderProjects();
  }
}

window.copyAllImages = function() {
  if (!productInfo) return;
  navigator.clipboard.writeText(productInfo.mainImages.concat(productInfo.detailImages).join('\n'));
  alert('已复制所有图片地址');
};

window.copyImageUrl = function(url) {
  navigator.clipboard.writeText(url);
  alert('已复制图片地址');
};

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(t) { t.classList.remove('active'); });
  event.target.classList.add('active');
  document.getElementById('tab-basic').style.display = 'none';
  document.getElementById('tab-params').style.display = 'none';
  document.getElementById('tab-images').style.display = 'none';
  document.getElementById('tab-ai').style.display = 'none';
  document.getElementById('tab-' + tab).style.display = 'block';
}

function handleExtractSuccess(data) {
  productInfo = data;
  saveToCache(data.url, data);
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
  document.getElementById('project-panel').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'none';
  renderBasicInfo(data);
  renderParams(data.params);
  renderImages(data.mainImages, data.detailImages);
  renderAIReport(null);
  document.getElementById('btn-ai').disabled = false;
  document.getElementById('btn-export-excel').disabled = false;
}

document.getElementById('btn-extract').addEventListener('click', function() {
  setLoading(true);
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0]) { showError('未找到标签页'); setLoading(false); return; }
    chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_INFO' }, function(response) {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] }, function() {
          if (chrome.runtime.lastError) { showError('注入失败: ' + chrome.runtime.lastError.message); setLoading(false); return; }
          setTimeout(function() {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_INFO' }, function(resp) {
              if (chrome.runtime.lastError) { showError('提取失败: ' + chrome.runtime.lastError.message); }
              else if (resp && resp.success) { handleExtractSuccess(resp.data); }
              else { showError('提取失败'); }
              setLoading(false);
            });
          }, 500);
        });
      } else if (response && response.success) {
        handleExtractSuccess(response.data);
        setLoading(false);
      } else {
        showError('提取失败');
        setLoading(false);
      }
    });
  });
});

var aiProgressListener = null;

function startAIAnalysis(forceFull) {
  var mainAgent = aiAgents.find(function(a) { return a.type === 'main' && a.enabled && a.apiKey; });
  if (!mainAgent) { showError('请先在设置中配置并启用主分析Agent'); return; }
  if (!productInfo) { showError('请先提取商品信息'); return; }
  
  setLoading(true);
  document.querySelector('[data-tab="ai"]').click();
  
  var aiTab = document.getElementById('tab-ai');
  aiTab.innerHTML = '<div style="padding:20px;text-align:center;"><div style="margin-bottom:12px;font-weight:500;">🤖 AI分析中，请稍候...</div><div id="ai-progress-bar" style="width:100%;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-bottom:8px;"><div id="ai-progress-fill" style="height:100%;background:linear-gradient(90deg,#667eea,#764ba2);width:0%;transition:width 0.3s;"></div></div><div id="ai-progress-text" style="font-size:12px;color:#6b7280;">正在初始化...</div><div id="ai-batch-status" style="margin-top:12px;text-align:left;display:none;"><div style="font-size:11px;color:#6b7280;margin-bottom:6px;">图片批次进度：</div><div id="ai-batch-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div></div></div>';
  
  if (aiProgressListener) {
    chrome.runtime.onMessage.removeListener(aiProgressListener);
  }
  
  aiProgressListener = function(message) {
    if (message.type === 'AI_PROGRESS') {
      updateAIProgress(message.data);
    }
  };
  chrome.runtime.onMessage.addListener(aiProgressListener);
  
  chrome.runtime.sendMessage({ type: 'CALL_AI_PROGRESS', data: { productInfo: productInfo, forceFull: forceFull } }, function(response) {
    if (aiProgressListener) {
      chrome.runtime.onMessage.removeListener(aiProgressListener);
      aiProgressListener = null;
    }
    setLoading(false);
    if (response && response.success) {
      aiResult = response.data;
      renderAIReport(aiResult);
      document.getElementById('btn-export-md').disabled = false;
      saveAIResultToCache(productInfo.url, aiResult);
    } else {
      showError(response ? response.error : 'AI调用失败');
      aiTab.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444;"><div style="font-size:32px;margin-bottom:8px;">❌</div><div>AI分析失败</div><div style="font-size:12px;margin-top:4px;">' + (response ? response.error : '未知错误') + '</div></div>';
    }
  });
}

document.getElementById('btn-ai').addEventListener('click', function() {
  var mainAgent = aiAgents.find(function(a) { return a.type === 'main' && a.enabled && a.apiKey; });
  if (!mainAgent) { showError('请先在设置中配置并启用主分析Agent'); return; }
  if (!productInfo) { showError('请先提取商品信息'); return; }
  
  setLoading(true);
  document.querySelector('[data-tab="ai"]').click();
  
  getAIResultFromCache(productInfo.url, function(cachedResult, cacheTime) {
    if (cachedResult) {
      setLoading(false);
      aiResult = cachedResult;
      renderAIReport(aiResult);
      document.getElementById('btn-export-md').disabled = false;
      
      var ageMinutes = Math.floor((Date.now() - cacheTime) / 60000);
      var ageText = ageMinutes < 60 ? ageMinutes + '分钟前缓存' : Math.floor(ageMinutes / 60) + '小时前缓存';
      showError('✅ 已加载缓存（' + ageText + '）');
      return;
    }
    
    startAIAnalysis(false);
  });
});

var popupTotalBatches = 0;
var popupBatchStates = [];

function updateAIProgress(progress) {
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
      popupTotalBatches = Math.ceil(progress.totalImages / 3);
      popupBatchStates = new Array(popupTotalBatches).fill('pending');
      renderPopupBatchStatus();
      break;
    case 'image_cached':
      text.textContent = '📦 从缓存加载 ' + progress.cached + '/' + progress.total + ' 张图片结果';
      fill.style.width = '5%';
      for (var ci = 0; ci < Math.ceil(progress.cached / 3); ci++) {
        if (ci < popupBatchStates.length) {
          popupBatchStates[ci] = 'done';
        }
      }
      renderPopupBatchStatus();
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
      if (batchIdx2 >= 0 && batchIdx2 < popupBatchStates.length && popupBatchStates[batchIdx2] !== 'error') {
        popupBatchStates[batchIdx2] = 'done';
        renderPopupBatchStatus();
      }
      break;
    case 'image_download':
      text.textContent = '📥 下载第' + progress.batch + '/' + progress.totalBatches + '批图片: ' + progress.current + '/' + progress.total + '（成功:' + progress.downloaded + '）';
      var downloadPercent = 5 + Math.round((progress.batch - 1) / progress.totalBatches * 65) + Math.round((progress.current / progress.total) * (65 / progress.totalBatches));
      fill.style.width = Math.min(downloadPercent, 70) + '%';
      if (progress.batch > 0 && progress.batch <= popupBatchStates.length && popupBatchStates[progress.batch - 1] === 'pending') {
        popupBatchStates[progress.batch - 1] = 'processing';
        renderPopupBatchStatus();
      }
      break;
    case 'image_batch':
      var percent = 5 + Math.round((progress.current / progress.total) * 65);
      fill.style.width = percent + '%';
      for (var i = 0; i < progress.current - 1; i++) {
        if (i < popupBatchStates.length && popupBatchStates[i] !== 'error') {
          popupBatchStates[i] = 'done';
        }
      }
      var curIdx = progress.current - 1;
      if (curIdx >= 0 && curIdx < popupBatchStates.length && popupBatchStates[curIdx] !== 'error') {
        popupBatchStates[curIdx] = 'processing';
      }
      for (var j = progress.current; j < popupBatchStates.length; j++) {
        if (popupBatchStates[j] !== 'error') {
          popupBatchStates[j] = 'pending';
        }
      }
      text.textContent = '图片分析第 ' + progress.current + '/' + progress.total + ' 批（成功:' + progress.succeeded + ' 失败:' + progress.failed + '）';
      renderPopupBatchStatus();
      break;
    case 'image_batch_error':
      var errBatch = progress.current - 1;
      if (errBatch >= 0 && errBatch < popupBatchStates.length) {
        popupBatchStates[errBatch] = 'error';
      }
      text.textContent = '⚠️ 第' + progress.current + '批失败：' + progress.error.substring(0, 50);
      renderPopupBatchStatus();
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

function renderPopupBatchStatus() {
  var container = document.getElementById('ai-batch-list');
  var statusBox = document.getElementById('ai-batch-status');
  if (!container || !statusBox) return;
  if (popupTotalBatches === 0) {
    statusBox.style.display = 'none';
    return;
  }
  statusBox.style.display = 'block';
  var html = '';
  for (var i = 0; i < popupTotalBatches; i++) {
    var state = popupBatchStates[i] || 'pending';
    var bgColor = state === 'done' ? '#10b981' : (state === 'error' ? '#ef4444' : (state === 'processing' ? '#3b82f6' : '#d1d5db'));
    var titleText = state === 'done' ? '第' + (i + 1) + '批完成' : (state === 'error' ? '第' + (i + 1) + '批失败' : (state === 'processing' ? '第' + (i + 1) + '批处理中' : '第' + (i + 1) + '批等待中'));
    html += '<div title="' + titleText + '" style="width:20px;height:20px;border-radius:4px;background:' + bgColor + ';display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:500;transition:background 0.3s;">' + (i + 1) + '</div>';
  }
  container.innerHTML = html;
}

document.getElementById('btn-export-excel').addEventListener('click', function() {
  if (!productInfo) { showError('请先提取商品信息'); return; }
  chrome.runtime.sendMessage({ type: 'EXPORT_EXCEL', data: { products: [productInfo] } }, function(response) {
    if (response && response.success) {
      var blob = new Blob([response.data], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = productInfo.title.replace(/[\\/:*?"<>|]/g, '_') + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      showError('导出失败');
    }
  });
});

document.getElementById('btn-export-md').addEventListener('click', function() {
  if (!aiResult) { showError('请先生成AI分析报告'); return; }
  var blob = new Blob([aiResult.report], { type: 'text/markdown' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = aiResult.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

document.getElementById('btn-project').addEventListener('click', function() {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'none';
  document.getElementById('project-panel').style.display = 'block';
  renderProjects();
});

document.getElementById('btn-settings').addEventListener('click', function() {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('project-panel').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'block';
  renderSettings();
});

document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
});

chrome.storage.local.get(['projects', 'cacheHours'], function(items) {
  projects = items.projects || [];
  if (items.cacheHours) cacheHours = items.cacheHours;
  chrome.runtime.sendMessage({ type: 'GET_AGENTS' }, function(resp) {
    if (resp && resp.success) {
      aiAgents = resp.data;
    }
  });
  tryLoadCache();
});

function tryLoadCache() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0] || !tabs[0].url) return;
    var url = tabs[0].url;
    if (!/\.tmall\.com/.test(url) && !/\.jd\.com/.test(url) && !/\.jd\.hk/.test(url) && !/\.taobao\.com/.test(url)) return;
    getFromCache(url, function(data, timestamp) {
      if (data) {
        handleExtractSuccess(data);
        getAIResultFromCache(url, function(cachedAIResult, aiCacheTime) {
          if (cachedAIResult) {
            aiResult = cachedAIResult;
            renderAIReport(aiResult);
            document.getElementById('btn-export-md').disabled = false;
            var ageMinutes = Math.floor((Date.now() - aiCacheTime) / 60000);
            var ageText = ageMinutes < 60 ? ageMinutes + '分钟前缓存' : Math.floor(ageMinutes / 60) + '小时前缓存';
            showError('✅ AI分析已加载缓存（' + ageText + '）');
          }
        });
      }
    });
  });
}

document.getElementById('btn-sidebar').addEventListener('click', function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0]) return;
    chrome.sidePanel.open({ tabId: tabs[0].id });
  });
});

document.getElementById('btn-debug').addEventListener('click', function() {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('project-panel').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'none';
  document.getElementById('debug-panel').style.display = 'block';
  document.getElementById('debug-output').textContent = '正在扫描页面结构...';
  
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0]) { return; }
    chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE' }, function(response) {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] }, function() {
          setTimeout(function() {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE' }, function(resp) {
              if (resp && resp.success) {
                showDebugResult(resp.data);
              } else {
                document.getElementById('debug-output').textContent = '扫描失败';
              }
            });
          }, 500);
        });
      } else if (response && response.success) {
        showDebugResult(response.data);
      }
    });
  });
});

function showDebugResult(data) {
  var output = '=== 页面结构扫描结果 ===\n\n';
  
  output += '【参数列表 (UL)】\n';
  if (data.paramULs && data.paramULs.length > 0) {
    data.paramULs.forEach(function(ul, i) {
      output += '  #' + i + ': ' + ul.selector + '\n';
      output += '     class: ' + ul.className + '\n';
      output += '     id: ' + ul.id + '\n';
      output += '     li数: ' + ul.liCount + '\n';
      output += '     样例:\n';
      ul.sample.forEach(function(s) {
        output += '       - ' + s + '\n';
      });
      output += '\n';
    });
  } else {
    output += '  未找到\n\n';
  }
  
  output += '【参数列表 (DL)】\n';
  if (data.paramDLs && data.paramDLs.length > 0) {
    data.paramDLs.forEach(function(dl, i) {
      output += '  #' + i + ': ' + dl.selector + '\n';
      output += '     class: ' + dl.className + '\n';
      output += '     id: ' + dl.id + '\n';
      output += '     dt: ' + dl.dtCount + ', dd: ' + dl.ddCount + '\n\n';
    });
  } else {
    output += '  未找到\n\n';
  }
  
  output += '【店铺链接】\n';
  if (data.shopLinks && data.shopLinks.length > 0) {
    data.shopLinks.forEach(function(s, i) {
      output += '  #' + i + ': ' + s.text + '\n';
      output += '     href: ' + s.href + '\n';
      output += '     class: ' + s.className + '\n';
      output += '     parentClass: ' + s.parentClass + '\n\n';
    });
  } else {
    output += '  未找到\n\n';
  }
  
  output += '【品牌链接】\n';
  if (data.brandLinks && data.brandLinks.length > 0) {
    data.brandLinks.forEach(function(b, i) {
      output += '  #' + i + ': ' + b.text + '\n';
      output += '     class: ' + b.className + '\n';
      output += '     parent: ' + b.parentClass + '\n';
      output += '     grandParent: ' + b.grandParentClass + '\n\n';
    });
  } else {
    output += '  未找到\n\n';
  }
  
  output += '【价格元素】\n';
  if (data.priceElements && data.priceElements.length > 0) {
    data.priceElements.forEach(function(p, i) {
      output += '  #' + i + ': ' + p.text + '\n';
      output += '     class: ' + p.className + '\n';
      output += '     id: ' + p.id + '\n';
      output += '     tag: ' + p.tagName + '\n\n';
    });
  } else {
    output += '  未找到\n\n';
  }
  
  output += '【评论元素】\n';
  if (data.commentElements && data.commentElements.length > 0) {
    data.commentElements.forEach(function(c, i) {
      output += '  #' + i + ': ' + c.text + '\n';
      output += '     class: ' + c.className + '\n';
      output += '     id: ' + c.id + '\n';
      output += '     tag: ' + c.tagName + '\n\n';
    });
  } else {
    output += '  未找到\n\n';
  }
  
  output += '【主图元素】\n';
  if (data.mainImgElements && data.mainImgElements.length > 0) {
    data.mainImgElements.forEach(function(m, i) {
      output += '  #' + i + ': ' + m.tagName + '#' + m.id + '.' + m.className + '\n';
      output += '     img数: ' + m.imgCount + '\n';
      output += '     样例: ' + m.sampleSrc + '\n\n';
    });
  } else {
    output += '  未找到\n\n';
  }
  
  document.getElementById('debug-output').textContent = output;
}

chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (tabs && tabs[0] && tabs[0].url) {
    var url = tabs[0].url;
    if (!url.includes('tmall.com') && !url.includes('jd.com')) {
      document.getElementById('empty-state').innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><div>当前页面不支持</div><div style="font-size:12px;margin-top:4px;">请打开天猫或京东详情页</div></div>';
      document.getElementById('btn-extract').disabled = true;
    }
  }
});
