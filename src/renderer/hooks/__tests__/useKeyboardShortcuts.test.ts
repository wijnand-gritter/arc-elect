import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

// Mock the store
const mockSetCurrentPage = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetHelpModalOpen = vi.fn();

vi.mock('@renderer/stores/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    setCurrentPage: mockSetCurrentPage,
    setSearchQuery: mockSetSearchQuery,
    setHelpModalOpen: mockSetHelpModalOpen,
  })),
}));

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document methods
    document.addEventListener = vi.fn();
    document.removeEventListener = vi.fn();
  });

  it('should register default shortcuts', () => {
    renderHook(() => useKeyboardShortcuts());
    
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should handle navigation shortcuts', () => {
    renderHook(() => useKeyboardShortcuts());
    
    // Get the event handler
    const eventHandler = (document.addEventListener as any).mock.calls[0][1];
    
    // Test Ctrl+1 (Explore)
    act(() => {
      eventHandler({
        key: '1',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' },
      });
    });
    
    expect(mockSetCurrentPage).toHaveBeenCalledWith('explore');
  });

  it('should handle search shortcuts', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const eventHandler = (document.addEventListener as any).mock.calls[0][1];
    
    // Test Ctrl+K (Command palette)
    act(() => {
      eventHandler({
        key: 'k',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' },
      });
    });
    
    expect(mockSetSearchQuery).toHaveBeenCalledWith('');
  });

  it('should handle help shortcut', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const eventHandler = (document.addEventListener as any).mock.calls[0][1];
    
    // Test Shift+? (Help)
    act(() => {
      eventHandler({
        key: '?',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: true,
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' },
      });
    });
    
    expect(mockSetHelpModalOpen).toHaveBeenCalledWith(true);
  });

  it('should not trigger shortcuts on input elements', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const eventHandler = (document.addEventListener as any).mock.calls[0][1];
    
    // Test that shortcuts don't trigger on input
    act(() => {
      eventHandler({
        key: '1',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'INPUT' },
      });
    });
    
    expect(mockSetCurrentPage).not.toHaveBeenCalled();
  });

  it('should handle custom shortcuts', () => {
    const customHandler = vi.fn();
    const customShortcuts = {
      'ctrl+t': {
        description: 'Test shortcut',
        handler: customHandler,
      },
    };

    renderHook(() => useKeyboardShortcuts(customShortcuts));
    
    const eventHandler = (document.addEventListener as any).mock.calls[0][1];
    
    act(() => {
      eventHandler({
        key: 't',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' },
      });
    });
    
    expect(customHandler).toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    
    unmount();
    
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should prevent default for handled shortcuts', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const eventHandler = (document.addEventListener as any).mock.calls[0][1];
    const preventDefault = vi.fn();
    
    act(() => {
      eventHandler({
        key: '1',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault,
        target: { tagName: 'DIV' },
      });
    });
    
    expect(preventDefault).toHaveBeenCalled();
  });
});
