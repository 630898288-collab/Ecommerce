export interface ProductInfo {
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

export interface Project {
  id: string;
  name: string;
  products: ProjectProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProduct {
  id: string;
  productInfo: ProductInfo;
  type: 'mine' | 'competitor';
  addedAt: string;
}

export type AIProvider = 'deepseek' | 'qianwen' | 'doubao' | 'chatgpt';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  endpoint: string;
}

export interface AIProviderConfig {
  name: string;
  defaultEndpoint: string;
  defaultModel: string;
}

export interface AIResult {
  report: string;
  productTitle: string;
  brandName: string;
  categoryHint: string;
  saleCount: string;
  fileName: string;
  generatedAt: string;
}

export interface StorageData {
  projects: Project[];
  aiConfig: AIConfig;
}

export type MessageType =
  | 'EXTRACT_INFO'
  | 'EXTRACT_RESULT'
  | 'CALL_AI'
  | 'AI_RESULT'
  | 'GET_STORAGE'
  | 'SET_STORAGE'
  | 'EXPORT_EXCEL'
  | 'EXPORT_MD'
  | 'ADD_TO_PROJECT'
  | 'GET_PROJECTS'
  | 'CREATE_PROJECT'
  | 'DELETE_PROJECT'
  | 'UPDATE_PROJECT';

export interface Message {
  type: MessageType;
  data?: unknown;
}
