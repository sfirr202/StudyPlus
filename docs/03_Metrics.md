# 03_Metrics：計測定義とイベント設計

成果物ID：METRICS-1 / Version：1.1

最終更新：2026-02-08

対象：モバイルアプリとWeb

参照：PRIN-1、PRD-1、DESIGN-1

---

## 目次

0. このドキュメントの目的
1. 計測の前提
2. North Star Metric
3. 主要KPIの定義
4. Guardrail 指標
5. 指標とイベントの対応表
6. イベント設計
7. ダッシュボード案
8. アラート設計
9. データ品質チェック
10. ローカル検証手順
11. プライバシーと倫理
12. 実装ファイル
13. 関連ドキュメント
14. 変更履歴

---

## 0. このドキュメントの目的

Study Pro の体験と実験を、数字で再現可能にするための定義書。以下を満たすことを目的とする。

- 主要KPIが誰が見ても同じ計算になる
- Web / モバイルで同一イベント名・同一プロパティで集計できる
- 04_Experiments のA/Bで、成功/失敗を迷わず判定できる
- データ品質とプライバシーのルールが明確である

---

## 1. 計測の前提

### 1-1. 対象範囲
MVPの体験単位
- Today提示と選択
- 学習セッション
- Recall
- Log
- 詰まり救済
- 復帰導線
- 復習キューと消化

### 1-2. 単位の定義
- ユーザー: user_idで識別
- セッション: session_idで識別。開始から30分無操作で切る
- 日: ユーザーのtimezoneを基準に日次集計する
- 初回: 最初の「初回完了」を起点とする

---

## 2. North Star Metric

### NSM: 週目標達成率（Week Goal Completion Rate）

**定義**: ユーザーが設定した週目標を達成した割合

**計算方法**:
- 分母: 週目標を設定しているアクティブユーザー数
- 分子: その週に週目標を達成したユーザー数

**達成条件の例**:
- 週3回の学習セッション完了
- 週5回の学習セッション完了
- 週の合計学習時間が目標時間以上

**測定タイミング**: 週次（日曜締め、月曜集計を推奨）

**分解軸**:
- domain_id（学習領域）
- user_segment（5分派 / 30分派）
- cohort_week（登録週）

**選定理由**:
- 学習継続と成果の両方を反映する
- ユーザーの主観的な達成感と相関が高い
- 短期的な施策効果と長期的な定着の両方を測定できる

参照：PRD-1 § 6 成功指標

---

## 3. 主要KPIの定義

> まずはこの7指標が取れれば、MVP判断とA/B判断ができる

### KPI-01 Time-to-start（開始までの時間）

- **定義**: アプリ起動から、学習セッション開始までの秒数
- **計算**:
  - start_ts = app_open の timestamp
  - end_ts = learning_session_start の timestamp
  - Time-to-start = end_ts - start_ts
- **集計**: p50 / p75 / p90 を必ず見る（平均値は外れ値に引きずられるため参考程度）
- **分解軸**: platform, is_first_time, variant_id
- **目標値**: p75 で 30秒以内（ASSUMPTION）

参照：PRD-1 § 6, P-101

### KPI-02 初回完了率
- 定義: 初回ユーザーが、初回導線で「初回完了」まで到達した割合
- 計算:
  - 分母: first_time_user で app_open したユーザー数
  - 分子: onboarding_complete を送ったユーザー数
- 分解軸: platform, variant_id

### KPI-03 提案受諾率
- 定義: Today提示に対して「これで進める」を選択した割合
- 計算:
  - 分母: today_offer_shown
  - 分子: today_offer_accept
- 分解軸: domain_id, difficulty_band, variant_id

### KPI-04 提案差し替え率
- 定義: Today提示に対して「別案に変える」を選択した割合
- 計算:
  - 分母: today_offer_shown
  - 分子: today_offer_replace
- 分解軸: domain_id, variant_id

### KPI-05 詰まり発生率と救済採用率
- 詰まり発生率
  - 分母: learning_session_start
  - 分子: stuck_detected
- 救済採用率
  - 分母: stuck_help_shown
  - 分子: stuck_help_applied
- 分解軸: trigger_type, variant_id

### KPI-06 復帰率
- 定義: 一定日数の未ログイン後に再訪し、復帰導線で学習を開始した割合
- 推奨条件: 3日以上未ログインを復帰対象とする
- 計算:
  - 分母: comeback_screen_shown
  - 分子: comeback_resume_start
- 分解軸: days_since_last_active, platform, variant_id

### KPI-07 Day2 / Day7 継続
- Day2
  - 定義: 初回完了の翌日に、学習セッション開始がある割合
  - 分母: onboarding_complete
  - 分子: onboarding_complete +1日で learning_session_start があるユーザー
- Day7
  - 定義: 初回完了の7日後までに、学習セッション開始がある割合
  - 分母: onboarding_complete
  - 分子: onboarding_complete +7日以内に learning_session_start があるユーザー
- 分解軸: variant_id, platform

---

## 4. Guardrail 指標（副作用監視）

Guardrail 指標は、施策が意図しない悪影響を引き起こしていないかを監視する。以下の指標が閾値を超えた場合、施策のロールバックまたは修正を検討する。

### G-01 セッション長の過度な長文化

- **定義**: learning_session_complete の duration_sec が、過去4週の中央値から+50%以上増加
- **リスク**: 疲労層に過負荷を与え、離脱を誘発
- **閾値**: p75 が 15分超過（ASSUMPTION）
- **対応**: 疲労日モードの発動条件を緩和、または時間上限を設定

### G-02 未消化復習キューの肥大化

- **定義**: review_queue_added の累積数が、review_queue_done を大幅に上回る状態
- **計算**: backlog_ratio = (未消化数 / 週の追加数)
- **閾値**: backlog_ratio > 2.0 が3日連続
- **リスク**: 罪悪感の増大、復帰障壁の上昇
- **対応**: 復習キューの圧縮、優先度の再調整

### G-03 共有の比較・消耗反応

- **定義**: 共有機能利用後の継続率低下、またはネガティブフィードバックの増加
- **計算**: 共有機能利用ユーザーの Day7 継続率 vs 非利用ユーザー
- **閾値**: 利用ユーザーの Day7 が -5%pt 以上悪化
- **リスク**: 比較による自己否定、学習動機の低下
- **対応**: 共有範囲の制限、ランキング要素の削除

### G-04 AI提示の受諾率低下

- **定義**: today_offer_accept の割合が継続的に低下
- **閾値**: 4週移動平均で 50% 未満（ASSUMPTION）
- **リスク**: Today提示がユーザーの意図と乖離、信頼低下
- **対応**: AI生成ロジックの見直し、フィードバック収集

### G-05 詰まり発生率の急増

- **定義**: stuck_detected の発生率が急増
- **閾値**: 週次で +20%以上増加
- **リスク**: コンテンツ難易度の不適合、ユーザー体験の悪化
- **対応**: 難易度調整、救済発動条件の緩和

参照：PRD-1 § 6 Guardrail、P-104, P-106

---

## 5. 指標とイベントの対応表

| 指標 | 必要イベント |
|---|---|
| Time-to-start | app_open, learning_session_start |
| 初回完了率 | app_open, onboarding_complete |
| 提案受諾率 | today_offer_shown, today_offer_accept |
| 提案差し替え率 | today_offer_shown, today_offer_replace, today_offer_shown |
| 詰まり→救済採用 | stuck_detected, stuck_help_shown, stuck_help_applied |
| 復帰率 | comeback_screen_shown, comeback_resume_start |
| Day2/Day7 | onboarding_complete, learning_session_start |

---

## 6. イベント設計

### 6-1. 共通ルール
- すべてのイベントに必須で付ける
  - user_id
  - session_id
  - timestamp
  - platform 例 web, ios, android
  - app_version
  - timezone
- 実験中は必ず付ける
  - experiment_id
  - variant_id
- 任意の設計値として付ける
  - domain_id
  - is_first_time
  - days_since_last_active

### 6-2. イベント一覧

#### app_open
- いつ: アプリが表示可能になった瞬間
- 目的: Time-to-startの起点
- properties:
  - entry_point 例 icon, notification, deep_link

#### today_offer_shown
- いつ: Todayカードが表示された瞬間
- properties:
  - offer_id
  - offer_type 例 today_task
  - difficulty_band 例 1,2,3
  - time_budget 例 1,3,10
  - offer_source 例 default, replace

#### today_offer_accept
- いつ: 「これで進める」を押した瞬間
- properties:
  - offer_id
  - time_budget

#### today_offer_replace
- いつ: 「別案に変える」を押した瞬間
- properties:
  - offer_id
  - replace_reason 例 too_hard, not_relevant, no_mood, other

#### today_offer_skip
- いつ: 「今日は休む」を押した瞬間
- properties:
  - skip_reason 例 tired, busy, other

#### learning_session_start
- いつ: 学習セッションを開始した瞬間
- properties:
  - offer_id
  - time_budget
  - mode 例 normal, short_mode

#### learning_session_complete
- いつ: 学習セッションを完了した瞬間
- properties:
  - duration_sec
  - time_budget
  - completed_ratio

#### onboarding_complete
- いつ: 初回導線が完了した瞬間
- properties:
  - onboarding_path_id

#### recall_shown
- いつ: Recallを表示した瞬間
- properties:
  - recall_type 例 two_choice, fill_blank, summary
  - question_id

#### recall_answered
- いつ: Recallに回答した瞬間
- properties:
  - question_id
  - is_correct
  - confidence_level 例 1,2,3,4

#### recall_skipped
- いつ: Recallをスキップした瞬間
- properties:
  - reason 例 tired, no_time, not_ready

#### log_saved
- いつ: ログを保存した瞬間
- properties:
  - log_type 例 one_line
  - length_char

#### stuck_detected
- いつ: 詰まり状態と判定した瞬間
- properties:
  - trigger_type 例 repeated_fail, low_confidence, drop_off
  - related_offer_id

#### stuck_help_shown
- いつ: 救済導線を表示した瞬間
- properties:
  - help_pack_id

#### stuck_help_applied
- いつ: 救済案を採用した瞬間
- properties:
  - help_action 例 split, example, easier, alternate_route

#### review_queue_added
- いつ: 復習キューに追加した瞬間
- properties:
  - item_id
  - planned_at
  - interval_days

#### review_queue_done
- いつ: 復習キューを消化した瞬間
- properties:
  - item_id
  - result 例 done, skipped

#### comeback_screen_shown
- いつ: 未ログイン後の復帰画面を表示した瞬間
- properties:
  - days_since_last_active

#### comeback_resume_start
- いつ: 復帰導線で再開を押した瞬間
- properties:
  - resume_type 例 resume_today

---

## 7. ダッシュボード案

### 7-1. 日次で見る
- DAU
- Time-to-start p50/p75
- Today提示回数と受諾率・差し替え率・休む率
- 初回完了率
- Recall実施率とスキップ率
- 詰まり発生率と救済採用率
- 復帰率

### 7-2. 週次で見る
- Day2 / Day7
- 週目標達成率
- 復習キューの未消化量分布

---

## 8. アラート設計

リアルタイムまたは日次で監視し、異常を検知した際にチームに通知する仕組みを設ける。

### 8-1. クリティカルアラート（即時対応）

| アラート名 | 条件 | 通知先 | 対応 |
|---|---|---|---|
| API エラー率急増 | 過去1時間のエラー率 > 5% | Slack #alerts, オンコール担当 | インシデント対応、ロールバック検討 |
| Time-to-start 悪化 | p75 が過去4週平均から +50% | Slack #product | 原因調査、A/Bロールバック検討 |
| Day2 継続率急落 | 日次 Day2 が過去1週平均から -10%pt | Slack #product | コホート分析、実験影響確認 |

### 8-2. ウォーニングアラート（週次レビュー）

| アラート名 | 条件 | 通知先 | 対応 |
|---|---|---|---|
| 未消化キュー肥大化 | backlog_ratio > 2.0 が3日連続 | Slack #product | キュー圧縮ロジックの調整 |
| AI提示受諾率低下 | today_offer_accept < 50% が2週連続 | Slack #product | AI生成ロジック見直し |
| Guardrail 指標悪化 | G-01〜G-05 のいずれか | Slack #product | 該当機能の一時停止または調整 |

### 8-3. アラート運用ルール

- クリティカルアラートは24時間監視（オンコール体制）
- ウォーニングアラートは週次ミーティングで確認
- 誤検知が多い場合は閾値を再調整

---

## 9. データ品質チェック

### 9-1. 自動チェック項目

以下は `@studyplus/analytics` ライブラリで自動的にチェックされます：

- app_open と learning_session_start のtimestampが逆転していない
- session_id が欠損していない
- platform が想定外の値になっていない
- 必須プロパティ（user_id, session_id, timestamp, platform, app_version, timezone）が存在する
- イベント固有プロパティの型と値の範囲が正しい

### 9-2. 手動チェック項目

以下は分析基盤側でクエリを実行して定期的に確認します：

- eventが二重送信されていない（同一 user_id + event_name + timestamp の重複）
- experiment_id と variant_id が空になっていない（実験中のみ）
- Time-to-start が異常値になっていない（負の値、または極端に長い値）
- 日付境界での集計が正しい（timezone を考慮した日次集計）

---

## 10. ローカル検証手順

開発中にイベントが正しく発火するかを確認する手順です。

### 10-1. 計測ライブラリのセットアップ

```bash
# プロジェクトルートで実行
cd packages/analytics
npm install
npm run build
```

### 10-2. サンプル実行（主要KPIの計測確認）

```bash
cd packages/analytics
npm run build
node -r ts-node/register src/example.ts
```

**確認ポイント**:
- すべての主要イベント（app_open, today_offer_shown, learning_session_start など）がコンソールに出力される
- 各イベントに必須プロパティ（user_id, session_id, timestamp など）が含まれている
- Time-to-start が正しく計算される（1.5秒前後）

### 10-3. バリデーションテスト

```bash
cd packages/analytics
npm run build
node -r ts-node/register src/test-validator.ts
```

**確認ポイント**:
- 正常なイベントが PASS する
- 不正な値（time_budget: 999、confidence_level: 5 など）が FAIL する
- バリデーションエラーメッセージが明確

### 10-4. Web/モバイルアプリでの動作確認

#### Webアプリでの確認手順

1. ブラウザの開発者ツールを開く（F12）
2. Console タブを選択
3. アプリを操作（Today提示、学習セッション開始など）
4. `[Analytics]` で始まるログが出力されることを確認

```javascript
// コンソールで手動確認
window.analytics.getEventBuffer();
// => 発火したイベントの配列が返る

window.analytics.getTimeToStart();
// => Time-to-startが計算される
```

#### モバイルアプリでの確認手順（iOS）

1. Xcode でアプリを実行
2. Debug Navigator → Console を選択
3. アプリを操作
4. `[Analytics]` で始まるログが出力されることを確認

#### モバイルアプリでの確認手順（Android）

1. Android Studio でアプリを実行
2. Logcat を選択
3. `Analytics` でフィルタ
4. アプリを操作してログを確認

### 10-5. 本番環境への移行前チェックリスト

- [ ] すべての主要イベント（§ 6-2）が実装されている
- [ ] 主要KPI（§ 3）が計算できる最小限のイベントが発火する
- [ ] 開発モード（isDevelopment: true）でコンソールログが出力される
- [ ] バリデーションエラーが適切に検出される
- [ ] Time-to-start が正しく計算される
- [ ] Mixpanel/Amplitude などのプロバイダーが正しく初期化される
- [ ] 実験中は experiment_id と variant_id が自動付与される
- [ ] プライバシーポリシーに準拠（学習内容の原文は送信しない）

### 10-6. デバッグツール

以下のメソッドを使って、開発中にイベントの状態を確認できます：

```typescript
// イベントバッファを取得
const buffer = tracker.getEventBuffer();
console.log('発火したイベント:', buffer);

// バッファをクリア
tracker.clearBuffer();

// Time-to-startを計算
const timeToStart = tracker.getTimeToStart();
console.log(`Time-to-start: ${timeToStart}秒`);
```

### 10-7. よくある問題と対処法

| 問題 | 原因 | 対処法 |
|---|---|---|
| イベントが発火しない | トラッカーが初期化されていない | 初期化コードが実行されているか確認 |
| 必須プロパティが欠損 | getUserId / getSessionId が空を返す | ユーザー認証状態を確認 |
| timestamp が逆転 | デバイスの時刻がずれている | サーバー時刻同期を検討 |
| バリデーションエラー | 不正な値を渡している | エラーメッセージを確認し、型定義を参照 |
| Time-to-start が異常 | app_open が複数回発火している | アプリ起動時の初期化処理を見直す |

---

## 11. プライバシーと倫理
- 学習内容そのものや自由記述の原文は、分析基盤に送らない
- ログ本文は length_char のような要約値を送る
- ユーザーの同意が必要な計測は、同意状態を保持して分岐する
- 保存期間と削除方針を決め、実装と運用に反映する

---

## 12. 実装ファイル

計測ライブラリの実装は以下のファイルで構成されています：

- `packages/analytics/src/types.ts` - イベント型定義
- `packages/analytics/src/tracker.ts` - トラッカー本体
- `packages/analytics/src/validators.ts` - バリデーション
- `packages/analytics/src/example.ts` - 使用例
- `packages/analytics/src/test-validator.ts` - テストコード
- `packages/analytics/README.md` - ライブラリの使い方

---

## 13. 関連ドキュメント

- **00_Principles.md**：サービス設計原則
- **01_PRD.md**：プロダクト要求仕様
- **02_Design.md**：UX設計仕様
- **04_Experiments.md**：A/B実験仕様
- **05_Decisions.md**：意思決定ログ

---

## 14. 変更履歴

| 日付 | Version | 変更内容 | 担当者 |
|---|---|---|---|
| 2026-02-08 | 1.2 | ローカル検証手順の追加、データ品質チェックの詳細化、実装ファイルの章追加 | - |
| 2026-02-08 | 1.1 | North Star Metric の明記、Guardrail 指標の詳細化、アラート設計の追加、章番号の修正、目次追加 | - |
| - | 1.0 | 初版作成 | - |
