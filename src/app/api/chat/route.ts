import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 音声チャットAPI呼び出し開始');
    
    const { message } = await request.json();

    if (!message) {
      console.log('❌ メッセージが空です');
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    console.log('📝 受信メッセージ:', message);

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY が設定されていません');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log('🤖 OpenAI API呼び出し中...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
7. 簡潔で要点を絞った回答をしてください

ユーザーと自然な日本語会話を行ってください。`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const reply = completion.choices[0]?.message?.content || 'すみません、応答を生成できませんでした。';
    console.log('✅ テキスト生成完了:', reply);

    console.log('🎵 音声生成開始...');
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: reply,
      speed: 0.9,
      response_format: "mp3"
    });

    console.log('✅ 音声生成完了');

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
    console.error('❌ 音声生成エラー詳細:', error);
    
    // TypeScript型安全なエラーハンドリング
    let errorMessage = 'Unknown error';
    let errorStatus = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('エラーメッセージ:', errorMessage);
      console.error('エラースタック:', error.stack);
    }
    
    // OpenAI APIエラーの型安全チェック
    if (error && typeof error === 'object' && 'status' in error) {
      errorStatus = (error as any).status;
      console.error('APIステータス:', errorStatus);
    }
    
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('APIレスポンス:', (error as any).response);
    }

    return NextResponse.json(
      { 
        error: '音声生成中にエラーが発生しました',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
