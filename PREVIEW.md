# Study Pro プレビュー手順

アプリをローカルでプレビューする手順です。**2つのターミナル**でフロントエンドとバックエンドを起動します。

---

## 1. バックエンドサーバーを起動

**ターミナル1**で実行：

```bash
cd packages/server
npm install
cp .env.example .env
```

`.env` を開き、OpenAI APIキーを設定（AI機能を使う場合）：

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

サーバーを起動：

```bash
npm run dev
```

次のように表示されればOKです：

```
🚀 Study Pro Server running on http://localhost:3001
📱 Allowed origins: http://localhost:5173, http://127.0.0.1:5173
🤖 OpenAI: ✓ Configured
```

---

## 2. フロントエンドを起動

**ターミナル2**（新しいターミナル）で実行：

```bash
cd packages/web
npm install
npm run dev
```

次のように表示されればOKです：

```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://127.0.0.1:5173/
```

**起動時にブラウザが自動で開く**設定にしてあります。開かない場合は手動で次のURLを開いてください。

---

## 3. ブラウザで開く

- 自動で開かない場合：ブラウザのアドレスバーに次のいずれかを入力して開く
  - **http://localhost:5173**
  - **http://127.0.0.1:5173**
- ブックマークや履歴から開く場合も上記URLを使用してください。

※ `127.0.0.1` と `localhost` は同じです。CORS は両方許可済みです。

---

## 4. 初回プレビュー時（オンボーディングから試す）

1. 開発者ツール（F12）→ Console を開く
2. 以下を実行して LocalStorage をクリア：
   ```javascript
   localStorage.clear()
   location.reload()
   ```
3. オンボーディング（学習内容入力 → 週目標 → 学習を始める）から操作
4. Today → Focus → Recall → Log → 進捗 の流れで確認

---

## 5. AI を使わずにプレビューする場合

バックエンドを起動せず、フロントエンドだけでもプレビューできます（テンプレートモードで動作）。

1. **ターミナル1**は不要（バックエンドを起動しない）
2. **ターミナル2**で `packages/web` の `npm run dev` のみ実行
3. `packages/web/.env` で AI をオフにする：
   ```env
   VITE_AI_ENABLED=false
   ```
4. ブラウザで http://localhost:5173 を開く

※ 「学習を始める」や学習コンテンツ生成はテンプレート／固定データで動作します。

---

## トラブルシューティング

| 現象 | 対処 |
|------|------|
| ポート 5173 が使用中 | 別アプリが使用していないか確認。Vite が別ポートを表示したらそのURLを開く |
| ポート 3001 が使用中 | `packages/server` のターミナルで Ctrl+C で停止後、再度 `npm run dev` |
| 「学習を始める」でエラー | バックエンドが起動しているか確認。`curl http://localhost:3001/health` で応答確認 |
| CORS エラー | フロントは **http://127.0.0.1:5173** または **http://localhost:5173** で開く（両方許可済み） |
| デザインが反映されない | 強制リロード（Cmd+Shift+R / Ctrl+Shift+R） |
| ブラウザが自動で開かない | 手動で http://localhost:5173 を開く |
| ページが真っ白・エラー | F12 → Console でエラー内容を確認。`npm run build` でビルドエラーがないか確認 |
| `uv_interface_addresses` / `Unknown system error 1` | `packages/web/vite.config.ts` の `host` が `true` のとき発生することがあります。`host: 'localhost'` に変更済みならそのまま `npm run dev` を再実行 |

---

## まとめ

| 役割 | コマンド | URL |
|------|----------|-----|
| バックエンド（API・AI） | `cd packages/server && npm run dev` | http://localhost:3001 |
| フロントエンド（UI） | `cd packages/web && npm run dev` | http://localhost:5173 |

**プレビュー用URL**: ブラウザで **http://localhost:5173** を開く。
