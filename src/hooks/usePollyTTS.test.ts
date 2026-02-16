import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// PollyClient モック（class 形式で定義）
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-polly', () => {
  return {
    PollyClient: class MockPollyClient {
      send = mockSend;
    },
    SynthesizeSpeechCommand: class MockCommand {
      params: Record<string, unknown>;
      constructor(params: Record<string, unknown>) {
        this.params = params;
        Object.assign(this, params);
      }
    },
  };
});

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(() =>
    Promise.resolve({
      credentials: {
        accessKeyId: 'mock-key',
        secretAccessKey: 'mock-secret',
        sessionToken: 'mock-token',
      },
    })
  ),
}));

// Audio モック
const mockPlay = vi.fn(() => Promise.resolve());
const mockPause = vi.fn();
vi.stubGlobal('Audio', class MockAudio {
  src = '';
  onended: (() => void) | null = null;
  play = mockPlay;
  pause = mockPause;
});

import { usePollyTTS } from './usePollyTTS.ts';

describe('usePollyTTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({
      AudioStream: {
        transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])),
      },
    });
  });

  it('speak で Polly に正しいパラメータを送信', async () => {
    const { result } = renderHook(() => usePollyTTS());

    await act(async () => {
      await result.current.speak('テスト音声');
    });

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0][0];
    expect(command).toMatchObject({
      Engine: 'neural',
      OutputFormat: 'mp3',
      Text: 'テスト音声',
      VoiceId: 'Takumi',
      LanguageCode: 'ja-JP',
    });
  });

  it('speak で Audio.play() が呼ばれる', async () => {
    const { result } = renderHook(() => usePollyTTS());

    await act(async () => {
      await result.current.speak('テスト');
    });

    expect(mockPlay).toHaveBeenCalledOnce();
  });

  it('空テキストでは Polly を呼ばない', async () => {
    const { result } = renderHook(() => usePollyTTS());

    await act(async () => {
      await result.current.speak('');
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('空白のみのテキストでは Polly を呼ばない', async () => {
    const { result } = renderHook(() => usePollyTTS());

    await act(async () => {
      await result.current.speak('   ');
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('stop で再生を停止', async () => {
    const { result } = renderHook(() => usePollyTTS());

    await act(async () => {
      await result.current.speak('テスト');
    });

    act(() => {
      result.current.stop();
    });

    expect(mockPause).toHaveBeenCalled();
  });
});
