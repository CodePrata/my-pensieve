# ADR-018: Asynchronous Video Audio Transcription Enrichment

**Status:** Accepted
**Date:** 2026-07-22

## Context

ADR-009 strictly limited link handling to metadata and caption extraction[cite: 2] to keep the capture bot lightweight and avoid risks associated with full media processing[cite: 2]. However, video-based content (e.g., TikTok, YouTube Shorts, Instagram Reels) often contains critical spoken insights that are completely missing from post titles or oEmbed metadata.

To capture this missing knowledge without compromising the reliability of note generation or violating system performance constraints, an optional enrichment step is required.

## Decision

We will extend the link capture pipeline to perform **asynchronous speech-to-text enrichment** using local tools.

1. **Note Creation Priority:** The primary capture path remains metadata-driven (oEmbed/link parsing). The Obsidian note must be created and saved immediately upon link ingestion.
2. **Non-Blocking Background Enrichment:** Following initial note creation, an asynchronous worker will attempt to:
   - Extract the video audio stream into a temporary directory using `yt-dlp` (`yt-dlp-exec`).
   - Normalize the audio using `ffmpeg` to standard Speech-to-Text format (`mono`, `16 kHz WAV`).
   - Transcribe the processed audio using a locally hosted Whisper solution (e.g., `whisper.cpp` or `faster-whisper`).
3. **Graceful Fallback & Clean-up:** If audio download, conversion, or STT fails, or if the transcript is empty/music-only, the error is logged and execution halts gracefully without affecting the previously saved note. All temporary audio files must be cleaned up in a `finally` block.
4. **Vault Update:** If meaningful speech is transcribed, a `## Video Transcript` section will be appended to the corresponding Markdown note in the vault.

## Consequences

- **Dependencies:** Requires local installations of `yt-dlp`, `ffmpeg`, and a local Whisper STT engine.
- **System Overhead:** Increases CPU/VRAM usage during active background transcription tasks.
- **Resilience:** The capture bot remains low-friction and fast, as transcription failures or delays never prevent note creation.
- **Extensibility:** The `download -> normalize -> transcribe -> append` workflow is decoupled from specific platforms, allowing immediate support for any URL compatible with `yt-dlp`.