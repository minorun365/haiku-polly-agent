import { useState, useCallback, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUse?: string;
  isStreaming?: boolean;
}

interface UseAgentCoreReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (prompt: string) => Promise<void>;
  clearMessages: () => void;
}

const agentRuntimeArn = (outputs as Record<string, unknown> & { custom?: { agentRuntimeArn?: string } }).custom?.agentRuntimeArn ?? '';
const region = agentRuntimeArn.split(':')[3] || 'us-east-1';
const baseUrl = `https://bedrock-agentcore.${region}.amazonaws.com`;

export function useAgentCore(): UseAgentCoreReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef(crypto.randomUUID());

  const sendMessage = useCallback(async (prompt: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      if (!accessToken) throw new Error('認証トークンが取得できませんでした');

      const encodedArn = encodeURIComponent(agentRuntimeArn);
      const url = `${baseUrl}/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          session_id: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`AgentCore エラー: ${response.status} ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as { type: string; data?: string; content?: string };
            const textValue = event.content || event.data;

            if (event.type === 'text' && textValue) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + textValue }
                    : m
                )
              );
            } else if (event.type === 'tool_use' && textValue) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, toolUse: textValue }
                    : m
                )
              );
            }
          } catch {
            // JSON パース失敗は無視
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: errorMessage, isStreaming: false }
            : m
        )
      );
    } finally {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, isStreaming: false, toolUse: undefined }
            : m
        )
      );
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
