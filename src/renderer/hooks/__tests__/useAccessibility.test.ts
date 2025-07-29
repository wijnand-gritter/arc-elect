import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAccessibility } from '../useAccessibility';

describe('useAccessibility', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock DOM element
    mockElement = document.createElement('div');
    mockElement.setAttribute = vi.fn();
    mockElement.removeAttribute = vi.fn();
    mockElement.focus = vi.fn();
    mockElement.blur = vi.fn();
    
    // Mock document methods
    document.getElementById = vi.fn().mockReturnValue(mockElement);
    document.createElement = vi.fn().mockReturnValue(mockElement);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    
    // Mock querySelector methods
    document.querySelector = vi.fn().mockReturnValue(mockElement);
    document.querySelectorAll = vi.fn().mockReturnValue([mockElement]);
  });

  it('should announce messages to screen readers', () => {
    const { result } = renderHook(() => useAccessibility());
    
    act(() => {
      result.current.announceToScreenReader('Test message', 'polite');
    });
    
    // Should create and append announcement element
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
    expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
    expect(document.body.appendChild).toHaveBeenCalledWith(mockElement);
  });

  it('should manage focus trap', () => {
    const { result } = renderHook(() => useAccessibility());
    
    act(() => {
      result.current.trapFocus(mockElement);
    });
    
    // Should add event listener for keydown
    expect(mockElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    // Release focus trap
    act(() => {
      result.current.releaseFocusTrap();
    });
    
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should manage focus within container', () => {
    const { result } = renderHook(() => useAccessibility());
    
    act(() => {
      result.current.focusFirstElement(mockElement);
    });
    
    expect(document.querySelector).toHaveBeenCalledWith(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    expect(mockElement.focus).toHaveBeenCalled();
  });

  it('should add skip links', () => {
    const { result } = renderHook(() => useAccessibility());
    
    act(() => {
      result.current.addSkipLink('main-content', 'Skip to main content', 0);
    });
    
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockElement.setAttribute).toHaveBeenCalledWith('href', '#main-content');
    expect(document.body.appendChild).toHaveBeenCalledWith(mockElement);
  });

  it('should enhance elements with ARIA attributes', () => {
    const { result } = renderHook(() => useAccessibility());
    
    act(() => {
      result.current.enhanceWithAria(mockElement, {
        role: 'button',
        'aria-label': 'Test button',
        'aria-expanded': 'false',
      });
    });
    
    expect(mockElement.setAttribute).toHaveBeenCalledWith('role', 'button');
    expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-label', 'Test button');
    expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-expanded', 'false');
  });

  it('should implement roving tabindex', () => {
    const mockElements = [
      document.createElement('button'),
      document.createElement('button'),
      document.createElement('button'),
    ];
    
    mockElements.forEach(el => {
      el.setAttribute = vi.fn();
      el.addEventListener = vi.fn();
    });
    
    const container = document.createElement('div');
    container.querySelectorAll = vi.fn().mockReturnValue(mockElements);
    
    const { result } = renderHook(() => useAccessibility());
    
    act(() => {
      result.current.setupRovingTabindex(container, 'button');
    });
    
    // Should set tabindex on elements
    expect(mockElements[0].setAttribute).toHaveBeenCalledWith('tabindex', '0');
    expect(mockElements[1].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    expect(mockElements[2].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    
    // Should add event listeners
    mockElements.forEach(el => {
      expect(el.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(el.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    });
  });

  it('should detect accessibility preferences', () => {
    // Mock matchMedia for reduced motion
    const mockMatchMedia = vi.fn().mockImplementation(query => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    global.matchMedia = mockMatchMedia;
    
    const { result } = renderHook(() => useAccessibility());
    
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should handle focus management correctly', () => {
    const { result } = renderHook(() => useAccessibility());
    
    // Test focus management
    act(() => {
      result.current.saveFocus();
    });
    
    expect(document.activeElement).toBeDefined();
    
    act(() => {
      result.current.restoreFocus();
    });
    
    // Should attempt to restore focus to saved element
    expect(mockElement.focus).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useAccessibility());
    
    // Add some skip links first
    act(() => {
      result.current.addSkipLink('test', 'Test link', 0);
    });
    
    unmount();
    
    // Should cleanup skip links
    expect(document.body.removeChild).toHaveBeenCalledWith(mockElement);
  });
});
