/**
 * OpenAI Service
 * 
 * OpenAI APIとの統合
 */

import OpenAI from 'openai';

// OpenAIクライアントを取得（遅延初期化）
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    throw new Error('OPENAI_API_KEY is not configured. Please set it in packages/server/.env');
  }

  return new OpenAI({ apiKey });
}

export interface WeeklyPlanRequest {
  domainName: string;
  frequency: number;
  sessionDuration: number;
}

export interface TodaySetRequest {
  domainName: string;
  themes: string[];
  sessionCount: number;
  sessionDuration: number;
}

export interface RecallQuestionRequest {
  domainName: string;
  learningContent: string;
  sessionDuration: number;
}

export interface LearningContentRequest {
  learningContent: string;
  domainName: string;
  sessionDuration: number;
}

export interface SuggestTopicsRequest {
  domainName: string;
  sessionCount: number;
}

/**
 * 週次プランを生成
 */
export async function generateWeeklyPlan(request: WeeklyPlanRequest) {
  const prompt = `あなたは学習計画の専門家です。以下の条件で週次学習プランを作成してください。

学習領域: ${request.domainName}
週の学習回数: ${request.frequency}回
1回の学習時間: ${request.sessionDuration}分

要件:
- 学習テーマを${request.frequency}個提案してください
- 各テーマは${request.sessionDuration}分で完了できる内容にしてください
- 初心者でも理解できる内容にしてください
- 段階的に難易度が上がるようにしてください

以下のJSON形式で出力してください:
{
  "themes": ["テーマ1", "テーマ2", ...]
}`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{"themes": []}';
  return JSON.parse(content);
}

/**
 * 今日の学習セットを生成
 */
export async function generateTodaySet(request: TodaySetRequest) {
  const currentTheme = request.themes[request.sessionCount % request.themes.length] || '基礎学習';

  const prompt = `あなたは学習計画の専門家です。以下の条件で今日の学習タスクを作成してください。

学習領域: ${request.domainName}
今日のテーマ: ${currentTheme}
学習時間: ${request.sessionDuration}分

要件:
- メインタスクを1つ提案してください
- 別案を3つ提案してください（難易度や形式を変える）
- すべて${request.sessionDuration}分で完了できる内容にしてください

以下のJSON形式で出力してください:
{
  "mainTask": {
    "title": "タスクタイトル",
    "description": "タスクの説明"
  },
  "alternatives": [
    {"title": "別案1", "description": "説明"},
    {"title": "別案2", "description": "説明"},
    {"title": "別案3", "description": "説明"}
  ]
}`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content);
}

/**
 * 2択問題を生成
 */
export async function generateRecallQuestion(request: RecallQuestionRequest) {
  const prompt = `あなたは学習評価の専門家です。以下の学習内容から2択問題を作成してください。

学習領域: ${request.domainName}
学習内容: ${request.learningContent}

要件:
- 学習内容の理解度を確認する2択問題を作成してください
- 問題文は具体的にしてください
- 選択肢は明確に区別できるようにしてください

以下のJSON形式で出力してください:
{
  "question": "問題文",
  "choices": ["選択肢1", "選択肢2"],
  "correctAnswer": "正解の選択肢"
}`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content);
}

/**
 * 学習コンテンツを生成
 */
export async function generateLearningContent(request: LearningContentRequest) {
  // 学習時間に応じたコンテンツ量の指示
  let contentGuidance = '';
  if (request.sessionDuration === 1) {
    contentGuidance = `
【1分で読める超短縮版】
- セクションは2個まで（基本説明 + 例または練習のどちらか1つ）
- 各セクションは2-3文で簡潔に
- 最も重要なポイント1つだけに絞ってください
- 詳細は省略し、要点のみを伝えてください`;
  } else if (request.sessionDuration === 3) {
    contentGuidance = `
【3分で読める標準版】
- セクションは3個（基本説明 + 例 + 練習またはヒント）
- 各セクションは4-6文程度
- 重要なポイント2-3個を含めてください
- 例は1-2個に絞ってください`;
  } else if (request.sessionDuration === 10) {
    contentGuidance = `
【10分でじっくり学べる詳細版】
- セクションは4-5個（詳しい説明 + 複数の例 + 練習 + 応用やヒント）
- 各セクションは6-10文で詳しく説明してください
- 背景知識や理由も含めて解説してください
- 具体例を3-4個含めてください
- 理解を深めるための補足情報や応用例も追加してください`;
  }

  const prompt = `あなたは${request.domainName}の教育者です。以下の学習内容について、${request.sessionDuration}分で学べる教材を作成してください。

学習内容: ${request.learningContent}

要件:${contentGuidance}
- 初心者でも理解できる言葉で説明してください
- type は "explanation", "example", "practice", "tip" のいずれかを使用してください

以下のJSON形式で出力してください:
{
  "title": "学習内容のタイトル",
  "sections": [
    {
      "type": "explanation",
      "title": "基本",
      "content": "説明文"
    },
    {
      "type": "example",
      "title": "例",
      "content": "具体例"
    },
    {
      "type": "practice",
      "title": "練習",
      "content": "練習問題"
    }
  ]
}

注意: contentフィールドには改行を\\nで表現してください`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content);
}

/**
 * 学習トピックを提案
 */
export async function suggestLearningTopics(request: SuggestTopicsRequest) {
  const progressGuidance = request.sessionCount === 0
    ? '初心者向けの基礎的なトピックから始めてください'
    : `学習${request.sessionCount}回目を想定し、段階的に難易度を上げた内容を含めてください`;

  const prompt = `あなたは${request.domainName}の学習アドバイザーです。学習者が次に何を学ぶべきか提案してください。

学習領域: ${request.domainName}
進捗: ${progressGuidance}

要件:
- 4つの具体的な学習トピックを提案してください
- 各トピックは明確で分かりやすい名称にしてください
- 初心者から中級者まで段階的に学べる内容にしてください
- 実践的で役立つトピックを選んでください

以下のJSON形式で出力してください:
{
  "topics": [
    {
      "title": "トピック名",
      "description": "簡潔な説明（1文）",
      "difficulty": "beginner|intermediate|advanced"
    }
  ]
}`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content);
}
