import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    // 日本語専用システムプロンプト
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-realtime-preview",
      messages: [
        {
          role: "system",
          content: `あなたは日本語専用のAIアシスタントです。以下のルールを厳密に守ってください：

1. 必ず100%純粋な日本語のみで応答してください
2. 英語やその他の言語は一切使用しないでください
3. 自然で流暢な日本語で話してください
4. 丁寧語を使用してください
5. 短時間で理解しやすい回答を心がけてください
6. 音声での応答に適した話し言葉で答えてください

ユーザーと自然な日本語会話を行ってください。`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      // 日本語応答に最適化した設定
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const reply = completion.choices[0]?.message?.content || 'すみません、応答を生成できませんでした。';

    // 音声生成（日本語特化）
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // 日本語に適した音声
      input: reply,
      speed: 0.9, // 聞き取りやすい速度
      response_format: "mp3"
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('音声生成エラー:', error);
    return NextResponse.json(
      { error: '音声生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
