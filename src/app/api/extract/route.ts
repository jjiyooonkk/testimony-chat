import { NextResponse } from 'next/server';
import { extractVideoId, getTranscript, getVideoTitle } from '@/lib/youtube';
import { extractPersona } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const videoId = extractVideoId(url || '');
    if (!videoId) {
      return NextResponse.json({ error: '유효한 YouTube URL이 아닙니다.' }, { status: 400 });
    }

    const [transcript, title] = await Promise.all([
      getTranscript(videoId),
      getVideoTitle(videoId),
    ]);

    const persona = await extractPersona(transcript, title);

    return NextResponse.json({
      persona,
      videoId,
      title,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
