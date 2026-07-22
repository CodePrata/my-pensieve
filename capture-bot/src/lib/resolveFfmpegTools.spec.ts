import * as path from 'path';
import {
  deriveFfprobePathFromFfmpeg,
  resolveFfmpegTools,
} from './resolveFfmpegTools';

describe('resolveFfmpegTools', () => {
  it('derives ffprobe path from ffmpeg on Windows', () => {
    expect(deriveFfprobePathFromFfmpeg('C:/tools/ffmpeg.exe')).toBe(
      'C:/tools/ffprobe.exe',
    );
  });

  it('resolves ffmpegLocation as the directory containing both binaries', () => {
    expect(
      resolveFfmpegTools(
        'C:/Users/Admin/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe',
      ),
    ).toEqual({
      ffmpegPath:
        'C:/Users/Admin/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe',
      ffprobePath:
        'C:/Users/Admin/AppData/Local/Microsoft/WinGet/Links/ffprobe.exe',
      ffmpegLocation: 'C:/Users/Admin/AppData/Local/Microsoft/WinGet/Links',
    });
  });

  it('prefers explicit FFPROBE_PATH over derived path', () => {
    expect(
      resolveFfmpegTools('C:/tools/ffmpeg.exe', 'D:/custom/ffprobe.exe'),
    ).toEqual({
      ffmpegPath: 'C:/tools/ffmpeg.exe',
      ffprobePath: 'D:/custom/ffprobe.exe',
      ffmpegLocation: path.dirname('C:/tools/ffmpeg.exe'),
    });
  });
});
