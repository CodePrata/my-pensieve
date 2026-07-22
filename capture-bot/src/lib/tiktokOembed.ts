export interface TikTokOembedData {
  title: string;
  author_name: string;
  author_url: string;
}

const TIKTOK_OEMBED_BASE = 'https://www.tiktok.com/oembed';
const OEMBED_TIMEOUT_MS = 10_000;

export function isTikTokUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com');
  } catch {
    return false;
  }
}

export function formatTikTokNote(url: string, data: TikTokOembedData): string {
  const title = data.title.trim() || 'TikTok Video';
  const creator =
    data.author_name && data.author_url
      ? `[${data.author_name}](${data.author_url})`
      : data.author_name || data.author_url || 'Unknown';

  return [
    `# ${title}`,
    '',
    `**Video Caption/Title:** ${title}`,
    '',
    `**Creator:** ${creator}`,
    '',
    `**Original URL:** ${url}`,
  ].join('\n');
}

export function formatBookmarkNote(url: string): string {
  return [`# ${url}`, '', url].join('\n');
}

export async function fetchTikTokOembed(
  url: string,
): Promise<TikTokOembedData | null> {
  const oembedUrl = `${TIKTOK_OEMBED_BASE}?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as Record<string, unknown>;
    const title = typeof json.title === 'string' ? json.title : '';
    const author_name =
      typeof json.author_name === 'string' ? json.author_name : '';
    const author_url =
      typeof json.author_url === 'string' ? json.author_url : '';

    if (!title && !author_name) {
      return null;
    }

    return { title, author_name, author_url };
  } catch {
    return null;
  }
}
