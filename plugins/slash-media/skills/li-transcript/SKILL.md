---
name: li-transcript
description: |
  当用户说「获取逐字稿」「转录视频」「提取文稿」「帮我扒一下」「这个视频说了什么」「这个博主说了啥」，或直接给一个视频链接要求提取内容时，应使用本 skill。即使用户只是丢了一个视频链接没说要干嘛，只要上下文涉及对标分析或内容提取，也应主动触发。
  调用 video2text.py 获取原始逐字稿，AI 校对常见语音识别错误，识别作者后归档到对标博主目录。
  不应触发：分析爆款规律（用 li-analyzer）、记录自己的选题想法（用 li-recorder）、写自己的脚本（用 li-writer）。
  Use when the user wants to "get transcript", "transcribe video", "extract script", or gives a video link for content extraction. Runs speech-to-text, AI proofreads, and archives to benchmark blogger directory.
---

# 视频逐字稿提取 + 对标归档

从视频链接提取逐字稿，AI 校对后归档到对标博主目录。

---

## 工作流程

### Step 0：首次使用前的环境准备（仅第一次需要）

如果是从开源仓库刚装好的 skill，需要先准备运行环境：

```bash
# 1. 系统依赖（macOS）
brew install yt-dlp ffmpeg

# 2. Python 虚拟环境 + 腾讯云 ASR SDK
python3 -m venv .claude/skills/li-transcript/scripts/.venv
.claude/skills/li-transcript/scripts/.venv/bin/pip install tencentcloud-sdk-python-asr

# 3. 在项目根目录创建 .env 文件，填入腾讯云密钥（控制台 https://console.cloud.tencent.com/cam/capi 申请）
# 格式：
# TENCENT_SECRET_ID=你的_id
# TENCENT_SECRET_KEY=你的_key
```

环境准备好之后，跳到 Step 1。

### Step 1：转录视频

运行转录脚本（脚本和 venv 都在 skill 目录下，自包含）：

```bash
.claude/skills/li-transcript/scripts/.venv/bin/python3 .claude/skills/li-transcript/scripts/video2text.py "视频链接"
```

脚本会输出：
- stderr：进度信息 + `[标题] xxx`（视频原标题）
- stdout：去除时间戳的纯文本逐字稿

脚本报错时的排查顺序：
1. 项目根目录的 `.env` 是否包含 `TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY`（脚本会从当前目录向上查找最多 6 层）
2. `.claude/skills/li-transcript/scripts/.venv/` 是否正常（重建：`python3 -m venv .claude/skills/li-transcript/scripts/.venv && .claude/skills/li-transcript/scripts/.venv/bin/pip install tencentcloud-sdk-python-asr`）
3. 视频链接是否被 yt-dlp 支持

---

### Step 2：AI 校对

对原始逐字稿做文字校对，只改错字不改内容：

- 同音/近音字纠错：根据上下文推断（如「艺人公司」→「一人公司」、「四动会」→「私董会」、「体校」→「提效」）
- 专有名词修正：技术术语、产品名、人名、英文词汇
- 明显的 ASR 乱码：替换为合理推断

保留口语表达（「啊」「嗯」「就是说」），不改写句子结构，不美化风格。

校对直接执行，不逐条列出差异——用户想核对可以自己对比原文。

---

### Step 3：识别作者 & 归档

**识别作者**——按优先级：
1. 用户已告知 → 直接使用
2. 逐字稿中有自我介绍（「大家好我是XXX」「我是XXX」）→ 提取
3. 都没有 → 问用户

**匹配对标**——读取 `05-选题研究/对标博主/短视频/` 目录列表：
- 匹配到已有博主 → 归档到该目录
- 没匹配到 → 问用户「[名字]还不在对标列表里，创建吗？」，同意则创建目录

作者和是否创建对标可以合并为一次提问，减少来回。

**确定标题**——优先用 yt-dlp 获取的原标题（stderr 中 `[标题]` 行），获取不到则从逐字稿内容概括一个。

---

### Step 4：保存文件

**路径**：`05-选题研究/对标博主/短视频/[博主名]/[YYYY年M月]/[视频标题].md`

时间目录不存在则创建。

**格式**——根据视频来源平台调整 YAML 字段名：

```markdown
---
[平台]数据:
  点赞数: 
  收藏数: 
  评论数: 
  分享数: 
  观看数: 
tags: 
---

# 标题

[视频标题]

# 封面花字



# 视频脚本

[校对后的完整逐字稿]
```

平台判断规则：
- URL 含 `xiaohongshu.com` → `小红书数据`
- URL 含 `bilibili.com` → `B站数据`
- URL 含 `douyin.com` → `抖音数据`
- URL 含 `youtube.com` 或 `youtu.be` → `YouTube数据`
- 其他 → `平台数据`

保存后一句话告知路径。
