# OOUI画面骨格 実装完了レポート

実装日：2026-02-08

## 概要

Study Pro のOOUIオブジェクトモデルに基づいた画面骨格を実装しました。AIは後で差し替え可能なインターフェースのみ、データ永続化はlocalStorage優先で将来API化可能な設計です。

## ✅ 実装完了項目

### 1. OOUIオブジェクトの型定義

すべてのコアオブジェクトをTypeScriptで定義：

| オブジェクト | 型名 | 主要属性 | 実装状況 |
|---|---|---|---|
| 学習領域 | Domain | id, name, description | ✅ |
| 週目標 | WeeklyGoal | frequency, sessionDuration, currentProgress | ✅ |
| 今日の一つ | TodayTask | title, difficultyBand, timeBudget, type | ✅ |
| 集中セッション | FocusSession | duration, mode, startedAt, status | ✅ |
| 想起カード | RecallItem | question, choices, correctAnswer, reviewHistory | ✅ |
| 証拠ログ | LogEntry | content, confidenceLevel, createdAt | ✅ |
| 復習キュー | ReviewQueue | pendingItems, scheduledForToday | ✅ |
| 詰まりイベント | StuckEvent | triggerType, context, consecutiveCount | ✅ |
| 介入 | Intervention | type, suggestion, isApplied | ✅ |

参照：`packages/web/src/types/index.ts`

### 2. データ永続化の抽象レイヤー

**実装方針**：
- MVP: localStorage（即座に動作、サーバー不要）
- 将来: サーバーAPI（インターフェース差し替えのみ）

**実装内容**：
```typescript
interface IStorage {
  getUserProfile(): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  // ... 他のメソッド
}

class LocalStorageService implements IStorage {
  // localStorage実装
}

// 将来のAPI実装例（コメントで記載）
class APIStorageService implements IStorage {
  // サーバーAPI実装
}
```

参照：`packages/web/src/services/storageService.ts`

### 3. AIサービスの抽象レイヤー

**実装方針**：
- MVP: Mock AI（仮データ、コストゼロ、レイテンシゼロ）
- 将来: OpenAI/Anthropic API（インターフェース差し替えのみ）

**実装内容**：
```typescript
interface IAIService {
  generateTodayTask(context: AIContext): Promise<TodayTask>;
  generateAlternatives(...): Promise<TodayTask[]>;
  generateRecallItem(...): Promise<RecallItem>;
  generateIntervention(...): Promise<Intervention>;
}

class MockAIService implements IAIService {
  // 仮データを返すMock実装
}

// 将来のOpenAI実装例（コメントで記載）
class OpenAIService implements IAIService {
  // OpenAI API実装
}
```

参照：`packages/web/src/services/aiService.ts`

### 4. 画面ルーティング骨格

**HIG原則**：タブで領域を分け、詳細は階層で掘る

| パス | 画面 | OOUIオブジェクト | 主要行動 | 状態 |
|---|---|---|---|---|
| `/today` | 今日 | TodayTask | これで進む、別案にする、今日は休む | ✅ |
| `/focus` | 集中 | FocusSession | 開始する、完了する、中断する | ✅ |
| `/recall` | 想起 | RecallItem | 答える、スキップする、自信度を付ける | ✅ |
| `/log` | ログ | LogEntry | 記録する | ✅ |
| `/progress` | 進捗 | WeeklyGoal, LogEntry | 見返す、週目標を調整する | ✅ |
| `/settings` | 設定 | WeeklyGoal, UserProfile | 設定する | ✅ |

**ナビゲーション**：
- タブバー（Today、Progress、Settings）
- HIG準拠：3つのタブ、明確なアイコンとラベル

参照：`packages/web/src/App.tsx`

### 5. 各画面の実装（OOUI原則準拠）

#### TodayPage（今日）
- **1画面1主役**：Today Taskのみ表示
- **選択肢は最大3**：これで進む、別案にする、今日は休む
- **説明は折りたたみ**：タスク説明は簡潔に

#### FocusPage（集中）
- **1画面1主役**：タイマーのみ表示
- **選択肢は最大3**：1分、3分、10分
- **フィードバック**：タイマー動作が視覚的に明確

#### RecallPage（想起）
- **1画面1主役**：1問のみ表示（2択中心）
- **選択肢は最大3**：2択 + スキップ
- **フィードバック**：正誤がすぐわかる

#### LogPage（ログ）
- **1画面1主役**：1行ログ入力のみ
- **説明は折りたたみ**：入力ヒントは短く

#### ProgressPage（進捗）
- **控えめ**：数字と進捗バーのみ、煽らない
- **見返す**：ログ一覧を時系列で表示

#### SettingsPage（設定）
- **明確さ**：週目標の設定が主役
- **ユーザーの主導権**：データ削除オプション

## 📁 実装ファイル一覧

```
packages/web/
├── src/
│   ├── types/
│   │   └── index.ts                    # ✅ OOUIオブジェクト型定義（300行）
│   ├── services/
│   │   ├── storageService.ts           # ✅ データ永続化抽象レイヤー（250行）
│   │   ├── aiService.ts                # ✅ AIサービス抽象レイヤー（180行）
│   │   └── todayTaskService.ts         # ✅ タスク生成ロジック（既存）
│   ├── pages/
│   │   ├── TodayPage.tsx               # ✅ 今日画面（100行）
│   │   ├── FocusPage.tsx               # ✅ 集中画面（180行）
│   │   ├── RecallPage.tsx              # ✅ 想起画面（200行）
│   │   ├── LogPage.tsx                 # ✅ ログ画面（150行）
│   │   ├── ProgressPage.tsx            # ✅ 進捗画面（200行）
│   │   └── SettingsPage.tsx            # ✅ 設定画面（150行）
│   ├── components/
│   │   ├── TodayCard.tsx               # ✅ Todayカード（既存）
│   │   └── AlternativeSheet.tsx        # ✅ 別案シート（既存）
│   ├── App.tsx                         # ✅ ルーティング・ナビゲーション（200行）
│   ├── main.tsx                        # ✅ エントリーポイント
│   └── styles.css                      # ✅ グローバルスタイル
├── package.json                        # ✅ 依存関係（react-router-dom追加）
└── README.md                           # ✅ ドキュメント
```

## 🎯 OOUI/HIG原則の適用状況

### OOUI原則

| 原則 | 適用内容 | 実装箇所 |
|---|---|---|
| 体験は画面ではなくオブジェクトで組み立てる | すべての画面がOOUIオブジェクトを中心に設計 | types/index.ts |
| 画面はオブジェクトの状態と行動を表現 | 各ページがオブジェクトの操作を提供 | pages/*.tsx |
| 行動は短い動詞で明確にする | 「開始する」「完了する」「記録する」 | 全画面 |
| 選択肢は絞る | 最大3つの選択肢 | 全画面 |

### HIG原則

| 原則 | 適用内容 | 実装箇所 |
|---|---|---|
| 明確さ | 文言は短く具体、主役は常に1つ | 全画面 |
| 控えめ | 装飾や煽りで誘導しない | Progress、Log |
| 深さ | タブで領域を分け、詳細は階層で掘る | App.tsx ナビゲーション |
| フィードバック | 開始と完了が分かる、操作は即時反応 | Focus、Recall |
| ユーザーの主導権 | 休む、スキップ、別案の選択 | Today、Recall |

参照：docs/02_Design.md § 1 本仕様の設計原則

## 🔧 技術スタック確定

### 確定事項

- **フロントエンド**: React 18 + TypeScript 5
- **ビルドツール**: Vite 5
- **ルーティング**: React Router DOM 6
- **データ永続化**: localStorage（MVP）→ API（将来）
- **AI生成**: Mock（MVP）→ OpenAI/Anthropic（将来）
- **計測**: @studyplus/analytics（既存）

### 依存関係

```json
{
  "dependencies": {
    "@studyplus/analytics": "file:../analytics",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x"
  }
}
```

## 🚀 起動方法

```bash
# Webディレクトリに移動
cd packages/web

# 依存関係をインストール（初回のみ）
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## 🧪 動作確認

### 基本フロー

1. `/today` - Todayカードが表示される
2. 「これで進める」をクリック
3. `/focus` - タイマー画面、時間を選択して開始
4. タイマー完了後、自動で `/recall` へ遷移
5. 2択問題に回答、自信度を選択
6. `/log` - 1行ログと自信度を記録
7. `/progress` - 週の進捗と記録が表示される

### データ永続化の確認

1. 開発者ツール（F12）→ Application → Local Storage
2. `studypro_*` で始まるキーが保存されている
3. ページをリロードしてもデータが残る

### AI生成の確認

1. `/today` で別案に変える
2. Mock AIが生成した別タスクが表示される
3. コンソールに `[Analytics]` イベントログが出力される

## 📝 設計判断の記録

### DEC-20260208-005: OOUIオブジェクトモデルの型定義

**理由**：
- TypeScriptの型システムにより、実装の一貫性を保つ
- IDEの自動補完により、開発効率が向上
- リファクタリングが安全に行える

**影響範囲**：全実装

**状態**：Accepted

### DEC-20260208-006: localStorage優先のデータ永続化

**理由**：
- MVP開発が高速化（サーバー不要）
- デバッグが容易
- インターフェース統一により、将来の切り替えが容易

**影響範囲**：storageService.ts

**状態**：Accepted

**ASSUMPTION**：
- ASSUMPTION-13: localStorageの5MB制限で当面は問題ない
- ASSUMPTION-14: サーバーAPI化時にデータ移行が可能

### DEC-20260208-007: Mock AIの採用

**理由**：
- MVP開発が高速化（AI APIコストゼロ）
- レイテンシゼロで動作確認可能
- インターフェース統一により、将来の切り替えが容易

**影響範囲**：aiService.ts

**状態**：Accepted

**ASSUMPTION**：
- ASSUMPTION-15: Mock AIでもユーザー体験の基本フローは検証できる
- ASSUMPTION-16: OpenAI APIレイテンシが2秒以内に収まる（PRD § 19.3）

### DEC-20260208-008: React + React Routerでの実装

**理由**：
- 開発速度が最速
- モバイルブラウザで動作（PWA化も可能）
- デプロイが容易

**影響範囲**：packages/web 全体

**状態**：Accepted

**ASSUMPTION**：
- ASSUMPTION-17: モバイルブラウザでの体験がネイティブアプリと遜色ない
- ASSUMPTION-18: PWA化により、ホーム画面追加で疑似ネイティブ体験が可能

詳細：docs/05_Decisions.md

## 🔄 次のステップ

### 1. AI統合

```typescript
// aiService.ts の OpenAIService 実装
import OpenAI from 'openai';

class OpenAIService implements IAIService {
  private openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  });

  async generateTodayTask(context: AIContext): Promise<TodayTask> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたは学習タスクを提案するアシスタントです。',
        },
        {
          role: 'user',
          content: `ドメイン: ${context.userProfile.currentDomain.name}...`,
        },
      ],
    });
    
    return parseAIResponse(response);
  }
}

// 環境変数で切り替え
export const aiService = 
  import.meta.env.VITE_USE_AI === 'true'
    ? new OpenAIService()
    : new MockAIService();
```

### 2. サーバーAPI化

```typescript
// storageService.ts の APIStorageService 実装
class APIStorageService implements IStorage {
  private baseUrl = import.meta.env.VITE_API_URL;

  async getUserProfile(): Promise<UserProfile | null> {
    const response = await fetch(`${this.baseUrl}/user/profile`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return response.json();
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    await fetch(`${this.baseUrl}/user/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(profile),
    });
  }
}

// 環境変数で切り替え
export const storageService = 
  import.meta.env.VITE_USE_API === 'true'
    ? new APIStorageService()
    : new LocalStorageService();
```

### 3. 介入機能の実装

現在はStuckEventとInterventionの型定義のみ。実装タスク：

- 詰まり検知ロジック（連続失敗、低自信度、中断）
- 救済提案生成（タスク分割、例示、易化）
- 救済採用後の効果測定

### 4. PWA化

```json
// manifest.json
{
  "name": "Study Pro",
  "short_name": "StudyPro",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007AFF",
  "icons": [...]
}
```

## 📚 参照ドキュメント

- **[docs/00_Principles.md](./docs/00_Principles.md)**: サービス設計原則
- **[docs/02_Design.md](./docs/02_Design.md)**: UX設計仕様 § 2 オブジェクトモデル
- **[docs/05_Decisions.md](./docs/05_Decisions.md)**: 意思決定ログ（DEC-20260208-005〜008）
- **[packages/web/README.md](./packages/web/README.md)**: Webアプリのドキュメント

---

**実装完了日**: 2026-02-08  
**次のマイルストーン**: AI統合とサーバーAPI化
