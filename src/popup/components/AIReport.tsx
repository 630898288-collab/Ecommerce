import { AIResult } from '../../shared/types';

interface AIReportProps {
  result: AIResult | null;
}

function AIReport({ result }: AIReportProps) {
  if (!result) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-3xl mb-2">🤖</div>
        <div>点击"AI分析"按钮</div>
        <div className="text-sm mt-1">生成专业分析报告</div>
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto space-y-2">
      <div className="text-sm text-gray-500 mb-3">
        生成时间：{new Date(result.generatedAt).toLocaleString()}
      </div>
      
      <div className="bg-white rounded-md border border-gray-200 p-3">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(result.report) }}
        />
      </div>
    </div>
  );
}

function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  html = html.replace(/^### (.*$)/gim, '<h3 class="font-bold text-gray-800 mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="font-bold text-gray-900 mt-4 mb-2 text-lg">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="font-bold text-gray-900 mt-5 mb-3 text-xl">$1</h1>');
  
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 text-sm text-gray-700">$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-sm text-gray-700">$1</li>');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');
  
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm text-gray-800">$1</code>');
  
  html = html.replace(/\n/g, '<br/>');
  
  return html;
}

export default AIReport;
