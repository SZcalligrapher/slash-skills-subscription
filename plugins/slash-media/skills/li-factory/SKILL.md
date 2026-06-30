---
name: li-factory
description: This skill should be used when the user wants to "create a skill", "build a new skill", "write a skill", "improve a skill", "update a skill", "optimize skill description", or needs guidance on skill structure, progressive disclosure, or skill development best practices. 触发方式：/li-factory、「创建skill」、「改进skill」、「帮我写一个skill」、「优化skill」、「把这个流程变成skill」、「这个工作流能做成skill吗」。即使用户没有明确说"skill"，只要他们想把某个重复流程自动化或封装成可复用工具，也应该触发本 skill。

# Li-Factory — Skill 生产工厂

用于创建和优化 skills 的元技能。Skills 是模块化的自包含包，将 Claude 从通用助手转变为装备了程序性知识的专业 Agent。

---

## Skill 结构

```
skill-name/
├── SKILL.md (必需) — YAML frontmatter + Markdown 指令
└── 可选资源
    ├── scripts/      - 可执行脚本（Python/Bash 等）
    ├── references/   - 按需加载的参考文档
    ├── examples/     - 完整可运行示例
    └── assets/       - 输出中使用的资源文件
```

**三级渐进披露：**

| 层级 | 内容 | 加载时机 | 大小限制 |
|------|------|---------|---------|
| Metadata | name + description | 始终在上下文 | ~100 词 |
| SKILL.md 主体 | 核心流程和指令 | skill 触发时 | <500 行（理想） |
| Bundled resources | scripts/references/assets | 按需加载 | 无限制 |

Scripts 可以在不读入上下文的情况下执行。

---

## 创建流程

### 第一步：捕捉意图

**先从当前对话历史提取** — 如果用户说"把这个流程做成 skill"，不要从零开始问，而是从对话历史中直接提取：使用了哪些工具、步骤顺序是什么、用户做了哪些纠正、输入输出格式是什么。让用户确认这些提取是否准确，再进入下一步。

如果是全新需求，收集以下信息（每次只问一个最重要的问题）：

1. 这个 skill 要完成什么任务？
2. 用户会用什么词触发它？（收集精确短语，含中英文变体）
3. 预期输出是什么格式？

掌握功能范围后再进入下一步。

### 第二步：规划资源

分析哪些内容适合放入 bundled resources：

- **scripts/** — 会反复编写的代码，或需要确定性可靠性的操作（如果测试发现每次都要重写同一个脚本，就应该把它放进来）
- **references/** — 详细规范、API 文档、复杂决策树（>300 行时提供目录）
- **assets/** — 用于输出的静态文件

只创建实际需要的目录。

### 第三步：编写 SKILL.md

#### Description — 触发机制的核心

Description 决定 skill 何时被触发。使用第三人称，包含用户会说的具体短语：

```yaml
# ✅ 正确
description: This skill should be used when the user asks to "create a hook",
  "add a PreToolUse hook", or mentions hook events. 触发方式：/hooks、「加钩子」。
  即使用户没说"hook"，只要他们想在工具调用前后自动执行某些操作，也应该触发本 skill。
  DO NOT trigger for general Claude API questions.

# ❌ 错误（模糊，没有触发短语）
description: Provides hook guidance.
```

两类触发问题的处理方式：
- **undertrigger**（触发不足）：列出更多触发短语，包含中英文变体，加上意图描述（"即使用户没说 X，只要他们想 Y..."）
- **overtrigger**（误触发）：用 "DO NOT trigger when..." 明确排除场景

#### 主体写作规范

使用**祈使句**，不用第二人称：

| ✅ 正确 | ❌ 错误 |
|--------|--------|
| 读取配置文件 | 你需要读取配置文件 |
| 使用 Grep 搜索 | 你可以用 Grep 搜索 |

**解释原因而非强制命令** — LLM 理解"为什么"比记住"做什么"更有效。避免全大写的 MUST/NEVER，改为说明理由：

| ✅ 解释原因 | ❌ 强制命令 |
|-----------|-----------|
| 先读取现有文件，避免覆盖用户已有工作 | NEVER 直接创建文件 |
| 开头容易出现伪造场景，所以需要单独优化 | MUST 跑 li-opening |

超过 500 行则将详细内容移到 references/，在 SKILL.md 末尾明确引用：

```markdown
## 附加资源
- **`references/patterns.md`** - 常见模式和详细案例
- **`scripts/validate.sh`** - 验证脚本（按需执行，无需读入上下文）
```

避免信息重复：内容只存在于 SKILL.md 或 references/ 之一。

### 第四步：验证 Checklist

**结构：**
- [ ] SKILL.md 有有效 YAML frontmatter（含 name 和 description）
- [ ] 被引用的文件实际存在

**Description 质量：**
- [ ] 第三人称格式
- [ ] 包含具体触发短语（中英文变体）
- [ ] 包含意图描述（"即使没说 X，只要想 Y..."）
- [ ] 有不触发的排除场景

**内容质量：**
- [ ] 主体使用祈使句
- [ ] 解释原因而非强制命令
- [ ] 字数适中（理想 <500 行）
- [ ] SKILL.md 引用了所有 bundled resources

### 第五步：测试与迭代

创建 2-3 个真实测试用例（用户真正会说的话，不是抽象描述）：

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "用户会说的真实请求",
      "expected_output": "预期结果描述"
    }
  ]
}
```

**迭代循环：**
1. 运行测试用例，记录实际输出
2. **读 transcript，不只看最终输出** — 找出无效指令和重复劳动
3. 如果多个测试用例都独立写了同一个脚本，把它放入 `scripts/`
4. 根据反馈改进 skill，重新测试

如果触发不准确，生成 20 条触发测试集（8-10 条应触发 + 8-10 条不应触发），重点关注边缘案例而非明显案例。

---

## 改进原则

**泛化而非过拟合** — 测试用例只是样本，skill 要服务无数次调用。遇到顽固问题时，尝试用不同比喻或换一种工作模式，而不是堆叠更多限制性指令。

**保持精简** — 删除不起作用的内容。读 transcript，找出哪些指令让模型做了无效工作，删掉它们。

**可复用脚本** — 如果测试发现每次都要重写某段代码（如格式转换、数据提取），这是强烈信号：把它放入 `scripts/`，节省每次调用的重复劳动。

---

## 附加资源

- **`references/testing-guide.md`** - 测试用例格式、断言设计、Description 优化详细方法
