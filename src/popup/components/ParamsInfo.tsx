interface ParamsInfoProps {
  params: Record<string, string>;
}

function ParamsInfo({ params }: ParamsInfoProps) {
  const paramList = Object.entries(params);

  if (paramList.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-3xl mb-2">📭</div>
        <div>未提取到参数</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {paramList.map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 p-2 bg-white rounded-md border border-gray-100">
          <span className="text-gray-500 text-sm font-medium shrink-0">{key}：</span>
          <span className="text-sm text-gray-800 flex-1">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default ParamsInfo;
