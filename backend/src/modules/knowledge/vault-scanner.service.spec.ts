import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { PathLike } from 'fs';
import { VaultScannerService } from './vault-scanner.service';

jest.mock('fs/promises');

const mockedFs = fs as jest.Mocked<typeof fs>;

function dirent(name: string, isDirectory: boolean) {
  return {
    name,
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
  } as import('fs').Dirent;
}

describe('VaultScannerService', () => {
  let service: VaultScannerService;
  const configService = { get: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('/vault');
    service = new VaultScannerService(
      configService as unknown as ConfigService,
    );
  });

  it('recursively finds .md files under raw/ and parses their frontmatter', async () => {
    mockedFs.readdir.mockImplementation((dir) => {
      const dirStr = dir.toString();
      if (dirStr === path.join('/vault', 'raw')) {
        return Promise.resolve([
          dirent('text', true),
          dirent('screenshot', true),
        ] as never);
      }
      if (dirStr === path.join('/vault', 'raw', 'text')) {
        return Promise.resolve([dirent('note.md', false)] as never);
      }
      if (dirStr === path.join('/vault', 'raw', 'screenshot')) {
        return Promise.resolve([dirent('shot.md', false)] as never);
      }
      return Promise.resolve([] as never);
    });

    mockedFs.readFile.mockImplementation((filePath: PathLike) => {
      const pathStr =
        typeof filePath === 'string' ? filePath : filePath.toString();
      if (pathStr.endsWith('note.md')) {
        return Promise.resolve(
          [
            '---',
            'sourceType: "text"',
            'captureMethod: "capture_bot"',
            'capturedAt: "2026-07-20T10:00:00.000Z"',
            '---',
            'Body content',
          ].join('\n'),
        );
      }
      return Promise.resolve(
        [
          '---',
          'sourceType: "screenshot"',
          'captureMethod: "capture_bot"',
          'sourceUrl: "https://example.com"',
          'capturedAt: "2026-07-19T08:00:00.000Z"',
          '---',
          'Body content',
        ].join('\n'),
      );
    });

    const result = await service.scanRawFolder();

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'text',
          captureMethod: 'capture_bot',
          sourceUrl: null,
          rawFilePath: 'raw/text/note.md',
          capturedAt: new Date('2026-07-20T10:00:00.000Z'),
        }),
        expect.objectContaining({
          sourceType: 'screenshot',
          sourceUrl: 'https://example.com',
          rawFilePath: 'raw/screenshot/shot.md',
        }),
      ]),
    );
  });

  it('skips files with malformed/missing frontmatter instead of throwing', async () => {
    mockedFs.readdir.mockImplementation((dir) => {
      const dirStr = dir.toString();
      if (dirStr === path.join('/vault', 'raw')) {
        return Promise.resolve([
          dirent('bad.md', false),
          dirent('good.md', false),
        ] as never);
      }
      return Promise.resolve([] as never);
    });

    mockedFs.readFile.mockImplementation((filePath: PathLike) => {
      const pathStr =
        typeof filePath === 'string' ? filePath : filePath.toString();
      if (pathStr.endsWith('bad.md')) {
        return Promise.resolve('no frontmatter at all here');
      }
      return Promise.resolve(
        [
          '---',
          'sourceType: "text"',
          'captureMethod: "manual"',
          'capturedAt: "2026-07-20T10:00:00.000Z"',
          '---',
          'Body',
        ].join('\n'),
      );
    });

    const result = await service.scanRawFolder();

    expect(result).toHaveLength(1);
    expect(result[0].rawFilePath).toBe('raw/good.md');
  });

  it('returns an empty list without throwing when the raw/ folder does not exist', async () => {
    mockedFs.readdir.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const result = await service.scanRawFolder();

    expect(result).toEqual([]);
  });

  it('throws when OBSIDIAN_VAULT_PATH is not configured', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(service.scanRawFolder()).rejects.toThrow(
      /OBSIDIAN_VAULT_PATH/,
    );
  });
});
