import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextInput } from './TextInput.tsx';

describe('TextInput', () => {
  it('テキスト入力フィールドを表示', () => {
    render(<TextInput onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText('メッセージを入力...（Shift+Enter で改行）')).toBeInTheDocument();
  });

  it('送信ボタンを表示', () => {
    render(<TextInput onSend={vi.fn()} />);
    expect(screen.getByText('送信')).toBeInTheDocument();
  });

  it('空のテキストでは送信ボタンが無効', () => {
    render(<TextInput onSend={vi.fn()} />);
    const button = screen.getByText('送信');
    expect(button).toBeDisabled();
  });

  it('テキスト入力後に送信ボタンが有効', () => {
    render(<TextInput onSend={vi.fn()} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...（Shift+Enter で改行）');
    fireEvent.change(textarea, { target: { value: 'テスト' } });
    expect(screen.getByText('送信')).not.toBeDisabled();
  });

  it('送信ボタンクリックでonSendが呼ばれる', () => {
    const onSend = vi.fn();
    render(<TextInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...（Shift+Enter で改行）');
    fireEvent.change(textarea, { target: { value: 'テスト' } });
    fireEvent.click(screen.getByText('送信'));
    expect(onSend).toHaveBeenCalledWith('テスト');
  });

  it('送信後にテキストがクリアされる', () => {
    render(<TextInput onSend={vi.fn()} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...（Shift+Enter で改行）') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'テスト' } });
    fireEvent.click(screen.getByText('送信'));
    expect(textarea.value).toBe('');
  });

  it('Enter キーで送信', () => {
    const onSend = vi.fn();
    render(<TextInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...（Shift+Enter で改行）');
    fireEvent.change(textarea, { target: { value: 'テスト' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('テスト');
  });

  it('Shift+Enter では送信されない', () => {
    const onSend = vi.fn();
    render(<TextInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...（Shift+Enter で改行）');
    fireEvent.change(textarea, { target: { value: 'テスト' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disabled 時はテキストエリアが無効', () => {
    render(<TextInput onSend={vi.fn()} disabled />);
    const textarea = screen.getByPlaceholderText('メッセージを入力...（Shift+Enter で改行）');
    expect(textarea).toBeDisabled();
  });
});
