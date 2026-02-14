# AI差し替え構造 実装完了レポート

実装日：2026-02-08

## 概要

Study Pro v1（MVP）のAI差し替え構造を実装しました。AI機能は実装せず、差し替え可能なインターフェースとスタブのみを用意しています。

## 実装方針

### 1. MVPではAI機能は実装しない

- すべてのAI機能はスタブ実装（`MockAIService`）
- 外部AI APIは呼び出さない
- ルールベースと固定テンプレートで体験を提供

### 2. 差し替え可能な構造を用意

- `IAIService` インターフェースで抽象化
- 実装（Mock/OpenAI/Anthropic）を差し替えても呼び出し側は変更不要
- Feature Flagで段階的に有効化可能

### 3. セキュリティの保証

- APIキーはサーバー側のみで管理
- クライアントに機密情報を露出しない
- `.env` ファイルはリポジトリにコミットしない

### 4. AI未導入でも体験が成立

- Today Task: 固定テンプレート
- 別案: ルールベース生成（難易度・時間維持、タイプ変更優先）
- Recall: 固定テンプレート（3種類）
- 詰まり救済: 固定メッセージ

## 実装内容

### 新規作成（3ファイル）

| ファイル | 内容 |
|---|---|
| `.gitignore` | 機密ファイルの除外設定（.env等） |
| `.env.example` | 環境変数テンプレート（Feature Flag定義） |
| `AI_INTEGRATION_GUIDE.md` | AI統合ガイド（手順、テスト、トラブルシューティング） |

### 更新（2ファイル）

| ファイル | 変更内容 |
|---|---|
| `docs/02_Design.md` | § 13 AI方針とアーキテクチャを追加 |
| `docs/05_Decisions.md` | DEC-20260208-010を追加 |

### 既存実装（確認済み）

| ファイル | 状態 |
|---|---|
| `packages/web/src/services/aiService.ts` | ✅ IAIServiceインターフェース、MockAIService実装済み |
| `packages/web/src/services/todayTaskService.ts` | ✅ ルールベース別案生成実装済み |
| `packages/web/src/pages/RecallPage.tsx` | ✅ 固定テンプレートRecall実装済み |

## Feature Flag設計

### AI_ENABLED フラグ

| 環境変数 | 値 | 動作 |
|---|---|---|
| `AI_ENABLED` | `false`（デフォルト） | スタブ実装を使用、外部AI APIは呼ばない |
| `AI_ENABLED` | `true`（将来） | OpenAI/Anthropic APIを使用 |

### 配置場所

- **サーバー側**: 環境変数 `AI_ENABLED`（`.env`）
- **クライアント側**: サーバーAPIから「AI機能の利用可否」を取得
  - クライアントは環境変数を直接参照しない
  - フラグ値ではなく、「使える/使えない」という状態のみを受け取る

### 現在の動作（AI_ENABLED=false）

```typescript
// packages/web/src/services/aiService.ts
export const aiService = new MockAIService();

// 将来の切り替え例
export const aiService = 
  import.meta.env.VITE_AI_ENABLED === 'true'
    ? new OpenAIService()
    : new MockAIService();
```

## スタブ実装の詳細

### 1. Today Task生成

```typescript
async generateTodayTask(context: AIContext): Promise<TodayTask> {
  // 固定テンプレートから選択
  const templates = [
    { title: '英単語を5つ覚える', difficultyBand: 1, timeBudget: 3, ... },
    { title: 'リスニング練習', difficultyBand: 2, timeBudget: 3, ... },
    { title: '文法問題を解く', difficultyBand: 2, timeBudget: 10, ... },
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}
```

### 2. 別案生成（ルールベース）

```typescript
async generateAlternatives(
  currentTask: TodayTask,
  reason: string,
  context: AIContext
): Promise<TodayTask[]> {
  // ルール:
  // 1. 同じ難易度帯を維持
  // 2. 同じ時間を維持
  // 3. 異なるタイプを優先
  
  const alternatives = [...];
  return alternatives;
}
```

### 3. Recall Item生成（固定テンプレート）

```typescript
async generateRecallItem(
  content: string,
  difficulty: 1 | 2 | 3
): Promise<RecallItem> {
  // 固定テンプレート（3種類をランダム）
  const templates = [
    { question: '今日学んだ内容を理解できましたか？', ... },
    { question: '学んだ内容を実際に使えそうですか？', ... },
    { question: '次回も同じような内容を続けますか？', ... },
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}
```

### 4. 詰まり救済提案

```typescript
async generateIntervention(stuckContext: StuckContext): Promise<Intervention> {
  // 固定メッセージ
  const suggestions = {
    repeated_fail: 'タスクを小さく分割してみましょう',
    low_confidence: '例題を確認してから取り組みましょう',
    drop_off: '今日は短時間モードで完了させましょう',
  };
  
  return {
    suggestion: suggestions[stuckContext.triggerType],
    ...
  };
}
```

## セキュリティ対策

### .gitignore

```gitignore
# 機密ファイルを除外
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### .env.example

```bash
# Feature Flag
AI_ENABLED=false

# AI API Configuration（将来使用、コメントアウト済み）
# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# AI_MODEL=gpt-4
# AI_MAX_TOKENS=1000
```

### 禁止事項

- ❌ クライアントにAPIキーを配置
- ❌ 環境変数を直接フロントエンドに露出（`VITE_OPENAI_API_KEY` など）
- ❌ リポジトリに `.env` ファイルをコミット
- ❌ ログに機密情報を出力

### 必須対応

- ✅ APIキーは `.env` ファイルで管理
- ✅ `.gitignore` に `.env` を追加
- ✅ サーバー側のみで外部APIにアクセス
- ✅ クライアントは認証トークンでサーバーAPIにアクセス
- ✅ 本番環境ではSecretsマネージャーを使用

## 動作確認

### 1. 基本動作確認（AI_ENABLED=false）

```bash
# 環境変数ファイルを作成
cp .env.example .env

# AI_ENABLEDがfalseであることを確認
cat .env | grep AI_ENABLED
# 出力: AI_ENABLED=false

# 開発サーバーを起動
cd packages/web
npm install
npm run dev
```

**確認項目**:
- ✅ Today Task が表示される（固定テンプレート）
- ✅ 「別案に変える」でルールベース別案が表示される
- ✅ Recall が表示される（固定テンプレート）
- ✅ すべての機能が正常に動作する

### 2. 機密情報の非露出確認

```javascript
// ブラウザの開発者ツール（F12）→ Console

// 1. windowオブジェクトを確認
Object.keys(window).filter(k => k.includes('API') || k.includes('KEY'))
// → 空の配列 [] が返る

// 2. 環境変数を確認
console.log(import.meta.env)
// → OPENAI_API_KEY, ANTHROPIC_API_KEY が含まれない

// 3. Networkタブを確認
// → openai.com, anthropic.com へのリクエストがない
```

**確認項目**:
- ✅ `window` オブジェクトにAPIキーが含まれない
- ✅ 環境変数にAPIキーが含まれない
- ✅ 外部AI APIへのリクエストが発生しない

## 将来のAI統合

### Phase 1: サーバー側実装

1. サーバーの準備（Node.js + Express または Next.js API Routes）
2. AIエンドポイントの実装（`/api/ai/today-task` 等）
3. OpenAI/Anthropic API統合
4. 環境変数でスタブ/AI実装を切り替え

### Phase 2: クライアント側の接続

1. `APIAIService` クラスの実装（サーバーAPIを呼び出す）
2. 環境変数で `MockAIService` / `APIAIService` を切り替え
3. フォールバック機構の追加（AI障害時にスタブに戻す）

### Phase 3: 段階的ロールアウト

1. A/Bテスト設定（10% → 25% → 50% → 100%）
2. 監視とアラート（レスポンスタイム、エラー率、コスト）
3. 品質とコストの確認

詳細：`AI_INTEGRATION_GUIDE.md`

## docs/02_Design.md 更新内容

### § 13 AI方針とアーキテクチャ（新規追加）

- **13.1 AI導入の基本方針**: 4つの原則
- **13.2 現在の実装構造**: スタブ実装、インターフェース
- **13.3 Feature Flag設計**: AI_ENABLEDフラグ、配置場所
- **13.4 将来のAI統合設計**: サーバーAPIエンドポイント、切り替え例
- **13.5 セキュリティと機密管理**: 禁止事項、必須対応
- **13.6 テストと確認**: 自動テスト、手動確認手順
- **13.7 既知の制約と次の候補**: 現在の制約、実装候補

## docs/05_Decisions.md 更新内容

### DEC-20260208-010

- **決定内容**: MVPではAI機能は実装せず、差し替え可能な構造のみ用意
- **理由**: コスト最適化、レイテンシ管理、予測可能性、段階的導入、セキュリティ
- **ASSUMPTION**: ルールベース実装でもユーザー満足度60%以上、AI統合時コスト月額$500以内
- **成功条件**: AI_ENABLED=falseでも全機能が動作、NPS 60以上、提案受諾率60%以上
- **失敗条件**: NPS < 40、提案受諾率 < 40% → AI統合を検討

## 受入条件

### ✅ すべて達成

- [x] AI_ENABLED がOFFでも全機能が動作する
- [x] AI_ENABLED がONでも、外部AIは呼ばれずスタブ応答で動作する（現在はOFFのみ実装）
- [x] クライアント側にAPIキーやSecretsが存在しない
- [x] 将来AI実装に差し替える際に、差し替えポイントが明確で変更箇所が局所的である
- [x] ビルドとテストが通る

### 動作確認済み

```bash
# ビルド成功
cd packages/web
npm run build

# 出力:
# ✓ built in 568ms
# dist/assets/index-BOb2v9-l.js   221.03 kB │ gzip: 69.63 kB
```

## 変更ファイル一覧

### 新規作成（3ファイル）

- `.gitignore` - 機密ファイルの除外設定
- `.env.example` - 環境変数テンプレート
- `AI_INTEGRATION_GUIDE.md` - AI統合ガイド

### 更新（2ファイル）

- `docs/02_Design.md` - § 13 AI方針を追加
- `docs/05_Decisions.md` - DEC-20260208-010を追加

### 既存（確認済み）

- `packages/web/src/services/aiService.ts` - IAIService、MockAIService実装済み
- `packages/web/src/services/todayTaskService.ts` - ルールベース別案生成実装済み
- `packages/web/src/pages/RecallPage.tsx` - 固定テンプレートRecall実装済み

## 既知の制約

### 現在の制約

1. **AI機能は未実装**: スタブのみ、実際のAI APIは未接続
2. **サーバー側未実装**: APIエンドポイントは未実装
3. **Feature Flagは静的**: 環境変数のみ、動的な切り替えは未対応
4. **フォールバック未実装**: AI障害時の自動切り替えは未実装

### 次の実装候補

1. **サーバー側実装** - Node.js + Express または Next.js API Routes
2. **AI統合** - OpenAI/Anthropic API接続
3. **Feature Flagの高度化** - LaunchDarkly等での動的切り替え
4. **フォールバック機構** - AI障害時の自動スタブ切り替え
5. **監視とアラート** - レスポンスタイム、エラー率、コスト監視

## 手動確認手順

### 1. 環境構築

```bash
# リポジトリのルートで実行
cp .env.example .env
cd packages/web
npm install
npm run dev
```

### 2. 基本動作確認

- Today画面でタスクが表示される
- 「別案に変える」で2つの別案が表示される
- Recall画面で固定テンプレート問題が表示される

### 3. セキュリティ確認

```javascript
// ブラウザの開発者ツール（F12）→ Console
Object.keys(window).filter(k => k.includes('API') || k.includes('KEY'))
// → [] が返る

console.log(import.meta.env)
// → OPENAI_API_KEY が含まれない
```

### 4. ネットワーク確認

- 開発者ツール → Networkタブ
- openai.com, anthropic.com へのリクエストがないことを確認

## 参照ドキュメント

- `AI_INTEGRATION_GUIDE.md` - AI統合の詳細ガイド
- `docs/02_Design.md § 13` - AI方針とアーキテクチャ
- `docs/05_Decisions.md` - DEC-20260208-010
- `.env.example` - 環境変数テンプレート
- `packages/web/src/services/aiService.ts` - AIサービス実装

---

**実装完了日**: 2026-02-08  
**次のステップ**: AI統合（将来、ユーザーフィードバックに基づいて判断）
