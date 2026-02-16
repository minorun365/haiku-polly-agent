import { useCallback, useRef } from 'react';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { fetchAuthSession } from 'aws-amplify/auth';

interface UsePollyTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
}

export function usePollyTTS(): UsePollyTTSReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // 再生中なら停止
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const { credentials } = await fetchAuthSession();
    if (!credentials) throw new Error('認証情報が取得できませんでした');

    const polly = new PollyClient({ region: 'us-east-1', credentials });
    const ssmlText = `<speak><prosody rate="130%">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody></speak>`;
    const command = new SynthesizeSpeechCommand({
      Engine: 'neural',
      OutputFormat: 'mp3',
      TextType: 'ssml',
      Text: ssmlText,
      VoiceId: 'Kazuha',
      LanguageCode: 'ja-JP',
    });

    const response = await polly.send(command);
    if (!response.AudioStream) throw new Error('音声データが取得できませんでした');

    // AudioStream → Blob → Audio 再生
    const blob = new Blob(
      [await response.AudioStream.transformToByteArray()],
      { type: 'audio/mpeg' }
    );
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audioRef.current = audio;
    isSpeakingRef.current = true;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
      isSpeakingRef.current = false;
    };

    await audio.play();
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      isSpeakingRef.current = false;
    }
  }, []);

  return { speak, stop, isSpeaking: isSpeakingRef.current };
}
