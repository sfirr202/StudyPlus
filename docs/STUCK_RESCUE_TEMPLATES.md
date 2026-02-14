# 詰まり救済テンプレート一覧

最終更新：2026-02-08

参照：P-104、docs/02_Design.md § 4.6

## 概要

詰まり救済機能は、ユーザーが学習中に詰まった際に、具体的で実行可能な救済策をテンプレートで提供します。

**MVP実装方針**：
- テンプレート固定応答
- 将来LLM（AI）に差し替え可能な設計
- 短文・具体・最大3択

## 詰まり検知トリガー

### 1. Recall連続失敗（repeated_fail）

**条件**：Recall 3問連続で不正解

**検知タイミング**：Recall回答後

**イベント**：`stuck_detected` (trigger_type: 'repeated_fail')

### 2. 低自信度の連続（low_confidence）

**条件**：Recall 3問連続で自信度1-2

**検知タイミング**：Recall回答後

**イベント**：`stuck_detected` (trigger_type: 'low_confidence')

### 3. Focus中断の連続（drop_off）

**条件**：Focus 2回連続で中断

**検知タイミング**：Focus開始時またはRecall後

**イベント**：`stuck_detected` (trigger_type: 'drop_off')

## 詰まり理由（最大3択）

ユーザーに選択させる理由：

| 理由ID | ラベル | 説明 |
|---|---|---|
| `too_hard` | 難しい | 理解が追いつかない |
| `unclear_how` | 何から手をつければよいか分からない | 進め方が不明 |
| `no_time` | 時間が足りない | 今は集中できない |

**イベント**：`stuck_reason_selected`

## 救済テンプレート（理由別）

### 理由: 難しい（too_hard）

| アクション | ラベル | 説明 | 実装 |
|---|---|---|---|
| `split` | 小さく分割する | 1ステップずつ進める | タスクを1分版に短縮 |
| `easier` | 易しくする | 難易度を下げる | 難易度を1段階下げる |
| `example` | 例を見る | 短い例で確認する | 「例：〜」タイトルに変更 |

### 理由: 時間が足りない（no_time）

| アクション | ラベル | 説明 | 実装 |
|---|---|---|---|
| `split` | 1分で完了する | 最小限に絞る | タスクを1分版に短縮 |
| `easier` | 短時間版にする | 1分モードで完了 | 時間を1分に、難易度を下げる |
| `alternate_route` | 別のタスクにする | 今日できるものに変える | 復習タスクに変更 |

### 理由: 何から手をつければよいか分からない（unclear_how）

| アクション | ラベル | 説明 | 実装 |
|---|---|---|---|
| `example` | 例を見る | やり方を確認する | 「例：〜」タイトルに変更 |
| `split` | 手順を分ける | 1つずつ進める | タスクを1分版に短縮 |
| `alternate_route` | 別のやり方にする | 分かりやすい方法で | 復習タスクに変更 |

### 理由: その他（other）

| アクション | ラベル | 説明 | 実装 |
|---|---|---|---|
| `split` | 小さく始める | 1ステップから | タスクを1分版に短縮 |
| `easier` | 易しくする | 無理なく進める | 難易度を1段階下げる |
| `alternate_route` | 別のタスクにする | 今日できるものに変える | 復習タスクに変更 |

**イベント**：`stuck_help_shown`、`stuck_help_applied`

## 救済アクションの実装詳細

### split（分割する）

```typescript
{
  id: `task_split_${Date.now()}`,
  title: `${currentTask.title}（1ステップ）`,
  description: '最初の1ステップだけ完了させる',
  timeBudget: 1,
  difficultyBand: currentTask.difficultyBand,
  source: 'replace',
}
```

### easier（易しくする）

```typescript
{
  id: `task_easier_${Date.now()}`,
  title: `${currentTask.title}（易しめ）`,
  description: '基礎的な内容から始める',
  difficultyBand: Math.max(1, currentTask.difficultyBand - 1),
  timeBudget: currentTask.timeBudget,
  source: 'replace',
}
```

### example（例を見る）

```typescript
{
  id: `task_example_${Date.now()}`,
  title: `例：${currentTask.title}`,
  description: '具体例を見てから取り組む',
  difficultyBand: currentTask.difficultyBand,
  timeBudget: currentTask.timeBudget,
  source: 'replace',
}
```

### alternate_route（別ルートにする）

```typescript
{
  id: `task_alternate_${Date.now()}`,
  title: '復習から始める',
  description: '前回の内容を確認する',
  difficultyBand: 1,
  timeBudget: currentTask.timeBudget,
  type: 'review',
  source: 'replace',
}
```

## 計測イベント

### stuck_detected

**タイミング**：詰まり検知時

**プロパティ**：
- `trigger_type`: 'repeated_fail' | 'low_confidence' | 'drop_off'
- `related_offer_id`: 関連するタスクID

### stuck_reason_selected

**タイミング**：ユーザーが理由を選択時

**プロパティ**：
- `stuck_id`: 詰まりイベントID
- `reason`: 'too_hard' | 'no_time' | 'unclear_how' | 'other'

### stuck_help_shown (rescue_shown)

**タイミング**：救済オプション表示時

**プロパティ**：
- `help_pack_id`: 救済パックID
- `stuck_id`: 詰まりイベントID
- `rescue_options`: 提示されたアクションの配列

### stuck_help_applied (rescue_action_taken)

**タイミング**：ユーザーが救済アクションを選択時

**プロパティ**：
- `help_action`: 'split' | 'example' | 'easier' | 'alternate_route'
- `stuck_id`: 詰まりイベントID

### rescue_after_resume

**タイミング**：救済後、Today画面に戻った時

**プロパティ**：
- `stuck_id`: 詰まりイベントID
- `resumed_offer_id`: 再開したタスクID
- `time_to_resume_sec`: 詰まりから再開までの秒数

## UI/言語ルール

### 禁止事項

- ❌ 長文説明
- ❌ 煽りや比較
- ❌ 複雑な選択肢（最大3つまで）

### 推奨事項

- ✅ 短文・動詞・具体（「小さく分割する」「例を見る」）
- ✅ ユーザーの主導権を保つ（「戻る」ボタン）
- ✅ 選択後は即座にアクション（Today画面へ戻る）

## AI差し替えポイント

### 現在（MVP）

```typescript
export const coachService = new TemplateCoachService();
```

### 将来（LLM統合後）

```typescript
export const coachService = 
  import.meta.env.VITE_AI_ENABLED === 'true'
    ? new LLMCoachService()
    : new TemplateCoachService();
```

**差し替え箇所**：
- `packages/web/src/services/coachService.ts`
- インターフェース `ICoachService` は変更不要
- `generateRescueOptions` と `applyRescueAction` を実装

**LLM実装例**：

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

## テスト方法

### 手動テスト

1. **Recall連続失敗を発生させる**
   ```
   1. Today画面で「これで進める」
   2. Focus完了
   3. Recall画面で3回連続不正解を選択
   4. → 詰まり画面が表示される
   ```

2. **低自信度の連続を発生させる**
   ```
   1. Recall画面で3回連続自信度1-2を選択
   2. → 詰まり画面が表示される
   ```

3. **Focus中断の連続を発生させる**
   ```
   1. Focus画面で「中断」を2回連続
   2. → 詰まり画面が表示される
   ```

4. **救済フローを確認**
   ```
   1. 詰まり画面で理由を選択
   2. 救済オプションが3つ表示される
   3. いずれかを選択
   4. → Today画面に戻り、調整されたタスクが表示される
   ```

### イベント確認

```javascript
// ブラウザの開発者ツール（F12）→ Console
window.analytics.getEventBuffer()
  .filter(e => e.event_name.includes('stuck') || e.event_name.includes('rescue'));
```

期待されるイベント順序：
1. `stuck_detected`
2. `stuck_reason_selected`
3. `stuck_help_shown`
4. `stuck_help_applied`
5. `today_offer_shown`
6. `rescue_after_resume`

## 既知の制約と今後の拡張

### 現在の制約

1. **テンプレート固定**：ユーザーのコンテキストに応じた動的な提案は未対応
2. **検知ルール単純**：複合的な詰まり（例: 連続失敗 + 低自信度）は未対応
3. **救済効果の追跡未実装**：救済後の成功率は計測するが、最適化は未対応

### 今後の拡張候補

1. **LLM統合**
   - ユーザーの履歴と目標に基づいた動的な提案
   - タスク調整の精度向上

2. **詰まり予測**
   - 詰まる前に予防的な提案
   - 学習パターンから疲労度を推定

3. **救済効果の最適化**
   - 救済アクション別の成功率を計測
   - 最適な救済アクションを自動選択

4. **マルチモーダル救済**
   - 動画や図解の提供
   - 音声ガイダンス

## 参照

- `docs/02_Design.md § 4.6` - 詰まりビュー
- `packages/web/src/services/coachService.ts` - CoachService実装
- `packages/web/src/services/stuckDetectionService.ts` - 詰まり検知ロジック
- `packages/web/src/pages/StuckPage.tsx` - 詰まり画面

---

**実装完了日**: 2026-02-08  
**次のステップ**: LLM統合（ユーザーフィードバックに基づいて判断）
