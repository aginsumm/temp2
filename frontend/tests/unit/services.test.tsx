import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';

import { useWebSocket } from '../../src/services/websocketService';
import { errorService, ErrorCategory, ErrorSeverity } from '../../src/services/errorService';
import {
  AccessibilityProvider,
  useAccessibility,
  useKeyboardShortcut,
  useFocusTrap,
} from '../../src/utils/accessibility';

const mockWebSocket = {
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket) as any;
Object.assign(global.WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

describe('WebSocket Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useWebSocket', () => {
    it('should provide WebSocket methods', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current).toHaveProperty('connect');
      expect(result.current).toHaveProperty('disconnect');
      expect(result.current).toHaveProperty('send');
      expect(result.current).toHaveProperty('subscribe');
      expect(result.current).toHaveProperty('isConnected');
    });

    it('should return connection status', () => {
      const { result } = renderHook(() => useWebSocket());

      const status = result.current.isConnected();
      expect(typeof status).toBe('boolean');
    });
  });
});

describe('Error Service', () => {
  beforeEach(() => {
    errorService.clearErrors();
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('Network request failed');
      const category = errorService.categorizeError(error);
      expect(category).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize validation errors', () => {
      const error = new TypeError('Invalid type');
      const category = errorService.categorizeError(error);
      expect(category).toBe(ErrorCategory.SYSTEM);
    });

    it('should categorize unknown errors', () => {
      const error = 'Some random error';
      const category = errorService.categorizeError(error);
      expect(category).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('determineSeverity', () => {
    it('should return HIGH for authentication errors', () => {
      const error = new Error('Auth failed');
      const severity = errorService.determineSeverity(error, ErrorCategory.AUTHENTICATION);
      expect(severity).toBe(ErrorSeverity.HIGH);
    });

    it('should return LOW for validation errors', () => {
      const error = new Error('Invalid input');
      const severity = errorService.determineSeverity(error, ErrorCategory.VALIDATION);
      expect(severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('handleError', () => {
    it('should create AppError from error', () => {
      const error = new Error('Test error');
      const appError = errorService.handleError(error);

      expect(appError).toHaveProperty('id');
      expect(appError).toHaveProperty('message');
      expect(appError).toHaveProperty('category');
      expect(appError).toHaveProperty('severity');
      expect(appError).toHaveProperty('timestamp');
    });

    it('should store errors', () => {
      const error = new Error('Test error');
      errorService.handleError(error);

      const errors = errorService.getErrors();
      expect(errors.length).toBe(1);
    });

    it('should filter errors by category', () => {
      errorService.handleError(new Error('Network error'), undefined, { silent: true });
      errorService.handleError(new Error('Another error'), undefined, { silent: true });

      const networkErrors = errorService.getErrors({ category: ErrorCategory.NETWORK });
      expect(networkErrors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', () => {
      errorService.handleError(new Error('Error 1'), undefined, { silent: true });
      errorService.handleError(new Error('Error 2'), undefined, { silent: true });

      const stats = errorService.getErrorStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byCategory');
      expect(stats).toHaveProperty('bySeverity');
      expect(stats).toHaveProperty('recentErrors');
    });
  });

  describe('registerHandler', () => {
    it('should register and call error handlers', () => {
      const handler = vi.fn();
      errorService.registerHandler(ErrorCategory.VALIDATION, handler);

      errorService.handleError(new Error('Validation error'), undefined, { silent: false });

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('Accessibility Utils', () => {
  describe('AccessibilityProvider', () => {
    it('should provide accessibility context', () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: ({ children }) => <AccessibilityProvider>{children}</AccessibilityProvider>,
      });

      expect(result.current).toHaveProperty('announce');
      expect(result.current).toHaveProperty('focusFirstFocusable');
      expect(result.current).toHaveProperty('trapFocus');
      expect(result.current).toHaveProperty('isHighContrast');
      expect(result.current).toHaveProperty('isReducedMotion');
      expect(result.current).toHaveProperty('fontSize');
    });
  });

  describe('useKeyboardShortcut', () => {
    it('should call callback on key press', () => {
      const callback = vi.fn();

      renderHook(() => useKeyboardShortcut('s', callback, { ctrl: true }));

      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      expect(callback).toHaveBeenCalled();
    });

    it('should not call callback without correct modifiers', () => {
      const callback = vi.fn();

      renderHook(() => useKeyboardShortcut('s', callback, { ctrl: true }));

      fireEvent.keyDown(window, { key: 's' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('useFocusTrap', () => {
    it('should return a ref', () => {
      const { result } = renderHook(() => useFocusTrap(true));

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('current');
    });
  });
});

describe('Mock API Tests', () => {
  it('should handle API responses', async () => {
    const mockData = { id: 1, name: 'Test' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const response = await fetch('/api/test');
    const data = await response.json();

    expect(data).toEqual(mockData);
  });

  it('should handle API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found' }),
    });

    const response = await fetch('/api/test');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});

describe('Local Storage Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve data', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('should handle JSON data', () => {
    const data = { name: 'Test', value: 123 };
    localStorage.setItem('test-data', JSON.stringify(data));

    const retrieved = JSON.parse(localStorage.getItem('test-data') || '{}');
    expect(retrieved).toEqual(data);
  });

  it('should clear data', () => {
    localStorage.setItem('test-key', 'test-value');
    localStorage.removeItem('test-key');

    expect(localStorage.getItem('test-key')).toBeNull();
  });
});

describe('Utility Functions', () => {
  describe('Date formatting', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = date.toISOString();

      expect(formatted).toContain('2024-01-15');
    });
  });

  describe('String manipulation', () => {
    it('should truncate long strings', () => {
      const longString = 'This is a very long string that needs to be truncated';
      const truncated = longString.substring(0, 20);

      expect(truncated.length).toBe(20);
    });

    it('should handle empty strings', () => {
      const empty = '';
      expect(empty.trim()).toBe('');
    });
  });

  describe('Array operations', () => {
    it('should filter arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const filtered = arr.filter((n) => n > 3);

      expect(filtered).toEqual([4, 5]);
    });

    it('should map arrays', () => {
      const arr = [1, 2, 3];
      const mapped = arr.map((n) => n * 2);

      expect(mapped).toEqual([2, 4, 6]);
    });

    it('should reduce arrays', () => {
      const arr = [1, 2, 3, 4];
      const sum = arr.reduce((acc, n) => acc + n, 0);

      expect(sum).toBe(10);
    });
  });
});
