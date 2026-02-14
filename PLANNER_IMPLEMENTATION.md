# Planner実装ガイド

**実装日**: 2026-02-08  
**目的**: 疑似AIで「プラン生成→今日の学習セット生成→2択問題生成」を動かす

---

## 概要

Study ProのPlanner機能を実装しました。AIなしでも動作する**TemplatePlanner**と、将来のAI統合のための**OpenAIPlanner**の枠を用意しています。

---

## Plannerインターフェース

### IPlannerの3つの機能

```typescript
export interface IPlanner {
  // 1. 週次プラン生成
  generateWeeklyPlan(domain: Domain, goal: WeeklyGoal): Promise<WeeklyPlan>;

  // 2. 今日の学習セット生成
  generateTodaySet(
    domain: Domain,
    goal: WeeklyGoal,
    plan?: WeeklyPlan,
    sessionCount?: number
  ): Promise<TodaySet>;

  // 3. 2択問題生成
  generateRecallQuestion(
    domain: Domain,
    task: TodayTask,
    sessionDuration: number
  ): Promise<RecallItem>;
}
```

---

## 実装1: TemplatePlanner（テンプレート + 簡易ルール）

### 1. 週次プラン生成（generateWeeklyPlan）

**ロジック**:
1. Domainに応じたテーマリストを生成
2. 週目標回数に応じてテーマ数を調整
3. WeeklyPlanオブジェクトを返す

**ドメイン別テーマ例**:

| ドメイン | テーマリスト |
|---|---|
| 英語 | 基本文法の確認、日常会話フレーズ、ビジネス英語、発音練習、リスニング強化 |
| プログラミング | 基礎文法の復習、アルゴリズム演習、コードリーディング、デバッグ練習、プロジェクト実装 |
| ビジネス | マーケティング基礎、財務諸表の読み方、プレゼン資料作成、交渉術、データ分析 |
| その他 | 基礎の確認、応用問題、実践演習、復習、総合演習 |

**例**:
```typescript
// 英語、週3回の場合
const weeklyPlan = {
  id: 'plan_123',
  domain: { name: '英語', ... },
  goal: { frequency: 3, ... },
  themes: ['基本文法の確認', '日常会話フレーズ', 'ビジネス英語'],
  createdAt: '2026-02-08T...',
};
```

---

### 2. 今日の学習セット生成（generateTodaySet）

**ロジック**:
1. 週目標の進捗（sessionCount）に応じて今日のテーマを決定
   - 例: sessionCount = 0 → テーマ1、sessionCount = 1 → テーマ2
2. テーマとDurationからメインタスクを生成
3. 別案を3つ生成（異なるタスク形式）

**タスク形式のバリエーション**:
- **main**: 「基本を確認」
- **alt1**: 「例題を解く」
- **alt2**: 「要点をまとめる」
- **alt3**: 「復習する」

**例**:
```typescript
// 英語、基本文法の確認、3分の場合
const todaySet = {
  task: {
    id: 'task_123_main',
    title: '基本文法の確認：基本を確認',
    description: '英語の基本文法の確認について、基本事項を3分で確認します。',
    difficultyBand: 2,
    timeBudget: 3,
    type: 'new_content',
    source: 'default',
  },
  alternatives: [
    { title: '基本文法の確認：例題を解く', ... },
    { title: '基本文法の確認：要点をまとめる', ... },
    { title: '基本文法の確認：復習する', ... },
  ],
  theme: '基本文法の確認',
};
```

---

### 3. 2択問題生成（generateRecallQuestion）

**ロジック**:
1. Domainとタスクに応じた2択問題テンプレートをランダム選択
2. RecallItemオブジェクトを返す

**問題テンプレート例**:
- 「今日学んだ{Domain}の内容を理解できましたか？」
  - 選択肢: 「理解できた」「もう少し復習が必要」
- 「{タスクタイトル}の要点を説明できますか？」
  - 選択肢: 「説明できる」「もう少し整理が必要」
- 「学んだ内容を実際に使えそうですか？」
  - 選択肢: 「使えそう」「もう少し練習が必要」
- 「次回も同じテーマを続けますか？」
  - 選択肢: 「続ける」「別のテーマにする」
- 「今日の学習内容に満足していますか？」
  - 選択肢: 「満足している」「改善の余地がある」

---

## 実装2: OpenAIPlanner（将来のAI統合）

**現状**: すべてのメソッドで`throw new Error(...)`

**将来の実装例**:
```typescript
export class OpenAIPlanner implements IPlanner {
  async generateWeeklyPlan(domain: Domain, goal: WeeklyGoal): Promise<WeeklyPlan> {
    // OpenAI APIを呼び出して週次プランを生成
    const prompt = `ユーザーは${domain.name}を学んでいます...`;
    const response = await openai.chat.completions.create({ ... });
    // レスポンスをパースしてWeeklyPlanを返す
  }
  // ... 他のメソッドも同様
}
```

---

## Feature Flag: AI_ENABLED

**方針**: 環境変数で切り替え可能（MVP: 常にfalse）

```typescript
const AI_ENABLED = false; // MVP: 常にTemplatePlanner

export const planner: IPlanner = AI_ENABLED
  ? new OpenAIPlanner()
  : new TemplatePlanner();
```

**将来の切り替え方法**:
```bash
# .envファイル
VITE_AI_ENABLED=true
```

---

## 統合

### 1. OnboardingPage

**処理フロー**:
1. Domain選択
2. 週目標設定
3. **Plannerで週次プラン生成** ← NEW
4. LocalStorageに保存

```typescript
// 週次プランを生成
const weeklyPlan = await planner.generateWeeklyPlan(domain, goal);
localStorage.setItem('studypro_weekly_plan', JSON.stringify(weeklyPlan));
```

---

### 2. TodayPage

**処理フロー**:
1. 救済タスクがある場合はそれを使用
2. なければLocalStorageから取得
3. なければ**Plannerで今日のセット生成** ← NEW
4. メインタスクと別案を表示

```typescript
// 週次プランを取得
const weeklyPlanJson = localStorage.getItem('studypro_weekly_plan');
const weeklyPlan = weeklyPlanJson ? JSON.parse(weeklyPlanJson) : undefined;

// 今週のセッション数を取得
const sessions = await storageService.getAllFocusSessions();
const thisWeekSessions = sessions.filter(...);

// 今日のセットを生成
const todaySet = await planner.generateTodaySet(
  domain,
  goal,
  weeklyPlan,
  thisWeekSessions.length
);

task = todaySet.task;
taskAlternatives = todaySet.alternatives;
```

---

### 3. RecallPage

**処理フロー**:
1. FocusSession完了後に遷移
2. **Plannerで2択問題生成** ← NEW
3. 問題を表示

```typescript
// Plannerを使って2択問題を生成
const profile = await storageService.getUserProfile();
const domain = profile?.currentDomain;

if (domain) {
  const item = await planner.generateRecallQuestion(domain, task, session.duration);
  setRecallItem(item);
}
```

---

## 動作確認

### 縦スライスの確認手順

1. **Onboarding**:
   - `/` にアクセス → `/onboarding` にリダイレクト
   - Domain選択: 「英語」
   - 週目標設定: 週3回、1回3分
   - **→ 週次プランが生成される（LocalStorageに保存）**

2. **Today**:
   - `/today` に遷移
   - **→ Plannerで生成されたタスクが表示される**
   - タスク例: 「基本文法の確認：基本を確認」
   - 「別案に変える」をクリック
   - **→ Plannerで生成された別案3つが表示される**

3. **Focus**:
   - タイマー選択（3分）→ 開始 → 完了

4. **Recall**:
   - **→ Plannerで生成された2択問題が表示される**
   - 問題例: 「今日学んだ英語の内容を理解できましたか？」
   - 選択肢: 「理解できた」「もう少し復習が必要」

5. **Log** → **Progress**

---

## 実装ファイル

### 新規作成

- `packages/web/src/services/plannerService.ts`: Plannerサービス
  - `IPlanner` インターフェース
  - `TemplatePlanner` 実装
  - `OpenAIPlanner` 枠
  - `WeeklyPlan` 型定義
  - `TodaySet` 型定義

### 変更

- `packages/web/src/pages/OnboardingPage.tsx`: 週次プラン生成を追加
- `packages/web/src/pages/TodayPage.tsx`: 今日のセット生成を追加
- `packages/web/src/pages/RecallPage.tsx`: 2択問題生成を追加
- `packages/web/src/components/TodayCard.tsx`: 別案を受け取るように変更
- `packages/web/src/components/AlternativeSheet.tsx`: 別案を受け取るように変更

---

## 確認方法

### 1. LocalStorageの確認

```javascript
// ブラウザのコンソールで実行
const weeklyPlan = JSON.parse(localStorage.getItem('studypro_weekly_plan'));
console.log('週次プラン:', weeklyPlan);
console.log('テーマリスト:', weeklyPlan.themes);
```

**期待値**:
```json
{
  "id": "plan_1234567890",
  "domain": { "name": "英語", ... },
  "goal": { "frequency": 3, "sessionDuration": 3, ... },
  "themes": ["基本文法の確認", "日常会話フレーズ", "ビジネス英語"],
  "createdAt": "2026-02-08T..."
}
```

### 2. 今日のタスクの確認

Todayページで表示されるタスクのタイトルと説明文を確認：
- タイトル: 「{テーマ}：{タスク形式}」
- 説明: 「{Domain}の{テーマ}について、...を{時間}で{アクション}します。」

### 3. 別案の確認

「別案に変える」をクリックして、3つの別案が表示されることを確認：
- 別案1: 「{テーマ}：例題を解く」
- 別案2: 「{テーマ}：要点をまとめる」
- 別案3: 「{テーマ}：復習する」

### 4. 2択問題の確認

Recallページで表示される問題を確認：
- 問題文にDomain名またはタスクタイトルが含まれる
- 選択肢が2つ表示される

---

## TemplatePlannerのカスタマイズ

### 新しいドメインのテーマを追加

`plannerService.ts` の `getBaseThemes()` メソッドを編集：

```typescript
private getBaseThemes(domain: Domain): string[] {
  const domainName = domain.name.toLowerCase();

  if (domainName.includes('資格試験')) {
    return [
      '過去問演習',
      '重要用語の暗記',
      '模擬試験',
      '弱点克服',
      '総復習',
    ];
  }

  // ... 既存のドメイン
}
```

### 新しい問題テンプレートを追加

`plannerService.ts` の `getRecallTemplates()` メソッドを編集：

```typescript
private getRecallTemplates(domain: Domain, task: TodayTask) {
  return [
    // ... 既存のテンプレート
    {
      question: '今日の学習で新しい発見がありましたか？',
      choices: ['あった', 'なかった'],
      correctAnswer: 'あった',
    },
  ];
}
```

---

## 次のステップ

### 1. AI統合（OpenAIPlanner実装）

- OpenAI APIキーの設定
- プロンプトエンジニアリング
- レスポンスのパース
- エラーハンドリング

### 2. 学習履歴の統合

- ユーザーの過去の学習ログを分析
- 苦手分野を特定
- 最適なタスクを推薦

### 3. 適応的な難易度調整

- ユーザーの理解度（Recall正答率、自信度）を分析
- 難易度を動的に調整
- 学習曲線に沿った提案

---

## トラブルシューティング

### 問題: 週次プランが生成されない

**原因**: OnboardingPageで週次プラン生成が呼ばれていない

**解決策**: OnboardingPageで以下のコードが実行されているか確認

```typescript
const weeklyPlan = await planner.generateWeeklyPlan(domain, goal);
localStorage.setItem('studypro_weekly_plan', JSON.stringify(weeklyPlan));
```

### 問題: Todayページでタスクが表示されない

**原因**: Plannerで生成したタスクがnullになっている

**解決策**: 
1. UserProfileが正しく保存されているか確認
2. getDomain()が正しくDomainを返しているか確認
3. ブラウザのコンソールでエラーを確認

### 問題: 別案が表示されない

**原因**: AlternativeSheetにalternativesが渡されていない

**解決策**: TodayPageで以下を確認

```typescript
const todaySet = await planner.generateTodaySet(...);
setAlternatives(todaySet.alternatives);

// TodayCardに渡す
<TodayCard alternatives={alternatives} ... />
```

---

## 関連ドキュメント

- `DEMO_V0.8_GUIDE.md`: v0.8デモ実装ガイド
- `docs/02_Design.md`: UX設計仕様
- `docs/05_Decisions.md`: 意思決定ログ
- `AI_INTEGRATION_GUIDE.md`: AI統合ガイド（将来のOpenAIPlanner実装）
