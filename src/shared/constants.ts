import { AIProvider, AIProviderConfig } from './types';

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  deepseek: {
    name: 'DeepSeek',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  qianwen: {
    name: '千问',
    defaultEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    defaultModel: 'qwen-turbo',
  },
  doubao: {
    name: '豆包',
    defaultEndpoint: 'https://api.doubao.com/v1/chat/completions',
    defaultModel: 'doubao-pro',
  },
  chatgpt: {
    name: 'ChatGPT',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
};

export const TMALL_URL_PATTERN = /^https?:\/\/.*\.tmall\.com\/item\.htm.*/;
export const JD_URL_PATTERN = /^https?:\/\/.*\.jd\.com\/.*\.html.*/;

export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  name: 'DeepSeek',
  defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
  defaultModel: 'deepseek-chat',
};

export const STORAGE_KEYS = {
  PROJECTS: 'projects',
  AI_CONFIG: 'aiConfig',
};
