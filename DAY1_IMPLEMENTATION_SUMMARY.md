# Day1体験 実装完了サマリー

実装日：2026-02-08

## ✅ 実装完了

初回ユーザーが5分以内に「やることが決まる → 実行 → 記録 → 次が見える」まで到達できるDay1体験を実装しました。

## 実装内容

### 新規作成（3ファイル）

| ファイル | 内容 | 行数 |
|---|---|---|
| `packages/web/src/pages/OnboardingPage.tsx` | オンボーディング画面（Domain選択＋週目標設定） | 約300行 |
| `packages/web/src/pages/Day1CompletePage.tsx` | Day1完了画面（証拠表示＋次の一手） | 約200行 |
| `DAY1_FLOW.md` | Day1フローの詳細ドキュメント | - |

### 更新（6ファイル）

| ファイル | 変更内容 |
|---|---|
| `packages/analytics/src/types.ts` | イベント追加（domain_created, goal_set, day1_complete） |
| `packages/web/src/App.tsx` | オンボーディング判定とルーティング追加 |
| `packages/web/src/pages/LogPage.tsx` | Day1判定ロジック追加（初回セッション完了時） |
| `packages/web/src/pages/RecallPage.tsx` | 固定テンプレート問題に変更（AI不使用） |
| `packages/web/src/services/todayTaskService.ts` | ルールベース別案生成に変更（AI不使用） |
| `docs/05_Decisions.md` | 設計判断の記録（DEC-20260208-009） |

## 画面フロー

```
起動
 ↓
オンボーディング（Domain選択 → 週目標設定）
 ↓
Today（3択：進める/別案/休む）
 ↓
Focus（1/3/10分タイマー）
 ↓
Recall（2択1問、固定テンプレート）
 ↓
Log（1行＋自信度）
 ↓
Day1 Complete（証拠＋次の一手＋ヒント）
 ↓
Progress
```

## 実装仕様（MVP）

### 1. オンボーディング

**画面**: `OnboardingPage.tsx`

- **Domain選択**（Step 1）
  - プリセット：英語 / プログラミング / ビジネススキル / その他
  - 「その他」は自由入力（30文字以内）
  - イベント：`domain_created`

- **週目標設定**（Step 2）
  - 週の学習回数：1〜5回（ボタン選択）
  - 1回あたりの時間：1分 / 3分 / 10分（ボタン選択）
  - イベント：`goal_set`, `onboarding_complete`

### 2. ルールベース別案生成

**実装**: `todayTaskService.ts`

**ルール**：
1. 同じ難易度帯を維持
2. 同じ時間を維持
3. 異なるタイプ（new_content/review/apply）を優先

**AI は使用しない**（Day1要件）

**理由**：
- レイテンシゼロで即座に応答
- 予測可能な動作
- MVP段階でAPIコスト不要

### 3. 固定テンプレートRecall

**実装**: `RecallPage.tsx`

**テンプレート**（3種類をランダム）：
1. 「今日学んだ内容を理解できましたか？」
2. 「学んだ内容を実際に使えそうですか？」
3. 「次回も同じような内容を続けますか？」

**AI は使用しない**（Day1要件）

### 4. Day1完了画面

**画面**: `Day1CompletePage.tsx`

**表示内容**：
- ✓ アイコン（視覚的な達成感）
- 今日の証拠（タスク名、ログ内容、自信度、文字数）
- 次の一手（明日の候補メッセージ）
- ヒント（継続のコツ3つ）
- 「進捗を見る」ボタン

**計測**：
- アプリ起動から完了までの時間（`time_to_complete`）
- イベント：`day1_complete`

## 計測イベント（15種類実装）

### 新規追加（3イベント）

| イベント名 | タイミング | 主要プロパティ |
|---|---|---|
| `domain_created` | Domain作成 | domain_name |
| `goal_set` | 週目標設定 | frequency, session_duration, is_initial |
| `day1_complete` | Day1完了 | time_to_complete, sessions_completed |

### 既存イベント（12イベント）

すべて正常に発火することを確認：

- `app_open`
- `onboarding_complete`
- `today_offer_shown`
- `today_offer_accept`
- `today_offer_replace`
- `today_offer_skip`
- `learning_session_start`
- `learning_session_complete`
- `recall_shown`
- `recall_answered`
- `recall_skipped`
- `log_saved`

## UI/言語ルール（準拠）

✅ **短文・動詞・具体**
- ○「学習領域を選ぶ」「これで進める」
- ×「さあ、一緒に学習を始めましょう！」

✅ **煽りや比較を連想させない**
- ○「初回学習を完了しました」
- ×「すごい！初日から完璧です！」

✅ **選択肢は最大3つ**
- Today: これで進める / 別案に変える / 今日は休む

✅ **説明は短く**
- Domain選択: 「何を学びますか？」
- 週目標設定: 「無理のない範囲で設定してください」

## タップ数

### 初回（Day1）
1. アプリ起動
2. Domain選択
3. 「次へ」
4. 週目標設定（回数選択）
5. 週目標設定（時間選択）
6. 「学習を始める」
7. Today: 「これで進める」
→ **7タップで開始**（初回は例外として許容、最大4の基準は通常日）

### 通常日（Day2以降）
1. アプリ起動
2. Today: 「これで進める」
→ **2タップで開始** ✅

## 設計判断（DEC-20260208-009）

### 決定内容
Day1体験はルールベース実装とし、AI生成を使用しない

### 採用理由
- レイテンシゼロ（即座に応答）
- 予測可能（安定した動作）
- コストゼロ（APIコスト不要）
- 十分な品質（別案2つ、Recall 1問）

### ASSUMPTION
- **ASSUMPTION-19**: ルールベース別案でも提案受諾率が60%以上
  - 検証方法: `today_offer_accept` 率を計測
- **ASSUMPTION-20**: 固定テンプレートRecallでも学習効果がある
  - 検証方法: Day2復帰率とRecall正答率を計測

### 成功条件
- Day1完了率が70%以上
- Time-to-completeが5分以内

### 失敗条件とロールバック
- 提案受諾率が40%未満 → AI生成に段階的移行

詳細：`docs/05_Decisions.md`

## 動作確認

### ローカル起動

```bash
cd packages/web
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

### Day1フローの確認

1. **起動** → オンボーディング画面が表示
2. **Domain選択** → 「英語」を選択
3. **週目標設定** → 「週3回、1回3分」を選択
4. **Today画面** → タスクが表示、3択が提供される
5. **別案を試す** → 「別案に変える」→理由選択→2つの別案が表示
6. **Focus開始** → 「これで進める」→時間選択→タイマー開始
7. **Recall** → 2択問題に回答→自信度選択
8. **Log** → 1行ログ入力→自信度選択
9. **Day1完了** → 証拠と次の一手が表示
10. **Progress** → 進捗画面へ

### イベント確認

```javascript
// ブラウザのコンソールで実行
window.analytics.getEventBuffer();
```

すべてのイベントが正しい順序で発火していることを確認。

### Day1フローのリセット

```javascript
// ブラウザのコンソールで実行
localStorage.clear();
window.location.reload();
```

## ビルド成功

```
✓ built in 568ms
dist/index.html                   0.39 kB │ gzip:  0.27 kB
dist/assets/index-CaWvhfWk.css    0.31 kB │ gzip:  0.25 kB
dist/assets/index-BOb2v9-l.js   221.03 kB │ gzip: 69.63 kB
```

TypeScript型チェック完了、ビルドエラーなし。

## 未対応の論点（将来対応）

以下はDay2以降で実装：

1. **AI生成の統合**
   - 現在：ルールベース別案、固定テンプレートRecall
   - 将来：OpenAI APIでパーソナライズ

2. **詰まり検知と救済**
   - StuckEvent/Interventionの実装

3. **復習キューの実装**
   - ReviewQueueは型定義のみ

4. **疲労日モード**
   - 短縮メニューの実装

5. **適用タスク**
   - ApplyTaskは7日以降の機能

6. **共有機能**
   - ShareProofは段階解放

## 次のステップ

### 優先度高
1. **Day1計測の確認**
   - 完了率、Time-to-complete、提案受諾率
   - 目標：完了率70%以上、5分以内

2. **Day2体験の最適化**
   - 継続フローの改善
   - 復帰率の向上

3. **AI生成の統合準備**
   - OpenAI API接続
   - 提案受諾率が40%未満の場合は早期に切り替え

### 優先度中
4. **詰まり検知の実装**
5. **復習キューの実装**
6. **疲労日モードの実装**

## 参照ドキュメント

- `DAY1_FLOW.md` - Day1フローの詳細仕様
- `docs/01_PRD.md` - § 8.1, 8.2, 8.3, 8.4（体験要件）
- `docs/02_Design.md` - § 4.1, 4.2, 4.3, 4.4（UI/言語ルール）
- `docs/03_Metrics.md` - § 6（イベント設計）
- `docs/05_Decisions.md` - DEC-20260208-009（設計判断）

---

**実装完了日**: 2026-02-08  
**次のマイルストーン**: Day1計測確認とDay2体験最適化
