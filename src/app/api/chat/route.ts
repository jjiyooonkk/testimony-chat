import { NextResponse } from 'next/server';
import { chat } from '@/lib/gemini';
import type { Persona } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { persona, messages } = await request.json() as {
      persona: Persona;
      messages: { role: 'user' | 'model'; content: string }[];
    };

    if (!persona || !messages || messages.length === 0) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const reply = await chat(persona, messages);
    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
