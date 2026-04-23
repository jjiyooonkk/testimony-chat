import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface Persona {
  name: string;
  age: string;
  region: string;
  event: string;
  summary: string;
  personality: string;
}

export async function extractPersona(transcript: string, videoTitle: string): Promise<Persona> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `다음은 간증 영상의 자막입니다. 아래 정보를 추출해주세요.

영상 제목: ${videoTitle}
자막 내용: ${transcript.slice(0, 5000)}

JSON 형식으로만 응답해주세요 (코드블록 없이):
{
  "name": "간증자 이름",
  "age": "나이 또는 연령대",
  "region": "살고 있는 지역",
  "event": "참석한 집회/행사 이름",
  "summary": "간증 내용 3-4문장 요약",
  "personality": "간증 내용에서 유추할 수 있는 성격, 말투, 감정 특징 (2-3문장)"
}

정보가 영상에서 명확하지 않으면 자막 내용에서 최대한 유추해주세요.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('페르소나 추출 실패');

  return JSON.parse(jsonMatch[0]);
}

export async function chat(
  persona: Persona,
  messages: { role: 'user' | 'model'; content: string }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const systemPrompt = `당신은 "${persona.name}"입니다. 실제 간증을 한 사람으로서 대화합니다.

프로필:
- 이름: ${persona.name}
- 나이: ${persona.age}
- 지역: ${persona.region}
- 참석 집회: ${persona.event}
- 간증 요약: ${persona.summary}
- 성격/말투: ${persona.personality}

규칙:
- ${persona.name}의 말투와 성격으로 자연스럽게 대화하세요
- 간증 내용을 바탕으로 대화하되, 자연스럽게 확장해도 됩니다
- 따뜻하고 친근하게, 실제 사람처럼 대화하세요
- 상대방이 관심을 보이면 간증 경험을 더 자세히 나눠주세요
- 한국어로 대화하세요
- 답변은 2-3문장 정도로 짧고 자연스럽게 하세요`;

  const chatHistory = messages.map((m) => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  const chatSession = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `안녕하세요! 저는 ${persona.name}이에요. 반갑습니다 :)` }] },
      ...chatHistory.slice(0, -1),
    ],
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chatSession.sendMessage(lastMessage.content);
  return result.response.text();
}
