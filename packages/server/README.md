# Study Pro Server

OpenAI APIを使った学習コンテンツ生成サーバー

## セットアップ

### 1. 依存関係のインストール

```bash
cd packages/server
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成：

```bash
cp .env.example .env
```

`.env` を編集して、OpenAI APIキーを設定：

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. サーバー起動

開発モード（ホットリロード）：

```bash
npm run dev
```

本番モード：

```bash
npm run build
npm start
```

## API エンドポイント

### ヘルスチェック

```
GET /health
```

レスポンス：
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T...",
  "openaiConfigured": true
}
```

### 週次プラン生成

```
POST /api/planner/weekly-plan
```

リクエスト：
```json
{
  "domainName": "英語",
  "frequency": 3,
  "sessionDuration": 3
}
```

レスポンス：
```json
{
  "themes": ["基本文法の確認", "日常会話フレーズ", "リスニング練習"]
}
```

### 今日の学習セット生成

```
POST /api/planner/today-set
```

リクエスト：
```json
{
  "domainName": "英語",
  "themes": ["基本文法の確認", "日常会話フレーズ"],
  "sessionCount": 0,
  "sessionDuration": 3
}
```

レスポンス：
```json
{
  "mainTask": {
    "title": "現在完了形の基礎",
    "description": "have/has + 過去分詞の形を学びます"
  },
  "alternatives": [...]
}
```

### 2択問題生成

```
POST /api/planner/recall-question
```

リクエスト：
```json
{
  "domainName": "英語",
  "learningContent": "現在完了形の復習",
  "sessionDuration": 3
}
```

レスポンス：
```json
{
  "question": "現在完了形の基本形は何ですか？",
  "choices": ["have/has + 過去分詞", "be動詞 + 過去分詞"],
  "correctAnswer": "have/has + 過去分詞"
}
```

### 学習コンテンツ生成

```
POST /api/content/generate
```

リクエスト：
```json
{
  "learningContent": "現在完了形の復習",
  "domainName": "英語",
  "sessionDuration": 3
}
```

レスポンス：
```json
{
  "title": "現在完了形",
  "sections": [
    {
      "type": "explanation",
      "title": "基本",
      "content": "have/has + 過去分詞..."
    },
    ...
  ]
}
```

## 開発

### フロントエンドとの連携

フロントエンド（packages/web）は `http://localhost:3001` のAPIを呼び出します。

両方を起動する必要があります：

```bash
# ターミナル1: サーバー
cd packages/server
npm run dev

# ターミナル2: フロントエンド
cd packages/web
npm run dev
```

## トラブルシューティング

### OpenAI APIキーが認識されない

`.env` ファイルが正しい場所にあるか確認：
```bash
ls -la packages/server/.env
```

サーバーを再起動：
```bash
npm run dev
```

### CORS エラー

`.env` の `FRONTEND_URL` がフロントエンドのURLと一致しているか確認。
