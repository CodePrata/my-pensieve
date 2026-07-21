import { slugifyTitle } from './wiki-slug.util';

describe('slugifyTitle', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyTitle('Networking Basics')).toBe('networking-basics');
  });

  it('strips punctuation', () => {
    expect(slugifyTitle("Prisma's Migration Flow!")).toBe(
      'prisma-s-migration-flow',
    );
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugifyTitle('  --Weird Title--  ')).toBe('weird-title');
  });

  it('falls back to "untitled" when nothing alphanumeric remains', () => {
    expect(slugifyTitle('***')).toBe('untitled');
  });
});
