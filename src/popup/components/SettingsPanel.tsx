import { AIConfig, AIProvider, AIProviderConfig } from '../../shared/types';

interface SettingsPanelProps {
  config: AIConfig | null;
  providers: Record<AIProvider, AIProviderConfig>;
  onUpdate: (config: AIConfig) => void;
}

function SettingsPanel({ config, providers, onUpdate }: SettingsPanelProps) {
  if (!config) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-3xl mb-2">⚙️</div>
        <div>加载配置中...</div>
      </div>
    );
  }

  const handleProviderChange = (provider: AIProvider) => {
    const providerConfig = providers[provider];
    onUpdate({
      ...config,
      provider,
      endpoint: providerConfig.defaultEndpoint,
      model: providerConfig.defaultModel,
    });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onUpdate({ ...config, apiKey });
  };

  const handleModelChange = (model: string) => {
    onUpdate({ ...config, model });
  };

  const handleEndpointChange = (endpoint: string) => {
    onUpdate({ ...config, endpoint });
  };

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">AI 服务商</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(providers).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleProviderChange(key as AIProvider)}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                config.provider === key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {value.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="输入您的 API Key"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
        <input
          type="text"
          value={config.model}
          onChange={(e) => handleModelChange(e.target.value)}
          placeholder="输入模型名称"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API 端点</label>
        <input
          type="text"
          value={config.endpoint}
          onChange={(e) => handleEndpointChange(e.target.value)}
          placeholder="输入 API 端点 URL"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="p-3 bg-blue-50 rounded-md">
        <div className="text-sm font-medium text-blue-700 mb-1">使用说明</div>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>1. 选择 AI 服务商</li>
          <li>2. 输入对应的 API Key</li>
          <li>3. 模型名称和端点可使用默认值</li>
          <li>4. API Key 仅存储在浏览器本地</li>
        </ul>
      </div>
    </div>
  );
}

export default SettingsPanel;
