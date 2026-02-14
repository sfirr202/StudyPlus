# A/B実験土台 実装概要

**実装日**: 2026-02-08  
**参照**: docs/04_Experiments.md, docs/03_Metrics.md

---

## 目的

Study Proで継続的なプロダクト改善を行うため、A/B実験の土台を実装しました。

- ユーザー単位の固定割付（同一ユーザーが揺れない）
- 実験ID、割付群、開始日、終了日の管理
- 成功/失敗条件の判定機能（MVP版）

---

## 実装内容

### 1. 実験管理サービス（`experimentService`）

**ファイル**: `packages/web/src/services/experimentService.ts`

**機能**:

1. **実験定義の管理**
   - 実験ID、名前、開始日、終了日、割付比率、有効フラグを保持
   - 2つの実験を定義（X-001, X-002）

2. **ユーザー割付の管理**
   - ハッシュベースの安定した割付（ユーザーID + 実験ID → 決定論的なハッシュ値）
   - LocalStorageに保存し、同一ユーザーは常に同じ群に割り付け
   - 実験期間外またはフラグOFFの場合は `disabled` を返す

3. **実験判定機能**
   - `evaluateExperiment()`: 実験結果データから成功/失敗を判定
   - X-001, X-002ごとに個別の判定ロジック（MDEベース）
   - 統計検定（t検定、z検定、p値）は未実装（MVP）

**主要API**:

```typescript
// ユーザーの割付を取得
getVariant(userId: string, experimentId: string): ExperimentVariant

// すべての実験の割付を取得
getAllVariants(userId: string): { [experimentId: string]: ExperimentVariant }

// 実験の成功/失敗を判定
evaluateExperiment(experimentId: string, results: ExperimentResult[]): ExperimentDecision
```

---

### 2. 実験情報のアナリティクス統合

**ファイル**: `packages/web/src/App.tsx`

**変更内容**:

- `AnalyticsTracker` の `getCustomProperties()` に実験情報を追加
- すべてのイベントに `experiment_id` と `variant_id` を自動付与
- 実験が無効な場合は `undefined` を返す

**効果**:

- イベントログから実験群ごとの指標を集計可能
- 実験ごとのTime-to-start、提案受諾率、Day2継続率などを比較可能

---

### 3. 実装済み実験（MVP: 2本）

#### X-001：Today提示の強度

**目的**: Today提示の文言の強さが、受諾率と継続に影響するか検証

**UI差分**:

- **Control群**: 「これで進める」（中立的な表現）
- **Treatment群**: 「これにする」（弱い表現、選択権を強調）

**実装ファイル**:

- `packages/web/src/components/TodayCard.tsx`: UI差分実装
- `packages/web/src/pages/TodayPage.tsx`: 割付取得とTodayCardへ渡す

**期間**: 2026-02-10 〜 2026-02-24（14日間）

**主要指標**:

- Time-to-start（p75）: 40秒 → 30秒（-25%改善）
- 提案受諾率: 70% → 75%（+5%pt）
- Day2継続率: 40% → 45%（+5%pt）
- Day7継続率: 25% → 30%（+5%pt）

**成功条件**:

1. Time-to-start が Treatment群で -10秒以上改善
2. 提案受諾率が Treatment群で維持（-5%pt以内）
3. Day2継続率が Treatment群で悪化しない（-5%pt以内）
4. Day7継続率が Treatment群で悪化しない（-5%pt以内）

---

#### X-002：Recallスキップ導線の強調

**目的**: Recallのスキップ導線を強調することで、強制感を減らし継続率が改善するか検証

**UI差分**:

- **Control群**: スキップボタンは下線テキスト（目立たない）
- **Treatment群**: スキップボタンは通常ボタン（青枠で強調）

**実装ファイル**:

- `packages/web/src/pages/RecallPage.tsx`: UI差分実装と割付取得

**期間**: 2026-02-10 〜 2026-02-24（14日間）

**主要指標**:

- Recallスキップ率: 20% → 30%（+10%pt）
- Focus完了率: 80% → 80%（維持）
- Day2継続率: 40% → 45%（+5%pt）
- 初回完了率: 60% → 70%（+10%pt）

**成功条件**:

1. Recallスキップ率が上昇（予想通り）
2. 初回完了率が維持または改善（-5%pt以内）
3. Day2継続率が +5%pt以上改善
4. Focus完了率が維持（-5%pt以内）

---

## 実装の制約・トレードオフ

### 統計検定未実装（MVP）

- **現状**: MDEを超える改善があるかどうかの単純な判定のみ
- **理由**: 統計ライブラリ（jStatなど）の導入と、t検定/z検定/p値計算の実装は工数が大きい
- **影響**: 正確な有意性判定ができない。目安としての判定のみ
- **対応**: 実験結果は外部ツール（Evan's A/B Tools など）で再検証する

### クライアント側の割付

- **現状**: ユーザーID + 実験ID のハッシュで決定論的に割付
- **メリット**: サーバー実装不要、すぐに実験開始可能
- **デメリット**: 複雑な条件（購入履歴、デバイスタイプなど）での割付は困難
- **対応**: 将来的にサーバー側で割付ロジックを拡張可能

### LocalStorageでの保存

- **現状**: 割付情報を LocalStorage に保存
- **メリット**: 簡易実装、オフライン対応
- **デメリット**: ユーザーが LocalStorage をクリアすると割付が変わる
- **対応**: 実験期間中はクリアしないことを前提（実験結果の分析時にノイズとして扱う）

---

## 検証手順（手動）

### 1. 割付の確認

```javascript
// ブラウザのコンソールで実行
const experimentService = window.__experimentService; // 開発用にグローバルに公開する場合

// ユーザーの割付を確認
const userId = 'user_demo_001';
console.log('X-001 割付:', experimentService.getVariant(userId, 'X-001')); // control or treatment
console.log('X-002 割付:', experimentService.getVariant(userId, 'X-002')); // control or treatment

// すべての実験の割付を確認
console.log('全割付:', experimentService.getAllVariants(userId));
```

### 2. UI差分の確認

#### X-001: Today提示の強度

1. `/today` にアクセス
2. **Control群**: ボタンが「これで進める」と表示される
3. **Treatment群**: ボタンが「これにする」と表示される

#### X-002: Recallスキップ導線の強調

1. `/recall` にアクセス
2. **Control群**: スキップボタンは下線テキスト（目立たない）
3. **Treatment群**: スキップボタンは青枠のボタン（強調）

### 3. アナリティクスイベントの確認

```javascript
// ブラウザのコンソールで実行
// すべてのイベントに experiment_id と variant_id が付与されているか確認
```

**期待値**:

```json
{
  "event": "today_offer_shown",
  "experiment_id": "X-001",
  "variant_id": "control", // or "treatment"
  "offer_id": "task_123",
  // ... その他のプロパティ
}
```

### 4. 実験判定機能の確認（開発用）

```javascript
// ダミーデータで判定機能をテスト
const results = [
  // Control群
  { experimentId: 'X-001', variant: 'control', metric: 'time_to_start', value: 40, sampleSize: 100, timestamp: new Date().toISOString() },
  { experimentId: 'X-001', variant: 'control', metric: 'today_offer_accept_rate', value: 70, sampleSize: 100, timestamp: new Date().toISOString() },
  { experimentId: 'X-001', variant: 'control', metric: 'day2_retention', value: 40, sampleSize: 100, timestamp: new Date().toISOString() },
  { experimentId: 'X-001', variant: 'control', metric: 'day7_retention', value: 25, sampleSize: 100, timestamp: new Date().toISOString() },
  
  // Treatment群
  { experimentId: 'X-001', variant: 'treatment', metric: 'time_to_start', value: 28, sampleSize: 100, timestamp: new Date().toISOString() },
  { experimentId: 'X-001', variant: 'treatment', metric: 'today_offer_accept_rate', value: 72, sampleSize: 100, timestamp: new Date().toISOString() },
  { experimentId: 'X-001', variant: 'treatment', metric: 'day2_retention', value: 42, sampleSize: 100, timestamp: new Date().toISOString() },
  { experimentId: 'X-001', variant: 'treatment', metric: 'day7_retention', value: 27, sampleSize: 100, timestamp: new Date().toISOString() },
];

const decision = experimentService.evaluateExperiment('X-001', results);
console.log('判定結果:', decision);
```

**期待値**:

```json
{
  "experimentId": "X-001",
  "decision": "success",
  "reason": "Time-to-startが改善, 提案受諾率が維持, Day2継続率が維持, Day7継続率が維持",
  "timestamp": "2026-02-08T...",
  "metrics": [
    { "name": "time_to_start", "control": 40, "treatment": 28, "improvement": -12 },
    { "name": "today_offer_accept_rate", "control": 70, "treatment": 72, "improvement": 2 },
    { "name": "day2_retention", "control": 40, "treatment": 42, "improvement": 2 },
    { "name": "day7_retention", "control": 25, "treatment": 27, "improvement": 2 }
  ]
}
```

---

## 次のステップ

### 実験開始（2026-02-10）

1. 実験フラグを有効化（既に `isActive: true` で定義済み）
2. ユーザーにアプリをリリース
3. 先行指標（Time-to-start、提案受諾率、Recallスキップ率）を週次で確認

### 途中確認（2026-02-17、7日経過）

- 先行指標を確認し、早期停止の判断を行う
  - **早期成功停止**: 主要指標が p < 0.01 で有意に改善、最小サンプルの50%以上達成
  - **早期失敗停止**: 主要指標が p < 0.05 で有意に悪化、Guardrail違反、実装バグ

### 実験終了（2026-02-24）

- 遅行指標（Day2継続率、Day7継続率）を確認
- 実験結果を `docs/05_Decisions.md` に記録
- 成功した場合は Treatment群を本採用、失敗した場合は Control群に戻す

### 統計検定の本実装（将来）

- 統計ライブラリ（jStatなど）を導入
- t検定、z検定、p値、信頼区間、検出力計算を実装
- 外部ツール（Optimizely、Google Optimizeなど）の検討

---

## 関連ドキュメント

- **docs/04_Experiments.md**: 実装済み実験詳細、統計的基準、早期停止ルール
- **docs/03_Metrics.md**: 計測イベント定義、指標とイベントの対応表
- **docs/05_Decisions.md**: DEC-20260208-012（A/B実験土台の決定事項）

---

## 変更ファイル一覧

### 新規作成

- `packages/web/src/services/experimentService.ts`: 実験管理サービス
- `AB_EXPERIMENT_IMPLEMENTATION.md`: 本ドキュメント

### 変更

- `packages/web/src/App.tsx`: 実験情報のアナリティクス統合
- `packages/web/src/components/TodayCard.tsx`: X-001 UI差分実装
- `packages/web/src/pages/TodayPage.tsx`: X-001 割付取得
- `packages/web/src/pages/RecallPage.tsx`: X-002 UI差分実装と割付取得
- `docs/04_Experiments.md`: 実装済み実験詳細を追加
- `docs/05_Decisions.md`: DEC-20260208-012 を追加
