#!/usr/bin/env python3
"""视频链接 → 逐字稿：下载视频音频，调用腾讯云 ASR 识别，输出文本。"""

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def find_env_file() -> str:
    """从脚本所在目录向上查找 .env 文件，最多向上 6 层。"""
    current = SCRIPT_DIR
    for _ in range(6):
        candidate = os.path.join(current, ".env")
        if os.path.exists(candidate):
            return candidate
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return ""


def load_env():
    """从 .env 文件加载环境变量（不依赖第三方库）。"""
    env_path = find_env_file()
    if not env_path:
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def get_video_title(url: str) -> str:
    """用 yt-dlp 获取视频标题（不下载）。"""
    cmd = ["yt-dlp", "--get-title", "--no-playlist", url]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip()
    return ""


def download_audio(url: str, output_dir: str) -> str:
    """用 yt-dlp 下载视频并提取音频，返回音频文件路径。"""
    raw_audio = os.path.join(output_dir, "raw_audio")
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format", "mp3",
        "--no-playlist",
        "-o", raw_audio + ".%(ext)s",
        url,
    ]
    print(f"[1/4] 下载视频音频...", file=sys.stderr)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"yt-dlp 错误:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    # yt-dlp 输出的文件名可能带不同后缀
    for ext in ("mp3", "m4a", "wav", "opus", "webm"):
        path = f"{raw_audio}.{ext}"
        if os.path.exists(path):
            return path
    print("未找到下载的音频文件", file=sys.stderr)
    sys.exit(1)


def convert_audio(input_path: str, output_dir: str) -> str:
    """用 ffmpeg 转为 16kHz 单声道 64kbps MP3（控制在 5MB 以内）。"""
    output_path = os.path.join(output_dir, "audio_16k.mp3")
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-ar", "16000",
        "-ac", "1",
        "-b:a", "64k",
        output_path,
    ]
    print("[2/4] 转码音频 (16kHz mono)...", file=sys.stderr)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg 错误:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    if size_mb > 5:
        print(f"音频文件 {size_mb:.1f}MB 超过 5MB 限制，视频可能太长", file=sys.stderr)
        sys.exit(1)

    return output_path


def transcribe(audio_path: str) -> str:
    """调用腾讯云 ASR 录音文件识别，返回识别文本。"""
    from tencentcloud.common import credential
    from tencentcloud.common.profile.client_profile import ClientProfile
    from tencentcloud.common.profile.http_profile import HttpProfile
    from tencentcloud.asr.v20190614 import asr_client, models

    secret_id = os.environ.get("TENCENT_SECRET_ID")
    secret_key = os.environ.get("TENCENT_SECRET_KEY")
    if not secret_id or not secret_key:
        print("请设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 环境变量，或在项目根目录 .env 文件中配置", file=sys.stderr)
        sys.exit(1)

    # 读取音频并 base64 编码
    with open(audio_path, "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")

    data_len = os.path.getsize(audio_path)

    # 创建识别任务
    cred = credential.Credential(secret_id, secret_key)
    http_profile = HttpProfile()
    http_profile.endpoint = "asr.tencentcloudapi.com"
    client_profile = ClientProfile()
    client_profile.httpProfile = http_profile
    client = asr_client.AsrClient(cred, "", client_profile)

    req = models.CreateRecTaskRequest()
    req.from_json_string(json.dumps({
        "EngineModelType": "16k_zh",
        "ChannelNum": 1,
        "ResTextFormat": 0,
        "SourceType": 1,
        "Data": audio_data,
        "DataLen": data_len,
    }))

    print("[3/4] 提交识别任务...", file=sys.stderr)
    resp = client.CreateRecTask(req)
    task_id = resp.Data.TaskId
    print(f"  任务ID: {task_id}", file=sys.stderr)

    # 轮询结果
    print("[4/4] 等待识别完成...", file=sys.stderr)
    poll_req = models.DescribeTaskStatusRequest()
    poll_req.from_json_string(json.dumps({"TaskId": task_id}))

    for i in range(60):  # 最多等 5 分钟
        time.sleep(5)
        status_resp = client.DescribeTaskStatus(poll_req)
        status = status_resp.Data.Status
        if status == 2:  # 成功
            return status_resp.Data.Result
        elif status == 3:  # 失败
            print(f"识别失败: {status_resp.Data.ErrorMsg}", file=sys.stderr)
            sys.exit(1)
        print(f"  识别中... ({(i+1)*5}s)", file=sys.stderr)

    print("识别超时", file=sys.stderr)
    sys.exit(1)


def clean_transcript(text: str) -> str:
    """去除 ASR 返回的时间戳前缀，如 [0:0.000,1:0.220]。"""
    return re.sub(r'\[\d+:\d+\.\d+,\d+:\d+\.\d+\]\s*', '', text)


def main():
    parser = argparse.ArgumentParser(description="视频链接转逐字稿")
    parser.add_argument("url", help="视频链接（支持 B站、抖音、YouTube 等）")
    args = parser.parse_args()

    load_env()

    # 先获取标题，输出到 stderr 供调用方使用
    title = get_video_title(args.url)
    if title:
        print(f"[标题] {title}", file=sys.stderr)

    with tempfile.TemporaryDirectory() as tmpdir:
        raw_audio = download_audio(args.url, tmpdir)
        converted = convert_audio(raw_audio, tmpdir)
        text = transcribe(converted)

    print(clean_transcript(text))


if __name__ == "__main__":
    main()
