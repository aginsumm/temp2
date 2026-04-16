import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceInput } from '../hooks/useVoiceInput';

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onstart: null as any,
  onresult: null as any,
  onerror: null as any,
  onend: null as any,
};

vi.mock('react', () => {
  const actual = vi.importActual('react');
  return {
    ...actual,
    useEffect: vi.fn((fn) => fn()),
  };
});

Object.defineProperty(window, 'SpeechRecognition', {
  value: vi.fn(() => mockSpeechRecognition),
  writable: true,
});

describe('useVoiceInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isSupported).toBe(true);
  });

  it('should start recording', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startRecording();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('should stop recording', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startRecording();
      result.current.stopRecording();
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  it('should handle transcription results', () => {
    const onTranscriptMock = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript: onTranscriptMock }));

    act(() => {
      result.current.startRecording();
    });

    // Simulate recognition result
    const mockEvent = {
      resultIndex: 0,
      results: [
        [
          {
            transcript: '测试文本',
            isFinal: true,
          },
        ],
      ],
    };

    act(() => {
      mockSpeechRecognition.onresult(mockEvent);
    });

    expect(onTranscriptMock).toHaveBeenCalledWith('测试文本');
  });

  it('should handle errors', () => {
    const onErrorMock = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onError: onErrorMock }));

    act(() => {
      result.current.startRecording();
    });

    // Simulate error
    const mockErrorEvent = {
      error: 'no-speech',
    };

    act(() => {
      mockSpeechRecognition.onerror(mockErrorEvent);
    });

    expect(result.current.error).toBe('未检测到语音，请重试');
    expect(onErrorMock).toHaveBeenCalledWith('未检测到语音，请重试');
  });

  it('should detect browser support', () => {
    // Temporarily remove SpeechRecognition
    const originalRecognition = window.SpeechRecognition;
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      writable: true,
    });

    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.error).toBe('您的浏览器不支持语音输入');

    // Restore
    Object.defineProperty(window, 'SpeechRecognition', {
      value: originalRecognition,
      writable: true,
    });
  });
});
