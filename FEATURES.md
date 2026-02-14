## Study Pro 機能一覧（MVP / 今後の予定）

プロジェクト内のコード（`packages/web`・`packages/server`）と PRD (`docs/01_PRD.md`) をもとに、現時点の機能を整理したサマリです。  
各機能ごとに **MVP で実装済みか / これから実装予定か** を明示しています。

---

## 1. 画面・ナビゲーション構成

- **グローバルナビ（`App.tsx`）** ✅
  - タブ構成: `今日 / 学習 / ノート / 進捗 / アカウント`
  - オンボーディング中もタブは常時表示
  - `設定` は `アカウント` 配下の `/account/settings` に統合
  - 開発時のみ「イベント確認」ボタンから `@studyplus/analytics` のバッファ内容を確認可能

---

## 2. 各画面と提供機能

### 2.1 オンボーディング（`OnboardingPage`） ✅

- **目的**
  - 初回起動時にユーザーの「学習領域」と「週目標」をセットし、`UserProfile` / `WeeklyGoal` を生成する。

- **実装済み**
  - 表示名（任意）入力
  - 学習したいテーマの自由入力（例: 英語、プログラミングなど）
  - 週あたりの学習回数・1回あたりの分数をスライダーで設定
  - 「学習を始める」で `plannerService.generateTodaySet` を呼び出し、初回 `TodayTask` を生成
  - サーバー死活監視 (`/health`) ＋ プラン生成 API 失敗時のフォールバック（`TemplatePlanner`）
  - オンボーディング完了時に `UserProfile.hasCompletedOnboarding = true` を保存し、`onboarding_complete` イベント送信

- **今後の拡張候補**
  - 学習ジャンルに応じたおすすめカリキュラムのプレビュー（PRD 8.1/8.2 の拡張）
  - アカウント作成（メール / Google サインイン）とサーバー同期（`APIStorageService` の本実装）

---

### 2.2 Today（今日）– `TodayPage` / `TodayCard` ✅

- **目的**
  - ユーザーに「今日やるタスクを1つだけ」提示し、迷わずスタートできるようにする。

- **実装済み**
  - Todayカードに以下を表示:
    - タイトル（例: 「ワイヤーフレームとプロトタイピング」）
    - サブ説明（何をするか）
    - 想定時間バッジ（1 / 3 / 10 分）
    - 難易度バッジ（易しい / 中級 / 難しい）
  - アクション:
    - **「これで/これにする」**: 選択した `TodayTask` を `FocusPage` に渡して遷移
    - **「別案に変える」**: `AlternativeSheet` を開き、他のタスク候補から選択
    - **「今日は休む」**: スキップ理由（疲れた / 忙しい / その他）を入力し、`/progress` へ遷移
  - タスク決定・スキップ時のアナリティクス:
    - `today_offer_shown` / `today_offer_accept` / `today_offer_replace` / `today_offer_skip`
  - Today タスク管理:
    - `storageService.getTodayTask()` で未完了タスクを復元
    - 未設定時は `plannerService.generateTodaySet()` で新規作成し `storageService.saveTodayTask()`

- **今後の拡張候補**
  - タスクの「細分化」や難易度自動調整（PRD 8.5 Spacing の高度化）
  - 「やりたくない理由」からの自動リコメンド（`stuckDetectionService` + `coachService` の本格利用）

---

### 2.3 学習（Focus）– `FocusPage` ✅（AIノートはテンプレフォールバックあり）

- **目的**
  - 1/3/10分の短時間セッションで、学びやすく・終わりが見える学習体験を提供する。

- **実装済み**
  - ステップ1: 学習内容の入力
    - 自由記述テキストエリア（「今日は何を学ぶか」）
    - 「何を学べばいいか分からない？」 → `handleSuggestTopics()` で `/api/planner/suggest-topics` を呼び出し、タイトル＋難易度付きのおすすめトピックカードを表示
  - ステップ2: 時間選択
    - 1 / 3 / 10 分ボタン（短縮モードは 1 / 3 分に置き換え）
  - ステップ3: タイマー
    - 円形カウントダウン（残り秒数を `remainingSeconds` で管理）
    - `contentService.getLearningContent()` で `LearningContent`（説明 / 例 / 演習 / コツ）を取得
    - メモ欄（`notes`）で自分の気づきをメモ
    - セッション完了時:
      - `FocusSession` を `completed` で `storageService.saveFocusSession()` に保存
      - `learning_session_complete` イベント送信（`duration_sec` / `time_budget` / `completed_ratio`）
      - `noteService.generateAndSaveNote()` で **自動ノート生成 + 保存**（AI 失敗時はテンプレ）
      - `badgeService.evaluateBadgesAfterSession()` でバッジ獲得判定（`badge_unlocked` イベント）
      - `navigate('/recall')` でリコール画面へ

- **今後の拡張候補**
  - `AIContentService` / `OpenAIService` を使った本番用の学習コンテンツ生成（`openai.generateLearningContent` の本実装）
  - `MockAIService` を `OpenAIService` に差し替えて、より高度な解説・例題・クイズ生成
  - 自動ノート生成 API（`/api/notes/generate`）の実装と、実際の LLM 連携

---

### 2.4 リコール（Recall）– `RecallPage` ✅（テンプレベース）

- **目的**
  - セッション直後に 1〜2問の「思い出し問題」で記憶を定着させる。

- **実装済み**
  - `RecallItem`（2択 or 穴埋め）の表示
  - 回答 + `confidenceLevel`（1〜4）の入力
  - `recall_answered` / `recall_skipped` イベント送信
  - `ReviewQueue` への登録（`review_queue_added` / `review_queue_done`）
  - 「また後で」系のスキップ（疲労日など）

- **今後の拡張候補**
  - PRD 8.3 の設計に沿った、よりリッチな問題パターン（要約問題、ラダー式など）
  - 復習スケジューラの高度化（間隔の最適化アルゴリズム導入）

---

### 2.5 学習ログ – `LogPage` ✅

- **目的**
 - セッションごとの「やったこと」を1行で残し、振り返りをしやすくする。

- **実装済み**
  - `LogEntry` 一覧表示（並び替え: 新しい順）
  - 各エントリに:
    - ログ本文（1行）
    - 日付
    - 自信度（★1〜4）
  - `log_saved` イベント送信（`length_char` / `log_type`）

- **今後の拡張候補**
  - 絞り込み・タグフィルタ（ドメイン別、期間別）
  - ログをもとにした「週間ふりかえり」やエクスポート機能

---

### 2.6 進捗 – `ProgressPage` ✅（週・月ビューあり）

- **目的**
  - くり返し学習の「積み上がり」を視覚的に把握し、モチベーションを維持する。

- **実装済み**
  - 今週ビュー:
    - 円形プログレス（`completedSessions / goalFrequency`、黒ベタリング表示）
    - 統計ピル（「○回達成」「合計○分」）
    - 1週間の学習日ドット（ステータス: `completed` / `today` / `future`）
    - 今週の `LogEntry` 一覧（左アクセント＋自信度★）
  - 今月ビュー:
    - 合計学習時間・学習日数のサマリ
    - カレンダーヒートマップ（1日あたりの学習時間を濃淡で表示）
  - 週目標が未設定の場合:
    - 「週目標を設定すると、週間の進捗が表示されます」とガイド
    - 「目標を設定する」ボタン → `/account/settings`

- **今後の拡張候補**
  - 月間目標（PRD 8.x には未定義。将来的に追加可能）
  - 連続日数（ストリーク）やベスト記録の可視化

---

### 2.7 ノート – `NotesPage` / `NoteDetailPage` ✅（自動生成＋追記）

- **目的**
  - セッションごとに自動生成されたノートを一覧・編集し、後から振り返れるようにする。

- **実装済み**
  - ノート一覧:
    - 新しい順で `Note` 一覧（タイトル / 日付 / 学習時間 / タグ）
    - 検索バー:
      - タイトル・要約・重要ポイント・自分のメモ・タグを横断検索
      - 検索実行ごとに `note_search` イベント送信
  - ノート詳細:
    - 固定フォーマット（タイトル、要約、重要ポイント、例、自分のメモ、次にやること、リコール問題）
    - 「自分のメモ」欄は追記・更新可能（`saveNote` 実行時に `note_edit` イベント）
    - 「1タップでリコール問題を1問出す」機能:
      - `Note.recallQuestions` からランダムに1問ピックアップして表示
  - 自動ノート生成:
    - `noteService.generateAndSaveNote()` が `FocusSession` / `TodayTask` / コンテンツサマリから `Note` を作成
    - LLM 失敗時もテンプレで必ずノートを作成（空ノートにならない）

- **今後の拡張候補**
  - ノート内の「タグ」自動抽出（AI 有効時）
  - ノートの共有（リンク発行・エクスポート）
  - ノートと `RecallItem` の双方向リンク（ノートから復習に飛ぶ、復習から元ノートに戻る）

---

### 2.8 アカウント – `AccountPage` / `SettingsPage` ✅（MVP版）

- **目的**
  - 自分の学習プロファイルとバッジ進捗を確認し、基本設定を行う。

- **実装済み**
  - プロファイル表示:
    - 表示名（`UserProfile.displayName`）
    - 現在のドメイン（`currentDomain.name`）
    - 週目標（週○回 / 1回○分）
  - バッジ一覧:
    - バッジ定義（`BadgeDefinition`）と進捗（`BadgeProgress`）をマッピング
    - 獲得済み / 未獲得の視覚化（アイコンの塗りつぶし・ラベル）
  - 設定画面へのリンク:
    - `設定を開く` ボタン → `/account/settings` の `SettingsPage` に遷移
  - `SettingsPage`（MVP版）:
    - テーマ（濃淡）の切り替え UI 枠
    - 通知 ON/OFF 用トグル（実際の OS 通知連携は今後の拡張）
    - ローカルデータのリセット / エクスポートの項目枠

- **今後の拡張候補**
  - 実際の通知設定（Web Push / メール連携）
  - マルチデバイス同期用のアカウント連携（Firebase Auth / OAuth など）
  - バッジの詳細画面・獲得条件の履歴表示

---

## 3. データ保存と同期

- **ローカル保存（MVP 実装済み）** ✅
  - すべてのユーザーデータは `LocalStorageService` 経由でブラウザに保存
  - 対象:
    - `user_profile`
    - `weekly_goal`
    - `today_task`
    - `focus_sessions`
    - `recall_items`
    - `review_queue`
    - `log_entries`
    - `stuck_events` / `interventions`
    - `notes`
    - `badge_progress`

- **サーバー同期（今後の予定）** 🟡
  - `storageService` に `APIStorageService` の雛形あり（コメントアウト済み）
  - `VITE_USE_API === 'true'` 時に自動で REST API に切り替えられるようにする設計
  - 将来的には:
    - プロフィール・タスク・ノート・バッジ等をバックエンドと同期
    - 複数デバイス間での進捗共有

---

## 4. AI / イベント計測まわり

### 4.1 AI 関連（補助機能） 🟡 一部スタブ実装済み

- **実装済みのインターフェース**
  - `aiService`（`MockAIService` 実装）
  - `openaiService`（サーバー側の OpenAI 呼び出しラッパーの雛形）
  - `contentService.AIContentService`（`/api/content/generate` 呼び出しをラップ、失敗時はテンプレにフォールバック）
  - `noteService.tryGenerateAINote()`（`/api/notes/generate` 呼び出し、現状は 501 → テンプレにフォールバック）

- **今後の実装予定（PRD §2 / §8.3 など）**
  - 実際の OpenAI / Anthropic 等との統合
  - 学習内容からの要約生成 / 重要ポイント抽出 / リコール問題自動生成
  - AI 提示のオン/オフ制御（`AI_ENABLED` / `VITE_AI_ENABLED`）の本番導入

### 4.2 イベント計測 – `@studyplus/analytics` ✅

- **共通プロパティ**（`BaseEvent`）:
  - `user_id` / `session_id` / `timestamp` / `platform` / `app_version` / `timezone`
  - 任意: `domain_id` / `is_first_time` / `experiment_id` / `variant_id`
- **実装済みイベント（抜粋）**
  - `app_open`
  - `today_offer_shown` / `today_offer_accept` / `today_offer_replace` / `today_offer_skip`
  - `learning_session_start` / `learning_session_complete` / `session_start` / `session_complete`
  - `recall_shown` / `recall_answered` / `recall_skipped`
  - `log_saved`
  - `note_generated_success` / `note_generated_fallback`
  - `note_open` / `note_edit` / `note_search`
  - `badge_unlocked`
  - `review_queue_added` / `review_queue_done`
  - `day1_complete` / `comeback_*` / `stuck_*`（救済機能関連）

- **今後の拡張候補**
  - アカウント・設定まわりのイベント（例: `account_open`, `settings_changed`）
  - 実験（ABテスト）と紐づいた KPI ダッシュボード整備（`ExperimentService` の活用）

---

## 5. まとめ: MVP での到達点と今後の方向性

- **MVP で実装済み（✅）**
  - オンボーディング（ドメイン＋週目標の設定）
  - Today（1日1タスクの提示 + 別案／休む）
  - Focus（1/3/10分のタイマー＋テンプレート学習コンテンツ＋メモ＋完了処理）
  - Recall（2択/穴埋め＋自信度＋簡易的な復習キュー）
  - Log（1行メモ＋自信度の記録）
  - Progress（週次＋月次の進捗可視化）
  - ノート（**テンプレベースの自動生成＋追記・検索・1タップリコール**）
  - アカウント & バッジ（ローカル判定）
  - ローカルストレージベースのデータ永続化
  - イベント計測基盤（`@studyplus/analytics`）

- **今後追加 / 拡張したいもの（🟡）**
  - AI ベースのコンテンツ生成・ノート生成（OpenAI/Anthropic 連携）
  - サーバーサイド永続化・マルチデバイス同期（`APIStorageService` の本実装）
  - バッジ・進捗・ノートのさらなる可視化（ストリーク、より細かい指標）
  - 設定・通知・アカウント連携の本番実装
  - PRD 8.x で定義されている細かな体験（救済パターン、カレンダー強化など）の拡張

この `FEATURES.md` をベースに、今後のタスクやルール作成の際の「機能カタログ」として使えるようにしています。必要に応じて、ここにタスクIDや画面キャプチャへのリンクも追記していけます。+
