import { useState } from 'react';

interface ImageInfoProps {
  mainImages: string[];
  detailImages: string[];
}

function ImageInfo({ mainImages, detailImages }: ImageInfoProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'detail'>('main');
  const images = activeSection === 'main' ? mainImages : detailImages;
  const totalCount = mainImages.length + detailImages.length;

  const handleCopyAll = () => {
    const allImages = [...mainImages, ...detailImages];
    navigator.clipboard.writeText(allImages.join('\n'));
    alert('已复制所有图片地址');
  };

  const handleCopySingle = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('已复制图片地址');
  };

  if (totalCount === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-3xl mb-2">🖼️</div>
        <div>未提取到图片</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveSection('main')}
          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeSection === 'main'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          主图 ({mainImages.length})
        </button>
        <button
          onClick={() => setActiveSection('detail')}
          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeSection === 'detail'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          详情图 ({detailImages.length})
        </button>
      </div>

      <button
        onClick={handleCopyAll}
        className="w-full mb-3 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
      >
        复制全部图片地址
      </button>

      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
        {images.map((url, index) => (
          <div key={index} className="relative group">
            <img
              src={url}
              alt={`${activeSection === 'main' ? '主图' : '详情图'} ${index + 1}`}
              className="w-full aspect-square object-cover rounded-md border border-gray-200"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
              <button
                onClick={() => handleCopySingle(url)}
                className="px-2 py-1 bg-white text-gray-800 text-xs rounded hover:bg-gray-100"
              >
                复制地址
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageInfo;
