# Voice Agent v2 - TODO

## 完了済み

- [x] Nova Sonic 版を `nova-sonic/` に退避
- [x] 改善プラン作成（`docs/improvement.md`）
- [x] 方針確定（テキスト入力 + Claude Haiku 4.5 + Polly Kazuha + SSE）
- [x] `package.json` 作成（React, Vite, Amplify, `@aws-sdk/client-polly`）
- [x] TypeScript 設定（tsconfig.json, tsconfig.app.json, tsconfig.node.json）
- [x] `vite.config.ts`, `index.html` 作成
- [x] `npm install` で依存インストール確認
- [x] `amplify/auth/resource.ts`（Cognito 認証）
- [x] `amplify/agent/resource.ts`（AgentCore Runtime、JWT 認証）
- [x] `amplify/backend.ts`（auth + agent 統合、Polly IAM 権限）
- [x] `amplify/agent/runtime/config.py`（Claude Haiku 4.5 設定）
- [x] `amplify/agent/runtime/tools/`（time_tool, calculator）
- [x] `amplify/agent/runtime/agent.py`（`@app.entrypoint` + SSE ストリーミング）
- [x] `amplify/agent/runtime/requirements.txt`
- [x] `amplify/agent/runtime/Dockerfile`
- [x] `src/main.tsx`（Amplify 初期化）
- [x] `src/App.tsx`（Authenticator + Chat UI）
- [x] `src/hooks/useAgentCore.ts`（SSE ストリーミング接続）
- [x] `src/components/Chat/index.tsx`（メインチャットコンポーネント）
- [x] `src/components/Chat/MessageList.tsx`（メッセージ吹き出し表示）
- [x] `src/components/Chat/TextInput.tsx`（テキスト入力フィールド）
- [x] TypeScript ビルド確認
- [x] `src/hooks/usePollyTTS.ts`（Polly Neural Takumi 音声合成）
- [x] LLM 応答テキストの Polly 読み上げ統合（Chat/index.tsx）
- [x] Polly 音声を Kazuha（女性）に変更 + SSML で 130% 速度

## Step 6: 統合テスト + デプロイ

- [ ] `npx ampx sandbox` でデプロイ確認
- [ ] E2E 動作確認（テキスト入力 → LLM応答表示 → Polly音声再生）
- [ ] ツール使用の動作確認
- [ ] エラーハンドリング確認

## 将来タスク

- [ ] 本番デプロイ（Amplify Console）
- [ ] Nova Sonic 版を別リポジトリに分離・整備
- [ ] モデル切り替え UI（Haiku ↔ Sonnet）
- [ ] 文単位パイプライン化で体感レイテンシ短縮
- [ ] フロントエンドテスト（vitest）
- [ ] バックエンドテスト（pytest）
