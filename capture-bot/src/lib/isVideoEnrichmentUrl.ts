import { isTikTokUrl } from './tiktokOembed';

/**
 * Returns true for video URLs eligible for ADR-018 async transcription enrichment.
 * Supports TikTok, YouTube, Instagram Reels, X/Twitter posts, and Reddit video links.
 */
export function isVideoEnrichmentUrl(url: string): boolean {
  if (isTikTokUrl(url)) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (host.includes('youtube.com') || host === 'youtu.be') {
      return true;
    }

    if (host.includes('instagram.com') && (pathname.includes('/reel/') || pathname.includes('/reels/'))) {
      return true;
    }

    if ((host.includes('twitter.com') || host === 'x.com') && pathname.includes('/status/')) {
      return true;
    }

    if (host === 'v.redd.it') {
      return true;
    }

    if (host.includes('reddit.com') && (pathname.includes('/comments/') || pathname.includes('/video/'))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
