import * as fs from 'fs/promises';
import * as path from 'path';
import { writeRawFile, appendLog, filenameStemFromDate } from './vaultWriter';
import { CaptureResult } from '../types';

jest.mock('fs/promises');

describe('filenameStemFromDate', () => {
  it('strips colons, dashes, and milliseconds for a filesystem-safe stem', () => {
    const date = new Date('2026-07-22T14:30:00.000Z');
    expect(filenameStemFromDate(date)).toBe('20260722T143000Z');
  });
});

describe('writeRawFile', () => {
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates raw/<sourceType>/ recursively and writes frontmatter + body', async () => {
    const vaultPath = '/vault';
    const result = await writeRawFile(
      vaultPath,
      'text',
      '20260722T143000Z',
      { capturedAt: '2026-07-22T14:30:00Z', sourceType: 'text', captureMethod: 'capture_bot', processed: false },
      'Hello world',
    );

    expect(mockedFs.mkdir).toHaveBeenCalledWith(
      path.join(vaultPath, 'raw', 'text'),
      { recursive: true },
    );

    expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenContent] = mockedFs.writeFile.mock.calls[0];
    expect(writtenPath).toBe(path.join(vaultPath, 'raw', 'text', '20260722T143000Z.md'));
    expect(String(writtenContent)).toContain('---');
    expect(String(writtenContent)).toContain('sourceType: "text"');
    expect(String(writtenContent)).toContain('Hello world');

    expect(result).toBe('raw/text/20260722T143000Z.md');
  });
});

describe('appendLog', () => {
  const mockedFs = fs as jest.Mocked<typeof fs>;
  const appendFile = jest.fn();
  const close = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.open.mockResolvedValue({ appendFile, close } as never);
  });

  it('opens log.md in append-only mode and writes a single formatted line', async () => {
    const entry: CaptureResult = {
      sourceType: 'text',
      rawFilePath: 'raw/text/20260722T143000Z.md',
      capturedAt: '2026-07-22T14:30:00Z',
    };

    await appendLog('/vault', entry);

    expect(mockedFs.open).toHaveBeenCalledWith(path.join('/vault', 'log.md'), 'a');
    expect(appendFile).toHaveBeenCalledWith(
      '- [2026-07-22T14:30:00Z] text — raw/text/20260722T143000Z.md\n',
      'utf-8',
    );
    expect(close).toHaveBeenCalled();
  });

  it('suffixes the sourceUrl when present', async () => {
    const entry: CaptureResult = {
      sourceType: 'github',
      rawFilePath: 'raw/github/20260722T143000Z.md',
      sourceUrl: 'https://github.com/foo/bar',
      capturedAt: '2026-07-22T14:30:00Z',
    };

    await appendLog('/vault', entry);

    expect(appendFile).toHaveBeenCalledWith(
      '- [2026-07-22T14:30:00Z] github — raw/github/20260722T143000Z.md (https://github.com/foo/bar)\n',
      'utf-8',
    );
  });
});
