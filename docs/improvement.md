# Voice Agent 改善プラン: テキストLLM + TTS アーキテクチャ

## 背景

Phase 2 で Nova Sonic の音声対話を E2E で動作確認したが、**日本語の品質が実用レベルに達していない**ことが判明。
Nova Sonic は日本語を公式サポートしておらず、認識精度・応答品質ともに改善の見込みが薄い。

**方針転換**: 音声入力→音声出力の全工程を Nova Sonic に任せるのではなく、各工程を最適なサービスに分離する。

---

## 新アーキテクチャ

```
[ブラウザ]                                    [AgentCore Runtime]         [Bedrock]

macOS音声入力 → テキストフィールド
                    |
                    +--HTTP POST(テキスト)--> Strands Agent --> Claude Haiku 4.5
                                                   |
                    <--SSE(テキストチャンク)--- ストリーミング応答
                    |
              テキスト → Amazon Polly(Takumi) → スピーカー
                        （ブラウザから直接呼出）
```

**ポイント**: 音声入力は macOS ネイティブ機能に任せ、AgentCore とのやり取りは**テキスト SSE**でシンプルに。TTS はブラウザから Polly を直接呼ぶ。

### 旧アーキテクチャとの比較

| 項目 | 旧（Nova Sonic） | 新（Claude + Polly） |
|------|------------------|---------------------|
| 音声認識（STT） | Nova Sonic（サーバー側） | macOS 音声入力（OS ネイティブ） |
| 思考・応答生成 | Nova Sonic（音声LLM） | Claude Haiku 4.5（テキストLLM） |
| 音声合成（TTS） | Nova Sonic（サーバー側） | Amazon Polly Neural Takumi（ブラウザ側） |
| 日本語品質 | 非公式・低品質 | 全工程で公式対応・高品質 |
| AgentCore との通信 | 音声バイナリ（WebSocket） | テキスト（HTTP POST + SSE） |
| ツール使用 | BidiAgent（実験的） | Strands Agent（安定版） |

---

## 各コンポーネントの選定

### 1. 音声入力: Web Speech API

| 候補 | 日本語 | コスト | 実装難度 | ブラウザ |
|------|--------|--------|---------|---------|
| **Web Speech API** | ✅ 良好 | 無料 | ⭐ 簡単 | Chrome/Safari |
| Amazon Transcribe Streaming | ✅ 高精度 | 従量課金 | ⭐⭐⭐ | 全ブラウザ |
| OS 音声入力 | ✅ | 無料 | - | OS依存 |

**選定: Web Speech API**
- `react-speech-recognition` ライブラリで即座に実装可能
- Chrome と Safari で動作（主要ブラウザをカバー）
- 無料で追加コストなし
- `interimResults` でリアルタイムフィードバック、`isFinal` で確定テキストを取得

**制約事項:**
- Firefox 非対応（必要なら Amazon Transcribe Streaming に切り替え）
- Chrome は約60秒でセッションタイムアウト（再開にはユーザー操作が必要）
- 音声データが Google/Apple のサーバーに送信される

### 2. LLM 応答: Claude Haiku 4.5（Bedrock）

| 候補 | TTFT | 品質 | コスト |
|------|------|------|--------|
| **Claude Haiku 4.5** | < 1秒 | 高い | 安い |
| Claude Sonnet 4.5 | 1-2秒 | 非常に高い | 中程度 |

**選定: Claude Haiku 4.5（デフォルト）、Sonnet 4.5 を選択肢として残す**
- 音声対話はレイテンシが最重要 → Haiku 4.5 の高速応答が適切
- Strands Agent の `stream_async` でストリーミング応答
- ツール使用（`@tool`）もそのまま利用可能

### 3. 音声出力: Amazon Polly Neural

| 候補 | 日本語 | レイテンシ | コスト | 実装難度 |
|------|--------|-----------|--------|---------|
| **Amazon Polly Neural** | ✅ 公式対応 | 低い | $16/100万文字 | ⭐⭐ |
| Nova Sonic 2（Speak-First） | ⚠️ 非公式 | < 700ms | 安い | ⭐⭐⭐ |
| ブラウザ SpeechSynthesis | ⚠️ 品質低い | 即時 | 無料 | ⭐ |

**選定: Amazon Polly Neural**
- 日本語音声: **Kazuha**（女性）/ **Takumi**（男性）/ **Tomoko**（女性）
- ブラウザから直接呼び出し可能（`@aws-sdk/client-polly` + Cognito Identity Pool）
- SSML 対応（速度・ピッチ調整可能）
- PCM 16kHz 出力可能 → 既存の AudioWorklet 再生機構を流用できる
- 無料枠: 月100万文字（最初の12ヶ月）

---

## レイテンシ最適化: パイプライン化

最大の工夫は **LLM ストリーミング応答を文単位で TTS に流す**こと。

### 逐次処理（遅い）

```
ユーザー発話終了 → STT確定(0.5s) → LLM全文生成(2s) → TTS全文(1s) → 再生開始
                                                                    合計: 3.5秒
```

### パイプライン化（速い）

```
ユーザー発話終了 → STT確定(0.5s) → LLM最初の文(0.3s) → TTS最初の文(0.5s) → 再生開始
                                  → LLM次の文...     → TTS次の文...       → 続けて再生
                                                                    体感: 1.3秒
```

**実装方法:**
1. LLM のストリーミング応答を受信しながら、句読点（。！？）で文を区切る
2. 1文が確定したら即座に Polly に送信
3. Polly の音声を受信したら順番にキューに積んで再生
4. LLM がまだ生成中でも、最初の文から再生が始まる

---

## 実装計画

### Step 1: プロジェクト初期化

nova-sonic/ から参考にしつつ、ルートに新しいプロジェクトを作成。

**新規作成:**
- `package.json` — 依存パッケージ（React, Vite, Amplify, `@aws-sdk/client-polly`）
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`
- `index.html`
- `.gitignore`

**流用元:** `nova-sonic/` の同名ファイルをベースにカスタマイズ

### Step 2: CDK / インフラ（Amplify + AgentCore）

**新規作成:**
- `amplify/auth/resource.ts` — Cognito 認証（nova-sonic と同一）
- `amplify/agent/resource.ts` — AgentCore Runtime 定義（JWT 認証に戻せる、SSE なので）
- `amplify/backend.ts` — auth + agent 統合、Polly 権限追加

```typescript
// Cognito 認証済みロールに Polly 権限を追加
authenticatedRole.addToPrincipalPolicy(new iam.PolicyStatement({
  actions: ['polly:SynthesizeSpeech'],
  resources: ['*'],
}));
```

**バックエンドのモデル権限:**
```typescript
// Claude Haiku 4.5 用
runtime.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
  resources: [
    'arn:aws:bedrock:*::foundation-model/*',
    'arn:aws:bedrock:*:*:inference-profile/*',
  ],
}));
```

### Step 3: バックエンド（Strands Agent + SSE）

**新規作成:**
- `amplify/agent/runtime/agent.py` — `@app.entrypoint` で SSE ストリーミング
- `amplify/agent/runtime/config.py` — Claude Haiku 4.5 設定
- `amplify/agent/runtime/tools/` — time_tool, calculator（nova-sonic から流用）
- `amplify/agent/runtime/requirements.txt` — `strands-agents`, `bedrock-agentcore`
- `amplify/agent/runtime/Dockerfile` — Python 3.13 slim（PyAudio 不要でシンプルに）

```python
# agent.py の核心部分
from bedrock_agentcore import BedrockAgentCoreApp
from strands import Agent

app = BedrockAgentCoreApp()

@app.entrypoint
async def invoke(payload, context):
    agent = get_or_create_agent(payload.get("session_id"))
    prompt = payload.get("prompt", "")

    async for event in agent.stream_async(prompt):
        if "data" in event:
            yield {"type": "text", "data": event["data"]}
        elif "current_tool_use" in event:
            tool_name = event["current_tool_use"].get("name", "unknown")
            yield {"type": "tool_use", "data": tool_name}
```

### Step 4: フロントエンド — テキスト入力 + SSE 表示

**新規作成:**
- `src/main.tsx` — Amplify 初期化
- `src/App.tsx` — Authenticator + Chat UI
- `src/hooks/useAgentCore.ts` — SSE ストリーミング接続（marp-agent パターン流用）
- `src/components/Chat/index.tsx` — メインチャットコンポーネント
- `src/components/Chat/MessageList.tsx` — メッセージ吹き出し表示
- `src/components/Chat/TextInput.tsx` — テキスト入力フィールド（Enter で送信）

### Step 5: フロントエンド — Amazon Polly TTS 統合

**新規作成:**
- `src/hooks/usePollyTTS.ts` — Polly 音声合成フック

```typescript
// usePollyTTS.ts の概要
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { fetchAuthSession } from 'aws-amplify/auth';

export function usePollyTTS() {
  const speak = async (text: string) => {
    const { credentials } = await fetchAuthSession();
    const polly = new PollyClient({ region: 'us-east-1', credentials });
    const command = new SynthesizeSpeechCommand({
      Engine: 'neural',
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: 'Takumi',  // 日本語 Neural 男性
    });
    const response = await polly.send(command);
    // AudioStream → Blob → Audio 再生
  };
  return { speak };
}
```

**パイプライン化（段階的導入）:**
1. まず全文一括で Polly に渡して再生（シンプル版）
2. 動作確認後、文単位で分割して順次 Polly に渡すパイプライン化

### Step 6: SSE 通信プロトコル

**ブラウザ → バックエンド（HTTP POST）:**
```json
POST /runtimes/{encodedARN}/invocations?qualifier=DEFAULT
Authorization: Bearer <accessToken>
Content-Type: application/json

{"prompt": "こんにちは、今何時ですか？", "session_id": "xxx"}
```

**バックエンド → ブラウザ（SSE）:**
```
data: {"type": "text", "data": "こんにちは！"}
data: {"type": "text", "data": "現在の時刻は"}
data: {"type": "tool_use", "data": "get_current_time"}
data: {"type": "text", "data": "15時30分です。"}
data: [DONE]
```

### Step 7: テスト

- バックエンド: pytest（Agent + SSE ストリーミングのテスト）
- フロントエンド: vitest（SSE 接続、Polly TTS、Chat UI のテスト）
- E2E: テキスト入力→LLM応答表示→Polly音声再生のフロー確認

---

## Nova Sonic 版から不要になるもの

| 項目 | 理由 |
|------|------|
| `strands-agents[bidi]` | BidiAgent 不要 → `strands-agents` のみ |
| AudioWorklet（pcm-capture/playback） | 音声バイナリの直接処理不要 |
| `useAudioInput` / `useAudioOutput` | PCM 変換不要 |
| `portaudio19-dev` / `build-essential` | PyAudio ビルド不要 |
| SigV4 presigned URL | SSE は HTTP ベースなので JWT Bearer トークンが使える |
| `@smithy/signature-v4` 等 | SigV4 署名不要 |

---

## 新しく必要な依存

**フロントエンド（npm）:**
| パッケージ | 用途 |
|-----------|------|
| `@aws-sdk/client-polly` | Amazon Polly クライアント（ブラウザから直接呼出） |
| `aws-amplify` / `@aws-amplify/ui-react` | 認証 UI + Cognito セッション管理 |
| `react`, `react-dom`, `tailwindcss` | UI フレームワーク |

**バックエンド（pip）:**
| パッケージ | 用途 |
|-----------|------|
| `strands-agents` | Strands Agent（テキストLLM） |
| `bedrock-agentcore` | AgentCore Runtime SDK |
| `strands-agents[otel]` + `aws-opentelemetry-distro` | Observability（任意） |

---

## 確定事項（みのるん回答済み）

| 項目 | 決定 | 理由 |
|------|------|------|
| 音声入力 | **macOS 音声入力 + テキストフィールド** | シンプル、全OS対応 |
| Polly 音声 | **Kazuha（女性・Neural・130%速度）** | 女性音声で聞きやすい、テキパキ応答 |
| LLM | **Claude Haiku 4.5（デフォルト）** | 高速 TTFT、音声対話向き |
| Nova Sonic コード | **完全削除（`nova-sonic/` に退避済み）** | 別リポジトリとして保存 |
| 通信方式 | **SSE（`@app.entrypoint`）** | テキストのみの片方向ストリーミングに最適 |

---

## 想定スケジュール

| Step | 内容 | 見積 |
|------|------|------|
| 1 | プロジェクト初期化（package.json, configs） | 小 |
| 2 | CDK / インフラ（auth + AgentCore + Polly IAM） | 小 |
| 3 | バックエンド（Agent + SSE ストリーミング） | 中 |
| 4 | フロントエンド — テキスト入力 + SSE 表示 | 中 |
| 5 | Polly TTS 統合 | 中 |
| 6 | SSE プロトコル + 統合テスト | 中 |
| 7 | テスト | 中 |

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Polly の文単位パイプラインの複雑さ | 中 | まず全文一括 TTS で動作確認後、パイプライン化を段階的に導入 |
| Polly 音声の自然さ | 低 | Neural エンジン（Takumi）+ SSML で調整可能 |
| SSE 接続の JWT 認証 | 低 | marp-agent の実績ある認証パターンを流用 |
| Polly のブラウザ直接呼出しの CORS | 低 | AWS SDK v3 は CORS 対応済み |
