import { ProductInfo } from '../../shared/types';
import { truncateText } from '../../shared/utils';

interface BasicInfoProps {
  info: ProductInfo;
}

function BasicInfo({ info }: BasicInfoProps) {
  const fields = [
    { label: '商品标题', value: info.title, truncate: 50 },
    { label: '品牌', value: info.brand },
    { label: '型号', value: info.model || '未提取' },
    { label: '类目', value: info.category || '未提取' },
    { label: '店铺', value: info.shopName || '未提取' },
    { label: '价格', value: info.price || '未提取' },
    { label: '销量', value: info.saleCount || '未提取' },
  ];

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.label} className="flex items-start gap-2">
          <span className="text-gray-500 text-sm w-20 shrink-0">{field.label}：</span>
          <span className={`text-sm flex-1 ${field.value === '未提取' ? 'text-gray-400' : 'text-gray-800'}`}>
            {field.value === '未提取' ? (
              <span className="flex items-center gap-1">
                <span>❌</span>
                <span>{field.value}</span>
              </span>
            ) : (
              field.truncate ? truncateText(field.value, field.truncate) : field.value
            )}
          </span>
        </div>
      ))}
      
      <div className="flex items-start gap-2 mt-4">
        <span className="text-gray-500 text-sm w-20 shrink-0">链接：</span>
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline flex-1 break-all"
        >
          {truncateText(info.url, 60)}
        </a>
      </div>
      
      <div className="flex items-center gap-2 mt-4">
        <span className="text-gray-500 text-sm w-20 shrink-0">采集时间：</span>
        <span className="text-sm text-gray-800">{new Date(info.extractedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

export default BasicInfo;
