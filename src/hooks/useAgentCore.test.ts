import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentCore } from './useAgentCore.ts';

// モック
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(() =>
    Promise.resolve({
      tokens: {
        accessToken: { toString: () => 'mock-access-token' },
      },
    })
  ),
}));

vi.mock('../../amplify_outputs.json', () => ({
  default: {
    custom: {
      agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789:runtime/test_agent',
    },
  },
}));

// SSE レスポンスを生成するヘルパー
function createSSEResponse(events: Array<{ type: string; data: string }>) {
  const sseText = events
    .map(e => `data: ${JSON.stringify(e)}`)
    .join('\n') + '\ndata: [DONE]\n';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    },
  });

  return new Response(stream, { status: 200 });
}

describe('useAgentCore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('初期状態: メッセージ空、ローディングなし', () => {
    const { result } = renderHook(() => useAgentCore());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('sendMessage でユーザーメッセージとアシスタントメッセージが追加される', async () => {
    const mockResponse = createSSEResponse([
      { type: 'text', data: 'こんにちは！' },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgentCore());

    await act(async () => {
      await result.current.sendMessage('テスト');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('テスト');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('こんにちは！');
  });

  it('ストリーミングテキストが蓄積される', async () => {
    const mockResponse = createSSEResponse([
      { type: 'text', data: 'こん' },
      { type: 'text', data: 'にちは' },
      { type: 'text', data: '！' },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgentCore());

    await act(async () => {
      await result.current.sendMessage('テスト');
    });

    expect(result.current.messages[1].content).toBe('こんにちは！');
  });

  it('fetch が正しい URL とヘッダーで呼ばれる', async () => {
    const mockResponse = createSSEResponse([{ type: 'text', data: 'OK' }]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgentCore());

    await act(async () => {
      await result.current.sendMessage('テスト');
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('bedrock-agentcore.us-east-1.amazonaws.com');
    expect(url).toContain('invocations');
    expect((options as RequestInit).method).toBe('POST');
    expect((options as RequestInit).headers).toHaveProperty('Authorization', 'Bearer mock-access-token');
  });

  it('エラー時にエラーメッセージが表示される', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500, statusText: 'Internal Server Error' })
    );

    const { result } = renderHook(() => useAgentCore());

    await act(async () => {
      await result.current.sendMessage('テスト');
    });

    expect(result.current.messages[1].content).toContain('AgentCore エラー');
  });

  it('clearMessages でメッセージがクリアされる', async () => {
    const mockResponse = createSSEResponse([{ type: 'text', data: 'OK' }]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgentCore());

    await act(async () => {
      await result.current.sendMessage('テスト');
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });

  it('ストリーミング完了後に isStreaming が false になる', async () => {
    const mockResponse = createSSEResponse([{ type: 'text', data: '完了' }]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgentCore());

    await act(async () => {
      await result.current.sendMessage('テスト');
    });

    expect(result.current.messages[1].isStreaming).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
