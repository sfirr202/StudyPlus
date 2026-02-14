# AI統合ガイド

最終更新：2026-02-08

## 概要

Study Pro v1（MVP）では、AI機能は実装されていません。このドキュメントは、将来AIを統合する際の手順と、現在の構造の説明です。

## 現在の状態（MVP）

### Feature Flag

- **AI_ENABLED**: `false`（デフォルト）
- すべてのAI機能はスタブ実装（`MockAIService`）で動作
- 外部AI APIは呼び出されない

### 実装済みの構造

| 構成要素 | 状態 | ファイル |
|---|---|---|
| AIサービスインターフェース | ✅ 実装済み | `packages/web/src/services/aiService.ts` |
| スタブ実装（MockAIService） | ✅ 実装済み | `packages/web/src/services/aiService.ts` |
| Feature Flag定義 | ✅ 実装済み | `.env.example` |
| セキュリティ設定 | ✅ 実装済み | `.gitignore` |
| ドキュメント | ✅ 実装済み | `docs/02_Design.md § 13` |

## 動作確認手順

### 1. 基本動作確認（AI_ENABLED=false）

```bash
# リポジトリのルートで実行

# 1. 環境変数ファイルを作成
cp .env.example .env

# 2. AI_ENABLEDがfalseであることを確認
cat .env | grep AI_ENABLED
# 出力: AI_ENABLED=false

# 3. 依存関係をインストール
cd packages/web
npm install

# 4. 開発サーバーを起動
npm run dev

# 5. ブラウザで http://localhost:5173 を開く
```

**確認項目**:
- ✅ Today Task が表示される（固定テンプレート）
- ✅ 「別案に変える」でルールベース別案が表示される
- ✅ Recall が表示される（固定テンプレート3種類）
- ✅ すべての機能が正常に動作する

### 2. 機密情報の非露出確認

```bash
# ブラウザの開発者ツールを開く（F12）

# 1. Consoleタブで以下を実行
Object.keys(window).filter(k => k.includes('API') || k.includes('KEY'))
# → 空の配列 [] が返ることを確認

# 2. Consoleタブで以下を実行
console.log(import.meta.env)
# → OPENAI_API_KEY, ANTHROPIC_API_KEY などが含まれないことを確認

# 3. Networkタブを確認
# → openai.com, anthropic.com などへのリクエストがないことを確認
```

**確認項目**:
- ✅ `window` オブジェクトにAPIキーが含まれない
- ✅ 環境変数にAPIキーが含まれない
- ✅ 外部AI APIへのリクエストが発生しない

### 3. Feature Flagの動作確認（将来）

現在は未実装のため、手順のみ記載。

```bash
# .env ファイルを編集
echo "AI_ENABLED=true" > .env
echo "OPENAI_API_KEY=sk-test-..." >> .env

# サーバーを再起動
npm run dev

# 確認項目:
# - AI生成機能が有効化される
# - サーバー側でOpenAI APIが呼ばれる
# - クライアント側にAPIキーが露出しない
```

## スタブ実装の詳細

### MockAIService

現在実装されているスタブ：

#### 1. Today Task生成

```typescript
async generateTodayTask(context: AIContext): Promise<TodayTask> {
  // 固定テンプレートから選択
  const templates = [
    { title: '英単語を5つ覚える', ... },
    { title: 'リスニング練習', ... },
    { title: '文法問題を解く', ... },
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}
```

#### 2. 別案生成

```typescript
async generateAlternatives(
  currentTask: TodayTask,
  reason: string,
  context: AIContext
): Promise<TodayTask[]> {
  // ルールベース生成（難易度・時間維持、タイプ変更優先）
  const alternatives = [...];
  return alternatives;
}
```

#### 3. Recall Item生成

```typescript
async generateRecallItem(
  content: string,
  difficulty: 1 | 2 | 3
): Promise<RecallItem> {
  // 固定テンプレート（3種類）
  return {
    question: '今日学んだ内容を理解できましたか？',
    choices: ['理解できた', 'もう少し復習が必要'],
    correctAnswer: '理解できた',
  };
}
```

## 将来のAI統合手順

### Phase 1: サーバー側実装

1. **サーバーの準備**
   ```bash
   # サーバーディレクトリの作成
   mkdir -p packages/server
   cd packages/server
   npm init -y
   npm install express openai dotenv
   ```

2. **AIエンドポイントの実装**
   ```typescript
   // packages/server/src/routes/ai.ts
   import express from 'express';
   import { OpenAI } from 'openai';
   
   const router = express.Router();
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   
   router.post('/today-task', async (req, res) => {
     if (process.env.AI_ENABLED !== 'true') {
       // スタブ応答
       return res.json({ source: 'stub', task: {...} });
     }
     
     // OpenAI API呼び出し
     const response = await openai.chat.completions.create({...});
     return res.json({ source: 'ai', task: parseResponse(response) });
   });
   
   export default router;
   ```

3. **環境変数の設定**
   ```bash
   # packages/server/.env
   AI_ENABLED=true
   OPENAI_API_KEY=sk-...
   AI_MODEL=gpt-4
   AI_MAX_TOKENS=1000
   ```

### Phase 2: クライアント側の接続

1. **API呼び出しの実装**
   ```typescript
   // packages/web/src/services/aiService.ts
   export class APIAIService implements IAIService {
     private baseUrl = '/api/ai';
     
     async generateTodayTask(context: AIContext): Promise<TodayTask> {
       const response = await fetch(`${this.baseUrl}/today-task`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ context }),
       });
       
       const data = await response.json();
       return data.task;
     }
   }
   
   // 環境変数で切り替え
   export const aiService = 
     import.meta.env.VITE_USE_SERVER_AI === 'true'
       ? new APIAIService()
       : new MockAIService();
   ```

2. **フォールバック機構の追加**
   ```typescript
   export class AIServiceWithFallback implements IAIService {
     private primary: IAIService;
     private fallback: IAIService;
     
     constructor() {
       this.primary = new APIAIService();
       this.fallback = new MockAIService();
     }
     
     async generateTodayTask(context: AIContext): Promise<TodayTask> {
       try {
         return await this.primary.generateTodayTask(context);
       } catch (error) {
         console.warn('AI service failed, using fallback', error);
         return await this.fallback.generateTodayTask(context);
       }
     }
   }
   ```

### Phase 3: 段階的ロールアウト

1. **A/Bテスト設定**
   - ユーザーの10%にAI機能を有効化
   - 提案受諾率、NPS、継続率を比較

2. **監視とアラート**
   - AI API のレスポンスタイム監視
   - エラー率監視
   - コスト監視

3. **段階的拡大**
   - 10% → 25% → 50% → 100%
   - 各段階で品質とコストを確認

## テスト

### 自動テスト（将来実装）

```typescript
// packages/web/src/services/aiService.test.ts
describe('AIService', () => {
  describe('MockAIService', () => {
    it('固定テンプレートを返す', async () => {
      const service = new MockAIService();
      const task = await service.generateTodayTask(mockContext);
      
      expect(task.source).toBe('default');
      expect(task.title).toBeDefined();
    });
    
    it('別案は同じ難易度を維持する', async () => {
      const service = new MockAIService();
      const currentTask = { difficultyBand: 2, timeBudget: 3, ... };
      const alternatives = await service.generateAlternatives(
        currentTask,
        'too_hard',
        mockContext
      );
      
      expect(alternatives).toHaveLength(2);
      alternatives.forEach(alt => {
        expect(alt.difficultyBand).toBe(2);
        expect(alt.timeBudget).toBe(3);
      });
    });
  });
  
  describe('Feature Flag', () => {
    it('AI_ENABLED=falseではスタブが使用される', () => {
      process.env.AI_ENABLED = 'false';
      const service = createAIService();
      
      expect(service).toBeInstanceOf(MockAIService);
    });
  });
  
  describe('Security', () => {
    it('クライアントにAPIキーが露出しない', () => {
      const clientEnv = getClientEnvironment();
      
      expect(clientEnv.OPENAI_API_KEY).toBeUndefined();
      expect(clientEnv.ANTHROPIC_API_KEY).toBeUndefined();
    });
  });
});
```

### 手動テストチェックリスト

#### MVP段階（AI_ENABLED=false）

- [ ] すべての画面が正常に表示される
- [ ] Today Task が固定テンプレートで表示される
- [ ] 「別案に変える」でルールベース別案が表示される
- [ ] Recall が固定テンプレートで表示される
- [ ] ブラウザの開発者ツールで機密情報が露出していない
- [ ] ネットワークタブで外部AI APIへのリクエストがない

#### AI統合後（AI_ENABLED=true）

- [ ] AI生成のToday Taskが表示される
- [ ] AI生成の別案が表示される
- [ ] AI生成のRecallが表示される
- [ ] AI APIエラー時にフォールバックが動作する
- [ ] クライアントにAPIキーが露出していない
- [ ] サーバー側でのみAI APIが呼ばれている

## セキュリティチェックリスト

### 開発時

- [ ] `.env` ファイルをリポジトリにコミットしていない
- [ ] `.gitignore` に `.env` が含まれている
- [ ] `.env.example` には実際の値が含まれていない
- [ ] コード中にAPIキーのハードコードがない

### デプロイ時

- [ ] 本番環境でSecretsマネージャーを使用している
- [ ] APIキーはサーバー側の環境変数のみに存在する
- [ ] クライアントバンドルにAPIキーが含まれていない
- [ ] ログにAPIキーやユーザーの個人情報が出力されない

### 運用時

- [ ] APIキーを定期的にローテーションしている
- [ ] AI APIの使用量を監視している
- [ ] 不正利用の検知とアラートが設定されている

## トラブルシューティング

### Q: AI機能が動作しない

**A**: 以下を確認してください：

1. `AI_ENABLED` が `true` に設定されているか
2. `OPENAI_API_KEY` が正しく設定されているか
3. サーバーが起動しているか
4. ネットワークエラーが発生していないか

### Q: クライアントでAPIキーが見える

**A**: これは重大なセキュリティ問題です。直ちに以下を実施：

1. APIキーをローテーション（無効化して新規作成）
2. クライアントコードからAPIキーを削除
3. サーバー側のみでAPIキーを使用するよう修正
4. `.gitignore` に `.env` が含まれているか確認
5. Git履歴から機密情報を削除（`git filter-branch` 等）

### Q: AI応答が遅い

**A**: 以下を確認・実施してください：

1. AI APIのレスポンスタイムを確認
2. タイムアウト設定を追加（5秒など）
3. タイムアウト時にフォールバック（スタブ）を使用
4. キャッシュ機構の導入を検討

## 参照

- `docs/02_Design.md § 13` - AI方針とアーキテクチャ
- `docs/05_Decisions.md` - DEC-20260208-010
- `packages/web/src/services/aiService.ts` - AIサービス実装
- `.env.example` - 環境変数テンプレート

---

**重要**: MVPではAI機能は実装されていません。このドキュメントは将来の統合のためのガイドです。
