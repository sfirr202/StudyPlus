# 詰まり救済機能 実装完了レポート

実装日：2026-02-08

参照：P-104、docs/02_Design.md § 4.6

## ✅ 実装完了

「詰まり＝設計で処理」（P-104）を実現する詰まり救済機能を実装しました。MVP段階ではテンプレート固定応答とし、将来LLM（AI）に差し替え可能な設計としています。

## 実装内容

### 新規作成（4ファイル）

| ファイル | 内容 | 行数 |
|---|---|---|
| `packages/web/src/services/coachService.ts` | CoachService（テンプレート版＋LLM差し替え可能） | 約280行 |
| `packages/web/src/services/stuckDetectionService.ts` | 詰まり検知ロジック | 約180行 |
| `packages/web/src/pages/StuckPage.tsx` | 詰まり救済画面 | 約180行 |
| `docs/STUCK_RESCUE_TEMPLATES.md` | 救済テンプレート一覧 | - |

### 更新（5ファイル）

| ファイル | 変更内容 |
|---|---|
| `packages/analytics/src/types.ts` | イベント追加（stuck_reason_selected, rescue_after_resume） |
| `packages/analytics/src/example.ts` | 詰まり救済イベント例を更新 |
| `packages/web/src/App.tsx` | StuckPageルート追加 |
| `packages/web/src/pages/RecallPage.tsx` | 詰まり検知ロジック追加 |
| `packages/web/src/pages/TodayPage.tsx` | 救済後の再開検知追加 |

## 詰まり検知（3トリガー）

### 1. Recall連続失敗（repeated_fail）

**条件**: Recall 3問連続で不正解

**実装**:
```typescript
const allIncorrect = recentRecalls.every(r => !r.isCorrect);
```

**検知タイミング**: Recall回答後

### 2. 低自信度の連続（low_confidence）

**条件**: Recall 3問連続で自信度1-2

**実装**:
```typescript
const allLowConfidence = recentRecalls.every(
  r => r.confidenceLevel <= 2
);
```

**検知タイミング**: Recall回答後

### 3. Focus中断の連続（drop_off）

**条件**: Focus 2回連続で中断

**実装**:
```typescript
const allInterrupted = recentSessions.every(
  s => s.status === 'interrupted'
);
```

**検知タイミング**: Focus開始時またはRecall後

## 救済フロー

```
詰まり検知
  ↓
[Stuck Page]
  │
Step 1: 理由選択（最大3択）
  │  - 難しい
  │  - 何から手をつければよいか分からない
  │  - 時間が足りない
  │  
  │  イベント: stuck_reason_selected
  │
  ↓
Step 2: 救済オプション提示（最大3択）
  │  - 小さく分割する
  │  - 易しくする
  │  - 例を見る
  │  - 別ルートにする
  │  
  │  イベント: stuck_help_shown
  │
  ↓
Step 3: 救済アクション適用
  │  イベント: stuck_help_applied
  │
  ↓
[Today Page]（調整されたタスクで再開）
  │  イベント: rescue_after_resume
```

## 救済テンプレート（理由別）

### 難しい（too_hard）

| アクション | ラベル | 説明 | 実装 |
|---|---|---|---|
| split | 小さく分割する | 1ステップずつ進める | 時間を1分に短縮 |
| easier | 易しくする | 難易度を下げる | 難易度を1段階下げる |
| example | 例を見る | 短い例で確認する | タイトルに「例：」を付加 |

### 時間が足りない（no_time）

| アクション | ラベル | 説明 | 実装 |
|---|---|---|---|
| split | 1分で完了する | 最小限に絞る | 時間を1分に短縮 |
| easier | 短時間版にする | 1分モードで完了 | 時間を1分、難易度を下げる |
| alternate_route | 別のタスクにする | 今日できるものに変える | 復習タスクに変更 |

### 何から手をつければよいか分からない（unclear_how）

| アクション | ラベル | 説明 | 実装 |
|---|---|---|---|
| example | 例を見る | やり方を確認する | タイトルに「例：」を付加 |
| split | 手順を分ける | 1つずつ進める | 時間を1分に短縮 |
| alternate_route | 別のやり方にする | 分かりやすい方法で | 復習タスクに変更 |

詳細：`docs/STUCK_RESCUE_TEMPLATES.md`

## CoachService（AI差し替え可能）

### インターフェース

```typescript
export interface ICoachService {
  generateRescueOptions(context: CoachContext): Promise<RescueOption[]>;
  applyRescueAction(action: RescueAction, currentTask: TodayTask): Promise<TodayTask>;
}
```

### 現在の実装（テンプレート版）

```typescript
export class TemplateCoachService implements ICoachService {
  async generateRescueOptions(context: CoachContext): Promise<RescueOption[]> {
    // 理由別のテンプレートを返す
    const templates: Record<StuckReason, RescueOption[]> = {
      too_hard: [...],
      no_time: [...],
      unclear_how: [...],
      other: [...],
    };
    
    return templates[context.selectedReason] || templates.other;
  }
  
  async applyRescueAction(
    action: RescueAction,
    currentTask: TodayTask
  ): Promise<TodayTask> {
    // アクションに応じてタスクを調整
    switch (action) {
      case 'split': return { ...currentTask, timeBudget: 1, ... };
      case 'easier': return { ...currentTask, difficultyBand: ..., ... };
      case 'example': return { ...currentTask, title: `例：${...}`, ... };
      case 'alternate_route': return { type: 'review', ... };
    }
  }
}
```

### 将来の実装（LLM版）

```typescript
export class LLMCoachService implements ICoachService {
  async generateRescueOptions(context: CoachContext): Promise<RescueOption[]> {
    // OpenAI/Anthropic APIを呼び出し
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `
            あなたは学習者をサポートするコーチです。
            詰まっている学習者に、具体的で実行可能な救済策を提案してください。
            
            制約：
            - 提案は最大3つ
            - 各提案は20文字以内の短文
            - 動詞で始める
            - 具体的で実行可能
          `,
        },
        {
          role: 'user',
          content: `状況: ${context.stuckEvent.triggerType}...`,
        },
      ],
    });
    
    return parseLLMResponse(response);
  }
}

// 環境変数で切り替え
export const coachService = 
  import.meta.env.VITE_AI_ENABLED === 'true'
    ? new LLMCoachService()
    : new TemplateCoachService();
```

**差し替えポイント**: `packages/web/src/services/coachService.ts`

## 計測イベント（5種類追加）

### 新規追加

| イベント名 | タイミング | 主要プロパティ |
|---|---|---|
| `stuck_reason_selected` | 理由選択時 | stuck_id, reason |
| `rescue_after_resume` | 救済後の再開時 | stuck_id, resumed_offer_id, time_to_resume_sec |

### 更新

| イベント名 | 変更内容 |
|---|---|
| `stuck_help_shown` | stuck_id, rescue_options を追加 |
| `stuck_help_applied` | stuck_id を追加 |

### 既存

- `stuck_detected` - 詰まり検知時

## UI/言語ルール（準拠）

✅ **短文・動詞・具体**
- ○「小さく分割する」「例を見る」「易しくする」
- ×「もっと頑張りましょう！分割すれば必ずできます！」

✅ **長文説明は禁止**
- ラベル: 10文字以内
- 説明: 15文字以内

✅ **選択肢は最大3つ**
- 理由選択: 3つ
- 救済オプション: 3つ

✅ **ユーザーの主導権**
- 「戻る」ボタンで理由選択に戻れる
- 救済を拒否して Today 画面に戻ることも可能（将来実装）

## 動作確認

### ローカル起動

```bash
cd packages/web
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

### 詰まりフローの確認

**パターン1: Recall連続失敗**
1. Today画面で「これで進める」
2. Focus完了
3. Recall画面で3回連続不正解を選択
4. → 詰まり画面が表示される
5. 理由を選択
6. 救済オプションから1つ選択
7. → Today画面に戻り、調整されたタスクが表示される

**パターン2: 低自信度の連続**
1. Recall画面で3回連続自信度1-2を選択
2. → 詰まり画面が表示される

**パターン3: Focus中断の連続**
1. Focus画面で「中断」を2回連続
2. → 詰まり画面が表示される（将来実装）

### イベント確認

```javascript
// ブラウザの開発者ツール（F12）→ Console
window.analytics.getEventBuffer()
  .filter(e => 
    e.event_name.includes('stuck') || 
    e.event_name.includes('rescue')
  );
```

期待されるイベント順序:
1. `stuck_detected`
2. `stuck_reason_selected`
3. `stuck_help_shown`
4. `stuck_help_applied`
5. `today_offer_shown`
6. `rescue_after_resume`

## ビルド成功

```
✓ built in 645ms
dist/assets/index-BsIlMxZb.js   228.78 kB │ gzip: 71.76 kB
```

TypeScript型チェック完了、エラーなし。

## 設計判断（DEC-20260208-011）

### 決定内容
詰まり救済はテンプレート版で実装、LLM差し替え可能な設計

### 採用理由
- レイテンシゼロ
- コスト最適化
- 予測可能
- 十分な品質（理由別3つ×4パターン）
- 段階的導入可能

### ASSUMPTION
- **ASSUMPTION-23**: テンプレート救済でも救済採用率が50%以上
- **ASSUMPTION-24**: 救済後の完了率が通常時の80%以上

### 成功条件
- 救済採用率が50%以上
- 救済後の完了率が通常時の80%以上
- 詰まりから再開までの時間が平均60秒以内

### 失敗条件とロールバック
- 救済採用率が30%未満 → LLM統合を検討
- 救済後の完了率が50%未満 → テンプレート内容を改善

詳細：`docs/05_Decisions.md` DEC-20260208-011

## AI差し替えポイント

### 現在（MVP）

```typescript
// packages/web/src/services/coachService.ts
export const coachService = new TemplateCoachService();
```

### 将来（LLM統合後）

```typescript
// packages/web/src/services/coachService.ts
export const coachService = 
  import.meta.env.VITE_AI_ENABLED === 'true'
    ? new LLMCoachService()
    : new TemplateCoachService();
```

**差し替え箇所**:
- `packages/web/src/services/coachService.ts`
- インターフェース `ICoachService` は変更不要
- `LLMCoachService` の `generateRescueOptions` と `applyRescueAction` を実装

**LLM実装例**（コメントで記載済み）:

```typescript
async generateRescueOptions(context: CoachContext): Promise<RescueOption[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `
          あなたは学習者をサポートするコーチです。
          詰まっている学習者に、具体的で実行可能な救済策を提案してください。
          
          制約：
          - 提案は最大3つ
          - 各提案は20文字以内の短文
          - 動詞で始める（「〜する」形式）
          - 具体的で実行可能なアクション
        `,
      },
      {
        role: 'user',
        content: `
          状況: ${context.stuckEvent.triggerType}
          理由: ${context.selectedReason}
          タスク: ${context.currentTask?.title}
          連続失敗: ${context.userHistory?.recentFailures}回
        `,
      },
    ],
  });
  
  return parseLLMResponse(response);
}
```

## 計測イベント

### 詰まり救済フロー（5イベント）

| イベント名 | タイミング | 主要プロパティ |
|---|---|---|
| `stuck_detected` | 詰まり検知時 | trigger_type, related_offer_id |
| `stuck_reason_selected` | 理由選択時 | stuck_id, reason |
| `stuck_help_shown` | 救済オプション表示時 | stuck_id, rescue_options |
| `stuck_help_applied` | 救済アクション選択時 | stuck_id, help_action |
| `rescue_after_resume` | 救済後の再開時 | stuck_id, resumed_offer_id, time_to_resume_sec |

### KPI計測

**KPI-05: 詰まり→救済採用**

計算式:
```
救済採用率 = stuck_help_applied / stuck_detected
```

目標: 50%以上

**救済後の完了率**

計算式:
```
救済後完了率 = (rescue_after_resumeから30分以内のlearning_session_complete) / rescue_after_resume
```

目標: 通常時の80%以上

**詰まりから再開までの時間**

プロパティ: `time_to_resume_sec`

目標: 平均60秒以内

## UI/言語ルール

### 画面構成

**Step 1: 理由選択**
- タイトル: 「どうしましたか？」
- サブタイトル: 「当てはまるものを選んでください」
- 選択肢: 3つ（ラベル＋説明）

**Step 2: 救済オプション**
- タイトル: 「これで進めますか？」
- サブタイトル: 「1つ選んでください」
- 選択肢: 3つ（ラベル＋説明）
- 戻るボタン

### 禁止事項

- ❌ 長文説明（ラベル: 10文字以内、説明: 15文字以内）
- ❌ 煽りや比較（「頑張れば必ずできます！」など）
- ❌ 複雑な選択肢（最大3つまで）

### 推奨事項

- ✅ 短文・動詞・具体（「小さく分割する」）
- ✅ ユーザーの主導権（「戻る」ボタン）
- ✅ 選択後は即座にアクション（Today画面へ）

## テスト方法

### 手動テスト

**パターン1: Recall連続失敗**
```
1. Today画面で学習開始
2. Focusを完了
3. Recall画面で「不正解」を3回連続選択
4. → Stuck画面が表示される
5. 理由「難しい」を選択
6. 救済「小さく分割する」を選択
7. → Today画面に戻り、「（1ステップ）」タスクが表示
8. コンソールで5つのイベントを確認
```

**イベント確認**:
```javascript
window.analytics.getEventBuffer()
  .filter(e => e.event_name.includes('stuck'))
  .map(e => ({ name: e.event_name, props: e.properties }));
```

## 既知の制約と今後の拡張

### 現在の制約

1. **テンプレート固定**: ユーザーのコンテキストに応じた動的な提案は未対応
2. **検知ルール単純**: 複合的な詰まり（例: 連続失敗 + 低自信度）は未対応
3. **救済効果の追跡未実装**: 救済後の成功率は計測するが、最適化は未対応
4. **Focus中断検知は未接続**: 検知ロジックは実装済みだが、画面からの呼び出しは未実装

### 今後の拡張候補

1. **LLM統合**
   - ユーザーの履歴と目標に基づいた動的な提案
   - タスク調整の精度向上
   - プロンプトエンジニアリング

2. **詰まり予測**
   - 詰まる前に予防的な提案
   - 学習パターンから疲労度を推定

3. **救済効果の最適化**
   - 救済アクション別の成功率を計測
   - 最適な救済アクションを自動選択

4. **マルチモーダル救済**
   - 動画や図解の提供
   - 音声ガイダンス

5. **Focus中断検知の接続**
   - Focus画面で中断時に詰まり検知を実行
   - 中断2回連続で詰まり画面へ

## 参照ドキュメント

- `docs/STUCK_RESCUE_TEMPLATES.md` - 救済テンプレート一覧
- `docs/02_Design.md § 4.6` - 詰まりビュー
- `docs/05_Decisions.md` - DEC-20260208-011
- `packages/web/src/services/coachService.ts` - CoachService実装
- `packages/web/src/services/stuckDetectionService.ts` - 詰まり検知ロジック
- `packages/web/src/pages/StuckPage.tsx` - 詰まり画面

---

**実装完了日**: 2026-02-08  
**次のステップ**: 救済採用率の計測とLLM統合判断（MVP運用開始後2週間）
