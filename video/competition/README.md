# Vertex Palace Competition Video

The final English demo is [vertex-palace-build-week-demo-en.mp4](./vertex-palace-build-week-demo-en.mp4).

- Duration: 170.739 seconds (2:50.739)
- Video: 1920x1080, H.264, 30 fps
- Audio: English neural narration, AAC
- Captions: burned into the video and also available as
  [vertex-palace-build-week-demo-en.srt](./vertex-palace-build-week-demo-en.srt)
- Voice: `en-US-AndrewNeural`, rate `+10%`
- Sources: `image/01.png` through `image/07.png`

The story covers the original problem, the 2D-to-3D memory-palace idea, how
Codex with GPT-5.6 was used, two preregistered studies, preserved negative
results, the Generation 3 engineering direction, and the public product and
research repositories.

Rebuild from the repository root:

```powershell
python -m pip install --user edge-tts
powershell -NoProfile -ExecutionPolicy Bypass -File video/competition/build-video.ps1
```

The script requires `ffmpeg` and `ffprobe`. It creates the MP4, synchronized
SRT, and a machine-readable JSON manifest. Intermediate audio, video segments,
and QA frames stay in the ignored `video/competition/build/` directory.

---

# Vertex Palace 参赛影片（简体中文）

最终英文影片为 [vertex-palace-build-week-demo-en.mp4](./vertex-palace-build-week-demo-en.mp4)，
时长 2 分 50.739 秒，使用 1080p H.264 画面与英文神经语音。英文字幕已经烧录进影片，
同时保留独立 [SRT 字幕](./vertex-palace-build-week-demo-en.srt)。

影片依序说明：为什么要做 Vertex Palace、从二维资料转换为三维记忆宫殿的灵感、
如何使用 Codex with GPT-5.6 开发、两轮预注册研究与负面结果、第三代研发方向，
以及公开的产品与 benchmark 仓库。`build-video.ps1` 可从七张原图与英文讲稿完整重建影片。
