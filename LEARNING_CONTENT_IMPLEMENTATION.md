# 学習内容の記録機能 実装ガイド

**実装日**: 2026-02-08  
**目的**: 「時間計測だけ」から「実際の学習記録」に変更

---

## 問題点（Before）

### ユーザー体験

1. **Onboarding**: 「英語を学ぶ」と入力
2. **Today**: 「基本文法の確認」というタスクが表示
3. **Focus**: タイマー開始 → **何を学ぶかは自分で決める**（アプリ外）
4. **Recall**: 「理解できましたか？」（形式的な質問）
5. **Log**: 「今日学んだこと」を入力

→ **実質的には「時間計測アプリ」**

---

## 改善内容（After）

### 新しいユーザー体験

1. **Onboarding**: 「英語を学ぶ」と入力
2. **Today**: 「基本文法の確認」を選択
3. **Focus（改善）**:
   - **ステップ1**: 「今日学ぶ内容」を入力
     - 例: 「現在完了形の復習」
   - **ステップ2**: 学習時間を選択（1/3/10分）
   - **ステップ3**: タイマー実行中にメモを取れる
4. **Recall（改善）**: 「『現在完了形の復習』を理解できましたか？」
5. **Log（改善）**: 学習内容とメモが自動入力される

→ **実際の学習記録アプリ**

---

## 実装詳細

### 1. FocusSession型の拡張

`packages/web/src/types/index.ts`

```typescript
export interface FocusSession {
  // ... 既存のフィールド
  /** 学習内容（ユーザー入力） */
  learningContent?: string;
  /** メモ（Focus中に記録） */
  notes?: string;
}
```

---

### 2. FocusPageの3ステップフロー

`packages/web/src/pages/FocusPage.tsx`

#### ステップ1: 学習内容の入力

```typescript
{step === 'content' && (
  <>
    <p>今日学ぶ内容を入力してください</p>
    <textarea
      placeholder="例：現在完了形の復習、React Hooksのドキュメントを読む"
      value={learningContent}
      onChange={(e) => setLearningContent(e.target.value)}
      rows={4}
    />
    <button onClick={handleContentNext}>次へ</button>
  </>
)}
```

**検証**: 
- 学習内容が空の場合はアラート表示
- 入力後、次のステップへ

#### ステップ2: 学習時間の選択

```typescript
{step === 'duration' && (
  <>
    <div>学習内容：{learningContent}</div>
    <p>学習時間を選んでください</p>
    <button onClick={() => handleStart(1)}>1分</button>
    <button onClick={() => handleStart(3)}>3分</button>
    <button onClick={() => handleStart(10)}>10分</button>
    <button onClick={() => setStep('content')}>戻る</button>
  </>
)}
```

**機能**:
- 学習内容をプレビュー表示
- 「戻る」ボタンで学習内容を編集可能

#### ステップ3: タイマー実行中（メモ機能）

```typescript
{step === 'running' && (
  <>
    <div>学習内容：{learningContent}</div>
    <div>タイマー: {remainingTime}</div>
    <textarea
      placeholder="学んだことや気づきをメモ"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      rows={3}
    />
    <button onClick={handleInterrupt}>中断</button>
  </>
)}
```

**機能**:
- タイマー実行中でもメモを取れる
- 学習内容は常に表示（何を学んでいるか忘れない）

---

### 3. Plannerの改善（学習内容ベースの問題生成）

`packages/web/src/services/plannerService.ts`

#### generateRecallQuestion の拡張

```typescript
async generateRecallQuestion(
  domain: Domain,
  task: TodayTask,
  sessionDuration: number,
  learningContent?: string  // 追加
): Promise<RecallItem>
```

#### 問題テンプレートの改善

**Before（汎用的）**:
- 「今日学んだ英語の内容を理解できましたか？」

**After（具体的）**:
- 「『現在完了形の復習』を理解できましたか？」
- 「『現在完了形の復習』の要点を説明できますか？」

```typescript
private getRecallTemplates(
  domain: Domain,
  task: TodayTask,
  learningContent?: string
) {
  const content = learningContent || task.title;
  
  return [
    {
      question: `「${content}」を理解できましたか？`,
      choices: ['理解できた', 'もう少し復習が必要'],
      correctAnswer: '理解できた',
    },
    // ... 他のテンプレート
  ];
}
```

---

### 4. LogPageの改善（自動入力）

`packages/web/src/pages/LogPage.tsx`

#### 学習内容とメモの表示

```typescript
{session.learningContent && (
  <div style={styles.contentBox}>
    <p>学習内容：</p>
    <p>{session.learningContent}</p>
  </div>
)}

{session.notes && (
  <div style={styles.notesBox}>
    <p>メモ：</p>
    <p>{session.notes}</p>
  </div>
)}
```

#### ログの自動入力

```typescript
useEffect(() => {
  // Focus中の学習内容とメモをデフォルト値として設定
  const defaultLog = session.learningContent || '';
  const notes = session.notes ? ` - ${session.notes}` : '';
  setLogContent((defaultLog + notes).slice(0, 100));
}, [session]);
```

**効果**:
- ユーザーが改めて入力する手間を削減
- 学習内容の一貫性を保つ
- 編集は可能（必要に応じて修正できる）

---

## 使用フロー

### 1. Onboarding

```
1. Domain選択: 「英語」
2. 週目標設定: 週3回、3分
```

### 2. Today → Focus

```
1. Today: 「基本文法の確認」を選択
2. Focus ステップ1: 学習内容入力
   入力例: 「現在完了形の文法ルールを覚える」
   → 「次へ」ボタン
   
3. Focus ステップ2: 学習時間選択
   表示: 「学習内容：現在完了形の文法ルールを覚える」
   → 「3分」ボタン
   
4. Focus ステップ3: タイマー実行
   3分タイマー開始
   メモ入力（任意）: 「have/has + 過去分詞」
   → 自動完了
```

### 3. Recall

```
問題表示: 「『現在完了形の文法ルールを覚える』を理解できましたか？」
選択肢:
- 理解できた
- もう少し復習が必要

→ 回答後、自信度選択（1〜4）
```

### 4. Log

```
学習内容: 「現在完了形の文法ルールを覚える」（青背景）
メモ: 「have/has + 過去分詞」（黄背景）

1行ログ（自動入力）: 「現在完了形の文法ルールを覚える - have/has + 過去分詞」
→ 編集可能

自信度選択: 3
→ 保存
```

### 5. Progress

```
週の記録:
- 今日: ✓ 完了
- ログ: 「現在完了形の文法ルールを覚える - have/has + 過去分詞」
```

---

## AIなしで学習体験が成立

### ユーザーが記録する内容

1. **Focus前**: 「今日学ぶ内容」を入力
   - 例: 教科書のページ、動画タイトル、練習問題番号

2. **Focus中**: メモを取る
   - 例: 重要ポイント、気づき、疑問点

3. **Recall**: 学習内容に基づいた問題に回答

4. **Log**: 自動入力された内容を確認・編集

### AIがなくても

- ユーザー自身が学習内容を決める
- アプリはそれを記録・可視化する
- 振り返りで成長を実感できる

→ **時間計測アプリではなく、学習記録アプリとして機能**

---

## 変更ファイル

### 型定義

- `packages/web/src/types/index.ts`
  - FocusSessionに `learningContent` と `notes` を追加

### ページ

- `packages/web/src/pages/FocusPage.tsx`
  - 3ステップフローの実装
  - 学習内容入力、時間選択、メモ機能

- `packages/web/src/pages/RecallPage.tsx`
  - 学習内容をPlannerに渡す

- `packages/web/src/pages/LogPage.tsx`
  - 学習内容とメモの表示
  - ログの自動入力

### サービス

- `packages/web/src/services/plannerService.ts`
  - `generateRecallQuestion` に `learningContent` パラメータを追加
  - 学習内容ベースの問題テンプレート

---

## プレビュー確認

開発サーバー: `http://127.0.0.1:5173/`

### 確認項目

1. **Focus ステップ1（学習内容入力）**:
   - テキストエリアが表示される
   - プレースホルダーが表示される
   - 空で「次へ」を押すとアラート

2. **Focus ステップ2（時間選択）**:
   - 学習内容がプレビュー表示される
   - 1/3/10分ボタンが表示される
   - 「戻る」ボタンで前のステップに戻れる

3. **Focus ステップ3（タイマー）**:
   - 学習内容が表示される
   - タイマーがカウントダウンする
   - メモを入力できる
   - 中断ボタンが表示される

4. **Recall**:
   - 学習内容が問題文に含まれる
   - 例: 「『現在完了形の復習』を理解できましたか？」

5. **Log**:
   - 学習内容が青背景で表示される
   - メモが黄背景で表示される（入力した場合）
   - 1行ログに自動入力される
   - 編集可能

---

## 次のステップ

### 1. 学習リソースの提示

Focus画面で、学習内容に応じた参考リンクや教材を提示：

```
学習内容: 「現在完了形の復習」
→ 推奨リソース:
  - NHK基礎英語
  - Duolingo 文法レッスン
  - YouTube解説動画
```

### 2. 学習履歴の分析

過去の学習内容を分析して、復習が必要なトピックを提案：

```
過去の学習:
- 現在完了形（7日前、自信度2）
- 関係代名詞（3日前、自信度3）

→ 今日の提案:
  「現在完了形の復習」（復習推奨）
```

### 3. AI統合

OpenAI APIで学習内容からパーソナライズされた問題を生成：

```
学習内容: 「現在完了形の復習」
→ AI生成問題:
  「次の文を現在完了形に書き換えてください：I eat breakfast.」
```

---

## トラブルシューティング

### 問題: 学習内容が保存されない

**原因**: FocusSessionの保存時に `learningContent` が含まれていない

**解決策**: 
```typescript
const newSession: FocusSession = {
  // ... 他のフィールド
  learningContent: learningContent.trim(),
  notes: '',
};
```

### 問題: Recallで学習内容が表示されない

**原因**: Plannerに学習内容が渡されていない

**解決策**:
```typescript
const learningContent = session.learningContent;
const item = await planner.generateRecallQuestion(
  domain, 
  task, 
  session.duration, 
  learningContent  // 追加
);
```

### 問題: Logで学習内容が自動入力されない

**原因**: useEffectで学習内容を設定していない

**解決策**:
```typescript
useEffect(() => {
  const defaultLog = session.learningContent || '';
  const notes = session.notes ? ` - ${session.notes}` : '';
  setLogContent((defaultLog + notes).slice(0, 100));
}, [session]);
```

---

## まとめ

### 改善前

- ❌ 時間計測だけ
- ❌ 何を学んだか記録されない
- ❌ Recallは形式的
- ❌ Logは手動入力のみ

### 改善後

- ✅ 学習内容を記録
- ✅ Focus中にメモを取れる
- ✅ Recallは学習内容ベース
- ✅ Logは自動入力（編集可）
- ✅ AIなしで学習体験が成立

→ **「時間計測アプリ」から「学習記録アプリ」へ**
