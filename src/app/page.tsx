'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { Persona } from '@/lib/gemini';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function HomePage() {
  const [step, setStep] = useState<'input' | 'loading' | 'chat'>('input');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState('');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [thumbnail, setThumbnail] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleExtract() {
    if (!youtubeUrl.trim()) return;
    setStep('loading');
    setError('');
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPersona(data.persona);
      setThumbnail(data.thumbnailUrl);
      setMessages([{
        role: 'model',
        content: `안녕하세요! 저는 ${data.persona.name}이에요. ${data.persona.event}에서 간증했었는데, 혹시 궁금한 게 있으신가요? 편하게 말씀해주세요 :)`,
      }]);
      setStep('chat');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setStep('input');
    }
  }

  async function handleSend() {
    if (!input.trim() || !persona || sending) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([...newMessages, { role: 'model', content: data.reply }]);
    } catch {
      setMessages([...newMessages, { role: 'model', content: '죄송해요, 잠시 오류가 났어요. 다시 말씀해주시겠어요?' }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // --- Input Screen ---
  if (step === 'input' || step === 'loading') {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-bold">Testimony Chat</h1>
            <p className="text-sm text-stone-500 mt-1">
              간증 영상 속 인물과 대화해보세요
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Input
              placeholder="YouTube 링크를 붙여넣기"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              className="text-center rounded-xl h-12"
              disabled={step === 'loading'}
            />
            <Button
              className="w-full rounded-xl h-12"
              onClick={handleExtract}
              disabled={step === 'loading' || !youtubeUrl.trim()}
            >
              {step === 'loading' ? '영상 분석 중...' : '대화 시작하기'}
            </Button>
          </div>

          {step === 'loading' && (
            <p className="text-xs text-stone-400 animate-pulse">
              자막을 추출하고 페르소나를 만들고 있어요...
            </p>
          )}
        </div>
      </main>
    );
  }

  // --- Chat Screen ---
  return (
    <div className="flex flex-col h-full max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
        {thumbnail && (
          <img src={thumbnail} alt="" className="w-10 h-10 rounded-full object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{persona?.name}</div>
          <div className="text-xs text-stone-500 truncate">
            {persona?.age} | {persona?.region} | {persona?.event}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-xs"
          onClick={() => {
            setStep('input');
            setMessages([]);
            setPersona(null);
          }}
        >
          새 영상
        </Button>
      </div>

      {/* Persona Card */}
      <div className="px-4 py-2">
        <Card className="bg-amber-50/50">
          <CardContent className="py-2 px-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              {persona?.summary}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-stone-800 text-white rounded-br-md'
                  : 'bg-white border rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-stone-400">
              입력 중...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full h-10"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="rounded-full h-10 px-4"
          >
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}
