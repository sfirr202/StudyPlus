# Study Pro - Day1 体験フロー

実装日：2026-02-08

## 体験ゴール

初回ユーザーが **5分以内** に「やることが決まる → 実行 → 記録 → 次が見える」まで到達できる体験を提供する。

## Day1 完了条件

✅ Domain作成（学習領域の登録）  
✅ 週目標の仮設定  
✅ TodayTask提示（3択：これで進める / 別案に変える / 今日は休む）  
✅ FocusSession（1/3/10分の選択、デフォルトは最短）  
✅ Recall（2択1問、固定テンプレート、スキップ可能）  
✅ Log（1行＋自信度1〜4）  
✅ 完了画面（今日の証拠＋次の一手）  

## 画面遷移フロー

```
[起動] 
  ↓
[オンボーディング]
  │
  ├─ Step 1: Domain選択（学習領域）
  │   - プリセット：英語 / プログラミング / ビジネススキル / その他
  │   - 「その他」の場合は自由入力
  │   - イベント：domain_created
  │
  ├─ Step 2: 週目標設定
  │   - 週の学習回数：1〜5回
  │   - 1回あたりの時間：1分 / 3分 / 10分
  │   - イベント：goal_set, onboarding_complete
  │
  ↓
[Today]（今日の一つ）
  │   - TodayTask提示
  │   - イベント：today_offer_shown
  │
  ├─ 選択肢1: これで進める
  │   - イベント：today_offer_accept
  │   - → [Focus]へ
  │
  ├─ 選択肢2: 別案に変える
  │   - イベント：today_offer_replace
  │   - 理由選択：難しすぎる / 関心が薄い / 気分が乗らない / その他
  │   - 別案2つを表示（ルールベース生成）
  │   - → [Today]へ（新しいタスク）
  │
  └─ 選択肢3: 今日は休む
      - イベント：today_offer_skip
      - 理由選択：疲れている / 忙しい / その他
      - → [Progress]へ
  
  ↓
[Focus]（集中セッション）
  │   - 時間選択：1分 / 3分 / 10分
  │   - イベント：learning_session_start
  │   - タイマー動作
  │   - イベント：learning_session_complete
  │
  ↓
[Recall]（想起練習）
  │   - 2択問題を1問（固定テンプレート）
  │   - イベント：recall_shown
  │
  ├─ 回答する
  │   - 正誤判定
  │   - 自信度選択：1（低い）〜 4（高い）
  │   - イベント：recall_answered
  │   - → [Log]へ
  │
  └─ スキップする
      - イベント：recall_skipped
      - → [Log]へ
  
  ↓
[Log]（証拠記録）
  │   - 1行ログ入力（100文字以内）
  │   - 自信度選択：1〜4
  │   - イベント：log_saved
  │
  ↓
[Day1 Complete]（完了画面）
  │   - 今日の証拠（ログ内容）
  │   - 次の一手（明日の候補 or 復習予定）
  │   - ヒント（継続のコツ）
  │   - イベント：day1_complete
  │
  ↓
[Progress]（進捗画面）
```

## 実装仕様（MVP）

### 1. オンボーディング

**画面**: `OnboardingPage.tsx`

- **Domain選択**:
  - プリセット選択（英語、プログラミング、ビジネススキル、その他）
  - 「その他」の場合は自由入力欄を表示
  - 次へボタンで週目標設定へ

- **週目標設定**:
  - 週の学習回数：1〜5回（ボタン選択）
  - 1回あたりの時間：1分 / 3分 / 10分（ボタン選択）
  - 「学習を始める」ボタンでToday画面へ

- **データ保存**:
  - Domain、WeeklyGoal、UserProfile を localStorage に保存
  - `hasCompletedOnboarding: true` を設定

### 2. TodayTask 提示

**画面**: `TodayPage.tsx`

- **3択の提供**（必須）:
  1. これで進める → Focus画面へ
  2. 別案に変える → 理由選択 → 別案2つ表示 → 選択してToday画面へ
  3. 今日は休む → 理由選択 → Progress画面へ

- **別案生成（ルールベース）**:
  - AI は使用しない
  - 同じ難易度帯を維持
  - 同じ時間を維持
  - 異なるタイプ（new_content/review/apply）を優先
  - 実装: `todayTaskService.generateAlternatives()`

### 3. FocusSession

**画面**: `FocusPage.tsx`

- **時間選択**: 1分 / 3分 / 10分（デフォルトは最短ではなく、3つから選択）
- **タイマー**: カウントダウン表示、自動で次へ
- **中断**: 中断ボタンでToday画面へ戻る

### 4. Recall（固定テンプレート）

**画面**: `RecallPage.tsx`

- **問題**: 固定テンプレートから1問（ユーザー入力に依存しない）
  - 例: 「今日学んだ内容を理解できましたか？」
  - 選択肢: 「理解できた」「もう少し復習が必要」

- **テンプレート**（3種類をランダム）:
  1. 今日学んだ内容を理解できましたか？
  2. 学んだ内容を実際に使えそうですか？
  3. 次回も同じような内容を続けますか？

- **自信度**: 回答後に1〜4で選択
- **スキップ**: スキップボタンで Log 画面へ

### 5. Log（証拠記録）

**画面**: `LogPage.tsx`

- **1行ログ**: 100文字以内の自由入力
- **自信度**: 1（低い）〜 4（高い）
- **Day1判定**: 初回かつ初セッション完了の場合、Day1 Complete画面へ遷移

### 6. Day1 Complete

**画面**: `Day1CompletePage.tsx`

- **今日の証拠**: ログ内容、タスク名、自信度、文字数
- **次の一手**: 明日の候補メッセージ（固定テンプレート）
- **ヒント**: 継続のコツ（3つ）
- **完了時間**: アプリ起動から完了までの時間を計測

## 計測イベント（実装済み）

| イベント名 | タイミング | 主要プロパティ |
|---|---|---|
| `app_open` | アプリ起動 | entry_point |
| `domain_created` | Domain作成 | domain_name |
| `goal_set` | 週目標設定 | frequency, session_duration, is_initial |
| `onboarding_complete` | オンボーディング完了 | onboarding_path_id |
| `today_offer_shown` | Today提示 | offer_id, difficulty_band, time_budget |
| `today_offer_accept` | 提案受諾 | offer_id, time_budget |
| `today_offer_replace` | 提案差し替え | offer_id, replace_reason |
| `today_offer_skip` | 休む | skip_reason |
| `learning_session_start` | Focus開始 | offer_id, time_budget, mode |
| `learning_session_complete` | Focus完了 | duration_sec, time_budget, completed_ratio |
| `recall_shown` | Recall表示 | recall_type, question_id |
| `recall_answered` | Recall回答 | question_id, is_correct, confidence_level |
| `recall_skipped` | Recallスキップ | reason |
| `log_saved` | ログ保存 | log_type, length_char |
| `day1_complete` | Day1完了 | time_to_complete, sessions_completed |

## 実装ファイル

### 新規作成（3ファイル）

- `packages/web/src/pages/OnboardingPage.tsx` - オンボーディング画面（Domain＋週目標）
- `packages/web/src/pages/Day1CompletePage.tsx` - Day1完了画面
- `DAY1_FLOW.md` - このドキュメント

### 更新（6ファイル）

- `packages/analytics/src/types.ts` - イベント追加（domain_created, goal_set, day1_complete）
- `packages/web/src/App.tsx` - オンボーディング判定とルーティング
- `packages/web/src/pages/LogPage.tsx` - Day1判定ロジック
- `packages/web/src/pages/RecallPage.tsx` - 固定テンプレート問題
- `packages/web/src/services/todayTaskService.ts` - ルールベース別案生成
- `docs/05_Decisions.md` - 設計判断の記録

## UI/言語ルール（準拠）

✅ **短文・動詞・具体**:
- 「学習領域を選ぶ」「週目標を決める」「これで進める」

✅ **煽りや比較を連想させない**:
- 「初回学習を完了しました」（「すごい！」などの煽りなし）
- 進捗表示は数字のみ

✅ **選択肢は最大3つ**:
- Today: これで進める / 別案に変える / 今日は休む
- Focus: 1分 / 3分 / 10分

✅ **説明は短く**:
- Domain: 「何を学びますか？」
- 週目標: 「無理のない範囲で設定してください」

## タップ数（2タップ開始基準）

### 通常日（Day2以降）
1. アプリ起動
2. Today画面: 「これで進める」タップ
→ **2タップで開始** ✅

### 初回（Day1）
1. アプリ起動
2. Domain選択
3. 「次へ」タップ
4. 週目標設定
5. 「学習を始める」タップ
6. Today画面: 「これで進める」タップ
→ **6タップで開始**（初回は例外として許容）

## 開発者向け情報

### ローカル起動

```bash
# Webディレクトリに移動
cd packages/web

# 依存関係をインストール（初回のみ）
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

### Day1フローのリセット

```javascript
// ブラウザのコンソールで実行
localStorage.clear();
window.location.reload();
```

### イベント確認

```javascript
// ブラウザのコンソールで実行
window.analytics.getEventBuffer();
```

または画面右上の「イベント確認」ボタンをクリック。

## 成功条件

✅ 起動からDay1完了まで5分以内  
✅ すべての主要イベントが発火  
✅ 3択が確実に提供される  
✅ 別案はルールベース（AI不使用）  
✅ Recall問題は固定テンプレート  
✅ 画面内コピーは短文・動詞・具体  

## 未対応の論点

以下は将来対応：

1. **AI生成の統合**: 現在はルールベース、将来はOpenAI APIに切り替え
2. **詰まり検知と救済**: StuckEvent/Interventionの実装は後回し
3. **復習キューの実装**: ReviewQueueは型定義のみ
4. **疲労日モード**: 短縮メニューの実装は後回し
5. **適用タスク**: ApplyTaskは7日以降の機能
6. **共有機能**: ShareProofは段階解放

詳細: `docs/05_Decisions.md` DEC-20260208-009

---

**実装完了日**: 2026-02-08  
**次のマイルストーン**: Day2体験（継続フロー）の最適化
