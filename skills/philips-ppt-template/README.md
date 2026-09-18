# Philips PPT Template Skill

这是一个可复用的 PowerPoint 生成与改版 Skill，用于让 AI 在制作正式报告时真正复用飞利浦提供的原生模板，而不是只模仿截图或随意拼接页面。

## 适用场景

- 使用飞利浦模板新建汇报、策略、研究或项目报告
- 基于已有 PPT 进行内容替换、版式重排和品牌一致性检查
- 需要同时保留 PowerPoint 原生可编辑性的场景

## 使用方式

1. 读取 `SKILL.md`，先理解模板资产、版式选择规则和校验要求。
2. 根据内容目的选择合适的封面页、章节页、正文页、图表页或结尾页；不要为了“看起来丰富”随机混用不同底色。
3. 优先复制模板中的原生 slide master、layout 和 placeholder，再替换文字、图表和图片。
4. 标题位置、标题颜色、页面背景、右下角 PHILIPS logo、版权文案和页脚锚点必须保持模板规范；正文区域可以根据内容灵活排版。
5. 完成后运行校验脚本，并渲染逐页检查视觉结果和编辑性。

## 目录结构

```text
philips-ppt-template/
├── SKILL.md                         # AI 使用说明与硬性品牌规则
├── README.md                        # 本文件：安装、使用和资产说明
├── agents/openai.yaml               # Skill 在 Codex 中的展示信息
├── assets/
│   ├── philips-clean-template.pptx  # 去除示例内容后的工作模板
│   └── philips-template.pptx        # 原始参考模板
├── references/
│   ├── layout-usage.md              # 各类版式的用途和选择建议
│   ├── template-map.md              # 模板结构、母版和版式映射
│   ├── source-slides.png            # 原始模板视觉参考
│   └── layout-catalog.png           # 版式缩略图目录
└── scripts/
    ├── new_deck.py                  # 从清洁模板复制新建可编辑 PPT
    └── validate_template.py         # 检查画布、母版、品牌锚点和字体策略
```

## 常用命令

从清洁模板创建新文件：

```bash
python scripts/new_deck.py --output ./my-report.pptx
```

检查模板或生成结果：

```bash
python scripts/validate_template.py ./my-report.pptx
```

## 关键约定

- 画布比例和页面锚点以真实模板为准，不自行重建一套“相似风格”。
- 模板内置字体不作为生成阻断条件；如果运行环境没有该字体，可以使用可替代字体，但应保持层级、字重、颜色和位置一致。
- 正文页不强制所有内容使用同一种卡片或颜色；允许在统一的品牌骨架内灵活安排正文、图片和图表。
- 版式选择要服从信息结构：封面用于建立主题，章节页用于分段，正文页用于解释观点，数据/图表页用于证据，结尾页用于行动或收束。
- 生成后必须进行渲染检查，重点查看标题、logo、版权文案、页脚和图片是否越界或被遮挡。

## 资源边界

模板中的云端 Templafy 资源和外部字体不随 Skill 自动安装；Skill 已保留本地 PPTX、版式说明和检查脚本，足以在普通 PowerPoint 环境中继续编辑和复用。
