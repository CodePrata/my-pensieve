import { SourceType } from '../types';

export function guessSourceType(url: string): SourceType {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return 'other';
  }

  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('github.com')) return 'github';
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';

  return 'other';
}
