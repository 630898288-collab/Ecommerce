import { createParser } from './parser';
import { ProductInfo, Message, MessageType } from '../shared/types';

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_INFO') {
    try {
      const parser = createParser(document);
      
      if (!parser) {
        sendResponse({
          success: false,
          error: '当前页面不支持信息提取',
        });
        return;
      }
      
      const productInfo: ProductInfo = parser.parse();
      
      sendResponse({
        success: true,
        data: productInfo,
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '提取失败',
      });
    }
  }
});
