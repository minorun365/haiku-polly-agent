# Haiku Polly Agent

テキスト入力 + Claude Haiku 4.5 + Amazon Polly で音声応答する AI エージェント。

## アーキテクチャ

```
ブラウザ (React)
  ├─ テキスト入力 → HTTP POST → AgentCore Runtime (Strands Agent + Claude Haiku 4.5)
  ├─ ← SSE ストリーミング応答
  └─ 応答テキスト → Amazon Polly (Kazuha) → スピーカー再生
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React, Tailwind CSS, Vite |
| 認証 | Amazon Cognito (Amplify Auth) |
| LLM | Claude Haiku 4.5 (Amazon Bedrock) |
| エージェント | Strands Agents + Bedrock AgentCore |
| 音声合成 | Amazon Polly Neural (Kazuha) |
| インフラ | AWS Amplify Gen2 + CDK |

## デプロイ手順

### 前提条件

- Node.js 18+
- AWS アカウント（Bedrock の Claude Haiku 4.5 が有効化済み）
- AWS Amplify CLI (`@aws-amplify/backend-cli`)

### 1. セットアップ

```bash
git clone https://github.com/minorun365/haiku-polly-agent.git
cd haiku-polly-agent
npm install
```

### 2. sandbox でローカル確認

```bash
npx ampx sandbox --profile <your-aws-profile>
npm run dev
```

### 3. 本番デプロイ

Amplify Console でリポジトリを接続してデプロイ。環境変数の設定は不要です。