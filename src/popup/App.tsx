import { useState, useEffect } from 'react';
import { ProductInfo, AIConfig, AIResult, Project, ProjectProduct } from '../shared/types';
import { AI_PROVIDERS, STORAGE_KEYS } from '../shared/constants';
import { isTmallUrl, isJDUrl, truncateText, sanitizeFilename } from '../shared/utils';
import Header from './components/Header';
import BasicInfo from './components/BasicInfo';
import ParamsInfo from './components/ParamsInfo';
import ImageInfo from './components/ImageInfo';
import AIReport from './components/AIReport';
import ProjectPanel from './components/ProjectPanel';
import SettingsPanel from './components/SettingsPanel';

type TabType = 'basic' | 'params' | 'images' | 'ai' | 'project' | 'settings';

function App() {
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url) {
        setCurrentUrl(tab.url);
        loadStorage();
      }
    });
  }, []);

  async function loadStorage() {
    const config = await sendMessage('GET_STORAGE', { key: STORAGE_KEYS.AI_CONFIG });
    if (config.success) {
      setAiConfig(config.data as AIConfig);
    }

    const projectsData = await sendMessage('GET_STORAGE', { key: STORAGE_KEYS.PROJECTS });
    if (projectsData.success) {
      setProjects(projectsData.data as Project[]);
    }
  }

  async function sendMessage(type: string, data?: unknown) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, data }, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  async function extractInfo() {
    if (!currentUrl || (!isTmallUrl(currentUrl) && !isJDUrl(currentUrl))) {
      setError('当前页面不是天猫或京东详情页');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await sendMessage('EXTRACT_INFO');
      
      if (response.success) {
        setProductInfo(response.data as ProductInfo);
        setAiResult(null);
        setActiveTab('basic');
      } else {
        setError(response.error || '提取失败');
      }
    } catch (e) {
      setError('提取失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  }

  async function callAI() {
    if (!productInfo || !aiConfig || !aiConfig.apiKey) {
      setError('请先提取商品信息并配置AI API Key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await sendMessage('CALL_AI', { productInfo, config: aiConfig });
      
      if (response.success) {
        setAiResult(response.data as AIResult);
        setActiveTab('ai');
      } else {
        setError(response.error || 'AI分析失败');
      }
    } catch (e) {
      setError('AI分析失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel() {
    if (!productInfo) {
      setError('请先提取商品信息');
      return;
    }

    try {
      const response = await sendMessage('EXPORT_EXCEL', { products: [productInfo] });
      
      if (response.success) {
        downloadFile(response.data as string, `${sanitizeFilename(productInfo.title)}.csv`, 'text/csv');
      } else {
        setError(response.error || '导出失败');
      }
    } catch (e) {
      setError('导出失败');
    }
  }

  async function exportMD() {
    if (!aiResult) {
      setError('请先生成AI分析报告');
      return;
    }

    try {
      const response = await sendMessage('EXPORT_MD', { report: aiResult.report, fileName: aiResult.fileName });
      
      if (response.success) {
        downloadFile(response.data as string, aiResult.fileName, 'text/markdown');
      } else {
        setError(response.error || '导出失败');
      }
    } catch (e) {
      setError('导出失败');
    }
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function addToProject(projectId: string, type: 'mine' | 'competitor') {
    if (!productInfo) {
      setError('请先提取商品信息');
      return;
    }

    const response = await sendMessage('ADD_TO_PROJECT', { projectId, productInfo, type });
    
    if (response.success) {
      const projectsData = await sendMessage('GET_STORAGE', { key: STORAGE_KEYS.PROJECTS });
      if (projectsData.success) {
        setProjects(projectsData.data as Project[]);
      }
    } else {
      setError(response.error || '添加失败');
    }
  }

  async function createProject(name: string) {
    const response = await sendMessage('CREATE_PROJECT', { name });
    
    if (response.success) {
      const projectsData = await sendMessage('GET_STORAGE', { key: STORAGE_KEYS.PROJECTS });
      if (projectsData.success) {
        setProjects(projectsData.data as Project[]);
      }
    } else {
      setError(response.error || '创建失败');
    }
  }

  async function deleteProject(id: string) {
    const response = await sendMessage('DELETE_PROJECT', { id });
    
    if (response.success) {
      const projectsData = await sendMessage('GET_STORAGE', { key: STORAGE_KEYS.PROJECTS });
      if (projectsData.success) {
        setProjects(projectsData.data as Project[]);
      }
    } else {
      setError(response.error || '删除失败');
    }
  }

  async function exportProjectExcel(project: Project) {
    const products = project.products.map((p) => p.productInfo);
    const response = await sendMessage('EXPORT_EXCEL', { products });
    
    if (response.success) {
      downloadFile(response.data as string, `${sanitizeFilename(project.name)}.csv`, 'text/csv');
    } else {
      setError(response.error || '导出失败');
    }
  }

  async function updateAIConfig(config: AIConfig) {
    const response = await sendMessage('SET_STORAGE', { key: STORAGE_KEYS.AI_CONFIG, value: config });
    
    if (response.success) {
      setAiConfig(config);
    } else {
      setError(response.error || '保存失败');
    }
  }

  const isSupported = isTmallUrl(currentUrl) || isJDUrl(currentUrl);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Header />
      
      <div className="p-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={extractInfo}
            disabled={!isSupported || loading}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              !isSupported || loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {loading ? '提取中...' : '提取信息'}
          </button>
          
          <button
            onClick={callAI}
            disabled={!productInfo || loading}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              !productInfo || loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            {loading ? '分析中...' : 'AI分析'}
          </button>
          
          <button
            onClick={exportExcel}
            disabled={!productInfo}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              !productInfo
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            导出Excel
          </button>
          
          <button
            onClick={exportMD}
            disabled={!aiResult}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              !aiResult
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            导出报告
          </button>
        </div>
        
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setActiveTab('project')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'project'
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            📁 项目分析
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            ⚙️ 设置
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 text-red-600 text-sm">
          ❌ {error}
        </div>
      )}

      {!isSupported && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🛒</div>
            <div>当前页面不支持信息提取</div>
            <div className="text-sm mt-1">请打开天猫或京东商品详情页</div>
          </div>
        </div>
      )}

      {isSupported && !productInfo && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📋</div>
            <div>点击"提取信息"按钮</div>
            <div className="text-sm mt-1">开始提取商品详情</div>
          </div>
        </div>
      )}

      {productInfo && (
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 px-3 py-2">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('basic')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  activeTab === 'basic'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                📋 基础信息
              </button>
              <button
                onClick={() => setActiveTab('params')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  activeTab === 'params'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                📊 参数 ({Object.keys(productInfo.params).length})
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  activeTab === 'images'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                🖼️ 图片 ({productInfo.mainImages.length + productInfo.detailImages.length})
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  activeTab === 'ai'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                🤖 AI分析
              </button>
            </div>
          </div>

          <div className="p-3">
            {activeTab === 'basic' && <BasicInfo info={productInfo} />}
            {activeTab === 'params' && <ParamsInfo params={productInfo.params} />}
            {activeTab === 'images' && (
              <ImageInfo mainImages={productInfo.mainImages} detailImages={productInfo.detailImages} />
            )}
            {activeTab === 'ai' && <AIReport result={aiResult} />}
            {activeTab === 'project' && (
              <ProjectPanel
                projects={projects}
                productInfo={productInfo}
                onCreate={createProject}
                onDelete={deleteProject}
                onExport={exportProjectExcel}
                onAddToProject={addToProject}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsPanel
                config={aiConfig}
                providers={AI_PROVIDERS}
                onUpdate={updateAIConfig}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
