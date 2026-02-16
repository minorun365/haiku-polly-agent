import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList.tsx';
import type { Message } from '../../hooks/useAgentCore.ts';

describe('MessageList', () => {
  it('メッセージが空のときプレースホルダーを表示', () => {
    render(<MessageList messages={[]} />);
    expect(screen.getByText('メッセージを入力して会話を始めましょう')).toBeInTheDocument();
  });

  it('ユーザーメッセージを表示', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'こんにちは' },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText('こんにちは')).toBeInTheDocument();
  });

  it('アシスタントメッセージを表示', () => {
    const messages: Message[] = [
      { id: '1', role: 'assistant', content: 'はい、何かお手伝いしますか？' },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText('はい、何かお手伝いしますか？')).toBeInTheDocument();
  });

  it('ツール使用中の表示', () => {
    const messages: Message[] = [
      { id: '1', role: 'assistant', content: '', toolUse: 'get_current_time', isStreaming: true },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText('get_current_time を使用中...')).toBeInTheDocument();
  });

  it('ストリーミング中で内容が空のとき省略記号を表示', () => {
    const messages: Message[] = [
      { id: '1', role: 'assistant', content: '', isStreaming: true },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('複数メッセージの会話を表示', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: '今何時？' },
      { id: '2', role: 'assistant', content: '15時30分です。' },
      { id: '3', role: 'user', content: 'ありがとう' },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText('今何時？')).toBeInTheDocument();
    expect(screen.getByText('15時30分です。')).toBeInTheDocument();
    expect(screen.getByText('ありがとう')).toBeInTheDocument();
  });
});
