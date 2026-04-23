/**
 * Extract auto-generated transcript from a YouTube video
 */

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function getTranscript(videoId: string): Promise<string> {
  // Fetch the YouTube video page to get caption track URL
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  const html = await pageRes.text();

  // Extract captions JSON from the page
  const captionMatch = html.match(/"captions":\s*(\{[^]*?"playerCaptionsTracklistRenderer"[^]*?\})\s*,\s*"videoDetails"/);
  if (!captionMatch) {
    throw new Error('자막을 찾을 수 없습니다. 자동 생성 자막이 있는지 확인해주세요.');
  }

  let captionData;
  try {
    captionData = JSON.parse(captionMatch[1]);
  } catch {
    throw new Error('자막 데이터를 파싱할 수 없습니다.');
  }

  const tracks = captionData?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    throw new Error('사용 가능한 자막 트랙이 없습니다.');
  }

  // Prefer Korean, fallback to first available
  const koTrack = tracks.find((t: { languageCode: string }) => t.languageCode === 'ko');
  const track = koTrack || tracks[0];

  // Fetch the actual transcript
  const captionUrl = track.baseUrl + '&fmt=json3';
  const captionRes = await fetch(captionUrl);
  const captionJson = await captionRes.json();

  // Extract text from events
  const lines: string[] = [];
  for (const event of captionJson.events || []) {
    if (event.segs) {
      const text = event.segs.map((s: { utf8: string }) => s.utf8 || '').join('');
      if (text.trim()) lines.push(text.trim());
    }
  }

  if (lines.length === 0) {
    throw new Error('자막 내용이 비어있습니다.');
  }

  return lines.join(' ');
}

export async function getVideoTitle(videoId: string): Promise<string> {
  const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
  const data = await res.json();
  return data.title || '';
}
