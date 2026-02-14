# Study Pro v0.8 デモ実装ガイド

**実装日**: 2026-02-08  
**目的**: 縦スライス（入口→今日→集中→問題→記録→振り返り）の完成デモ

---

## 縦スライスフロー（E2E体験）

### 1. Onboarding（入口）

**画面**: `/onboarding`

**ステップ**:
1. **Domain選択**: ジャンル入力（自由入力＋候補4つ）
   - 英語、プログラミング、ビジネススキル、その他
2. **週目標設定**: 週◯回、1回◯分を選択
   - 週3回/週5回、1回1分/3分/10分

**計測イベント**:
- `domain_created`: Domain作成
- `goal_set`: 週目標設定
- `onboarding_complete`: オンボーディング完了

---

### 2. Today（今日の学習）

**画面**: `/today`

**操作**:
1. **これでOK（または「これにする」）**: タスクを受諾 → Focus画面へ
2. **別案に変える**: 代替タスクを3つ提示（難易度・時間調整）
3. **短縮（1/3分）**: 疲労時の短縮モード選択
   - 1分: 最小の一歩
   - 3分: 短時間集中
4. **今日は休む**: 休む理由を選択（疲れている/時間がない/その他）

**計測イベント**:
- `today_offer_shown`: Today提示
- `today_offer_accept`: 提案受諾
- `today_offer_replace`: 別案に変更
- `today_offer_skip`: 今日は休む

**実装ファイル**:
- `packages/web/src/pages/TodayPage.tsx`
- `packages/web/src/components/TodayCard.tsx`

---

### 3. Focus（集中タイマー）

**画面**: `/focus`

**操作**:
1. タイマー選択（1/3/10分）
2. 開始ボタン → カウントダウン
3. 完了 → Recall画面へ

**計測イベント**:
- `focus_start`: Focus開始
- `focus_complete`: Focus完了
- `focus_abandon`: Focus中断（途中離脱）

**実装ファイル**:
- `packages/web/src/pages/FocusPage.tsx`

---

### 4. Recall（想起練習）

**画面**: `/recall`

**操作**:
1. 2択問題を1問表示（固定テンプレート）
2. 回答 → 正誤表示
3. 自信度選択（1〜4）→ Log画面へ
4. スキップオプションあり

**計測イベント**:
- `recall_shown`: Recall問題表示
- `recall_answered`: Recall回答
- `recall_skipped`: Recallスキップ

**実装ファイル**:
- `packages/web/src/pages/RecallPage.tsx`

---

### 5. Log（学習記録）

**画面**: `/log`

**操作**:
1. 1行ログを入力（自由記述）
2. 自信度を選択（1〜4）
3. 保存 → Progress画面へ

**計測イベント**:
- `log_created`: Log作成

**実装ファイル**:
- `packages/web/src/pages/LogPage.tsx`

---

### 6. Progress/Review（週の振り返り）

**画面**: `/progress`

**表示内容**:
1. **週目標**: 完了回数 / 目標回数
2. **プログレスバー**: 週目標達成率（0〜100%）
3. **合計時間**: 今週の学習時間
4. **週の可視化**: 月〜日の7日間、完了した日にチェックマーク
5. **学習記録**: 今週のLog一覧（日付・内容・自信度）

**デザイン方針**:
- 煽らない、中立的な表現
- 「達成」「未達成」ではなく、「記録」として表示
- 過度なアニメーションや強調を避ける

**計測イベント**:
- （Progress画面自体のイベントは未定義）

**実装ファイル**:
- `packages/web/src/pages/ProgressPage.tsx`

---

## v0.8の追加機能

### 1. 短縮モード（1/3分）

**目的**: 疲労日でも「最小で前進」できる体験

**実装内容**:
- TodayCardに「短縮（1/3分）」ボタンを追加
- 選択時に1分または3分のタイマーでFocus開始
- 通常の10分タスクとは別のトラッキング

**ファイル**: `packages/web/src/components/TodayCard.tsx`

### 2. 週の可視化（Progress画面）

**目的**: 週の積み上がりを視覚的に確認

**実装内容**:
- 月〜日の7日間を円で表示
- 完了した日: 青い円 + チェックマーク
- 今日: 青い枠線の円
- 未来/未完了: グレーの円

**ファイル**: `packages/web/src/pages/ProgressPage.tsx`

### 3. A/B実験統合

**X-001: Today提示の強度**
- Control群: 「これで進める」
- Treatment群: 「これにする」

**X-002: Recallスキップ導線の強調**
- Control群: スキップボタンは下線テキスト
- Treatment群: スキップボタンは青枠ボタン

**実験管理**: `packages/web/src/services/experimentService.ts`

---

## プレビュー方法

### 1. 開発サーバー起動

```bash
cd packages/web
npm run dev
```

ブラウザで `http://127.0.0.1:5173/` を開く

### 2. 縦スライスの確認手順

#### 初回ユーザー体験（Day0）

1. `/` にアクセス → 自動的に `/onboarding` にリダイレクト
2. Domain選択（例: 「英語」）→ 次へ
3. 週目標設定（例: 週3回、1回3分）→ 完了
4. `/today` に遷移 → Todayカード表示
5. 「これで進める」をクリック → `/focus` に遷移
6. タイマー選択（3分）→ 開始 → 完了
7. `/recall` に遷移 → 問題表示 → 回答 → 自信度選択
8. `/log` に遷移 → 1行ログ入力 → 保存
9. `/progress` に遷移 → 週の記録表示

#### 2回目以降の体験（Day1〜）

1. `/` にアクセス → `/today` に遷移
2. 「別案に変える」または「短縮（1/3分）」を試す
3. Focus → Recall → Log → Progress の流れを確認

### 3. A/B実験の確認

```javascript
// ブラウザのコンソールで実行
const assignments = JSON.parse(localStorage.getItem('studypro_experiment_assignments') || '{}');
console.log('実験割付:', assignments);
```

割付を変更してテストする場合:

```javascript
localStorage.removeItem('studypro_experiment_assignments');
location.reload();
```

---

## 計測イベント一覧

| イベント名 | タイミング | 主要プロパティ |
|---|---|---|
| `domain_created` | Domain作成 | `domain_name` |
| `goal_set` | 週目標設定 | `frequency`, `session_duration`, `is_initial` |
| `onboarding_complete` | オンボーディング完了 | - |
| `today_offer_shown` | Today提示 | `offer_id`, `difficulty_band`, `time_budget` |
| `today_offer_accept` | 提案受諾 | `offer_id`, `time_budget` |
| `today_offer_replace` | 別案に変更 | `offer_id`, `replace_reason` |
| `today_offer_skip` | 今日は休む | `skip_reason` |
| `focus_start` | Focus開始 | `session_id`, `planned_duration` |
| `focus_complete` | Focus完了 | `session_id`, `actual_duration` |
| `recall_shown` | Recall問題表示 | `recall_type`, `question_id` |
| `recall_answered` | Recall回答 | `question_id`, `is_correct`, `confidence_level` |
| `recall_skipped` | Recallスキップ | `reason` |
| `log_created` | Log作成 | `log_id`, `confidence_level` |

すべてのイベントに自動付与:
- `experiment_id`: 実験ID（X-001/X-002など）
- `variant_id`: 割付群（control/treatment）

---

## デザイン原則（v0.8）

### 1. 文章表現

- ❌ 避ける: 比喩、強い言い回し、煽り
  - 例: 「継続の炎を燃やし続けよう！」
  - 例: 「今日もがんばりましょう！」
- ✅ 推奨: 中立、具体、短文
  - 例: 「今日の学習を始める」
  - 例: 「週3回、合計15分学習しました」

### 2. UI原則

- **1画面1主役**: 各画面は1つの主要アクションに集中
- **選択肢は最大3〜4**: 意思決定の負荷を減らす
- **説明は折りたたみ**: 必要なら展開できるが、デフォルトは簡潔

### 3. Web/モバイル両対応

- レスポンシブデザイン（max-width: 600px）
- タッチ操作を前提（ボタンサイズ44px以上推奨）
- シンプルなレイアウト（複雑なグリッドを避ける）

---

## 主要実装ファイル

### 画面（Pages）

- `packages/web/src/pages/OnboardingPage.tsx`: オンボーディング
- `packages/web/src/pages/TodayPage.tsx`: Today画面
- `packages/web/src/pages/FocusPage.tsx`: Focus画面
- `packages/web/src/pages/RecallPage.tsx`: Recall画面
- `packages/web/src/pages/LogPage.tsx`: Log画面
- `packages/web/src/pages/ProgressPage.tsx`: Progress/Review画面
- `packages/web/src/pages/StuckPage.tsx`: 詰まり救済画面（v0.8では未統合）

### コンポーネント（Components）

- `packages/web/src/components/TodayCard.tsx`: Todayカード
- `packages/web/src/components/AlternativeSheet.tsx`: 別案選択シート

### サービス（Services）

- `packages/web/src/services/storageService.ts`: データ永続化
- `packages/web/src/services/todayTaskService.ts`: Todayタスク生成
- `packages/web/src/services/experimentService.ts`: A/B実験管理
- `packages/web/src/services/aiService.ts`: AI抽象層（Mock実装）
- `packages/web/src/services/coachService.ts`: 詰まり救済（Template実装）
- `packages/web/src/services/stuckDetectionService.ts`: 詰まり検知

### アナリティクス

- `packages/analytics/src/types.ts`: イベント定義
- `packages/analytics/src/tracker.ts`: トラッカー実装

---

## v0.8の制約・未実装

### 1. AIは未統合

- TodayTask、Recall問題、詰まり救済はすべて固定/ルールベース
- AI統合の準備は完了（IAIService、ICoachService）
- 将来の差し替えポイントは明確

### 2. 詰まり救済は未統合

- StuckPageは実装済みだが、縦スライスには含まれていない
- 詰まり検知ロジックはRecallPageに統合済み
- ユーザーが明示的に `/stuck` にアクセスすれば動作

### 3. サーバー側は未実装

- すべてのデータはLocalStorageに保存
- 複数デバイス間の同期はなし
- APIエンドポイントは未実装

### 4. 通知・リマインダーは未実装

- プッシュ通知、メール通知なし
- 復帰導線（Return flow）はUI未実装

---

## 次のステップ（v0.9〜v1.0）

### v0.9: サーバー統合

- LocalStorage → サーバー側API
- ユーザー認証
- 複数デバイス対応

### v1.0: AI統合

- OpenAI API統合
- TodayTask生成、Recall問題生成、詰まり救済のAI化
- Feature Flag（AI_ENABLED）で段階的有効化

### 今後の改善候補

- 通知・リマインダー機能
- 復習キュー（Spacing）の本実装
- 復帰導線（Return flow）のUI実装
- Fatigueモード（疲労日短縮）の自動提案
- 共有機能（煽らない設計）

---

## トラブルシューティング

### ビルドエラー

```bash
cd packages/web
npm run build
```

エラーが出た場合は、TypeScript型エラーを確認。

### LocalStorageがクリアされる

実験割付やオンボーディング状態がリセットされる場合：

```javascript
// 手動で初期化
localStorage.removeItem('has_completed_onboarding');
localStorage.removeItem('studypro_experiment_assignments');
location.reload();
```

### A/B実験の割付が変わらない

ハッシュベースの固定割付のため、同一ユーザーIDでは常に同じ群。
別の群をテストする場合は、LocalStorageをクリアしてリロード。

---

## 関連ドキュメント

- `docs/01_PRD.md`: プロダクト要求仕様
- `docs/02_Design.md`: UX設計仕様
- `docs/03_Metrics.md`: 計測定義
- `docs/04_Experiments.md`: A/B実験仕様
- `docs/05_Decisions.md`: 意思決定ログ
- `AB_EXPERIMENT_IMPLEMENTATION.md`: A/B実験土台実装
- `STUCK_RESCUE_IMPLEMENTATION.md`: 詰まり救済実装
- `AI_INTEGRATION_GUIDE.md`: AI統合ガイド
