---
name: li-upgrade
description: |
  当用户说「升级 skills」「更新 li-skills」「li-skills 有新版本吗」「upgrade skills」「skills 怎么更新」时，应使用本 skill。即使用户只是问「有新版本吗」也应触发，主动执行升级流程。
  检查当前版本，运行 npx skills update 或重新安装 jiangjiax/li-skills，完成后提示用户重启 Claude Code 会话以加载新版本。
  Use when the user wants to "upgrade skills", "update li-skills", or get the latest version of the li creator toolkit.
---

# 升级 li-skills

将你的 li-skills 升级到最新版本。

---

## 步骤

### 第一步：确认当前版本

```bash
cat ~/.claude/skills/li-writer/SKILL.md | head -3
```

### 第二步：执行升级

```bash
npx skills update
```

或重新安装最新版：

```bash
npx skills add jiangjiax/li-skills
```

### 第三步：重启 Claude Code 会话加载新版本

---

## 注意事项

- 升级会覆盖同名 skill 文件，不会删除其他 skill
- 如有自定义修改，建议先备份对应 SKILL.md
- 升级后重启 Claude Code 会话以加载新版本

---

## 获取帮助

- GitHub: https://github.com/jiangjiax/li-skills
- Issues: https://github.com/jiangjiax/li-skills/issues
