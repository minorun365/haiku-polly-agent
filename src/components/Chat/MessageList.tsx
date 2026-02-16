import { useEffect, useRef } from 'react';
import type { Message } from '../../hooks/useAgentCore.ts';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-4">🎙️</p>
          <p>メッセージを入力して会話を始めましょう</p>
          <p className="text-sm mt-1">macOS の音声入力も使えます（fn キー2回）</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
        }`}
      >
        {message.toolUse && (
          <div className="text-xs text-indigo-400 mb-1 flex items-center gap-1">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full" />
            {message.toolUse} を使用中...
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {message.isStreaming && !message.content && (
            <span className="animate-pulse">...</span>
          )}
        </p>
      </div>
    </div>
  );
}
