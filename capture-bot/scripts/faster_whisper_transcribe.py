#!/usr/bin/env python3
"""Minimal faster-whisper CLI for capture-bot ADR-018 enrichment."""

import sys

from faster_whisper import WhisperModel


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: faster_whisper_transcribe.py <model> <wav_path>", file=sys.stderr)
        return 2

    model_name, wav_path = sys.argv[1], sys.argv[2]
    model = WhisperModel(model_name)
    segments, _info = model.transcribe(wav_path)
    text = " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
