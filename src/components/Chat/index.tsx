import { useRef, useEffect } from 'react';
import { useAgentCore } from '../../hooks/useAgentCore.ts';
import { usePollyTTS } from '../../hooks/usePollyTTS.ts';
import { MessageList } from './MessageList.tsx';
import { TextInput } from './TextInput.tsx';

export function Chat() {
  const { messages, isLoading, sendMessage, clearMessages } = useAgentCore();
  const { speak, stop } = usePollyTTS();
  const lastAssistantRef = useRef<string>('');

  // アシスタントの応答完了時に Polly で読み上げ
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === 'assistant' &&
      !lastMessage.isStreaming &&
      lastMessage.content &&
      lastMessage.content !== lastAssistantRef.current
    ) {
      lastAssistantRef.current = lastMessage.content;
      speak(lastMessage.content).catch(console.error);
    }
  }, [messages, speak]);

  const handleSend = async (prompt: string) => {
    stop();
    await sendMessage(prompt);
  };

  const handleClear = () => {
    stop();
    clearMessages();
    lastAssistantRef.current = '';
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <TextInput onSend={handleSend} disabled={isLoading} />
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors shrink-0"
            title="会話をクリア"
          >
            クリア
          </button>
        </div>
      </div>
    </div>
  );
}
