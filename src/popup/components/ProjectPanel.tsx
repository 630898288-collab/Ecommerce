import { useState } from 'react';
import { Project, ProductInfo } from '../../shared/types';
import { truncateText } from '../../shared/utils';

interface ProjectPanelProps {
  projects: Project[];
  productInfo: ProductInfo;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onExport: (project: Project) => void;
  onAddToProject: (projectId: string, type: 'mine' | 'competitor') => void;
}

function ProjectPanel({ projects, productInfo, onCreate, onDelete, onExport, onAddToProject }: ProjectPanelProps) {
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onCreate(newProjectName.trim());
      setNewProjectName('');
    }
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      <div className="flex gap-2">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
          placeholder="新建项目名称"
          className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleCreateProject}
          disabled={!newProjectName.trim()}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            !newProjectName.trim()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          创建
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          <div className="text-2xl mb-2">📁</div>
          <div className="text-sm">暂无项目</div>
          <div className="text-xs mt-1">创建项目来管理商品</div>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-md border border-gray-200 overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📁</span>
                  <span className="font-medium text-gray-800">{project.name}</span>
                  <span className="text-xs text-gray-400">({project.products.length}个商品)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport(project);
                    }}
                    className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                  >
                    导出
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定删除项目「${project.name}」吗？`)) {
                        onDelete(project.id);
                      }
                    }}
                    className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                  >
                    删除
                  </button>
                  <span className={`text-gray-400 transition-transform ${expandedProjectId === project.id ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {expandedProjectId === project.id && (
                <div className="px-3 pb-3 space-y-2">
                  {project.products.length === 0 ? (
                    <div className="text-center text-gray-400 py-2 text-sm">
                      暂无商品
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {project.products.map((product) => (
                        <div
                          key={product.id}
                          className={`p-2 rounded-md text-sm ${
                            product.type === 'mine' ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${
                              product.type === 'mine' ? 'bg-blue-200 text-blue-700' : 'bg-orange-200 text-orange-700'
                            }`}>
                              {product.type === 'mine' ? '我的产品' : '竞品'}
                            </span>
                            <span className="text-gray-800 flex-1 truncate">
                              {truncateText(product.productInfo.title, 30)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => onAddToProject(project.id, 'mine')}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      ➕ 添加为我的产品
                    </button>
                    <button
                      onClick={() => onAddToProject(project.id, 'competitor')}
                      className="flex-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-600 rounded-md hover:bg-orange-200 transition-colors"
                    >
                      ➕ 添加为竞品
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectPanel;
