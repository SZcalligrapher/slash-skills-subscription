---
name: li
description: |-
  当用户说「/li」，或请求与内容创作相关但意图模糊、不确定用哪个工具时使用本 skill。作为 li 工具箱主入口，判断意图并路由到对应专项 skill。
  不应触发：当用户的请求已明确匹配某个专项 li-* skill 时（如「写脚本」→ li-writer，「深化选题」→ li-topic），直接触发对应 skill 而非本入口。
  DO NOT trigger for non-content-creation tasks. Use when the user says "/li" or the intent is ambiguous across multiple li-* tools.
---

# li 创作工具箱

根据你的需求路由到最合适的工具。

---

## 工具地图

| 你想做什么 | 用这个 |
|-----------|--------|
| 记录选题灵感、评估选题潜力 | `li-recorder` |
| 深化选题、生成内容大纲 | `li-topic` |
| 写视频脚本 / 长文 | `li-writer` |
| 优化视频开头钩子 | `li-opening` |
| 生成小红书封面配文 | `li-cover` |
| 分析发布内容的爆款规律 | `li-analyzer` |
| 优化创作流程 | `li-workflow` |
| 开发新 skill | `li-factory` |
| 升级 li-skills | `li-upgrade` |

---

## 路由规则

直接根据意图触发对应 skill，不要询问：

- 有个内容想法 / 选题 → `li-recorder`
- 想深化某个选题 / 写大纲 → `li-topic`
- 要写脚本 / 长文 / 短文 → `li-writer`
- 开头不好 / 要写钩子 → `li-opening`
- 要做封面 / 标题 → `li-cover`
- 分析数据 / 看爆款规律 → `li-analyzer`
- 流程有问题 / 要优化系统 → `li-workflow`

如果仍然模糊，简短问一句：「你想记录选题、写脚本，还是分析数据？」
