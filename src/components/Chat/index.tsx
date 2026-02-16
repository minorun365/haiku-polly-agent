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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto py-4">
        <div className="w-[60%] mx-auto">
          <MessageList messages={messages} />
        </div>
      </div>

      <div className="border-t bg-white py-4">
        <div className="w-[60%] mx-auto">
          <TextInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
