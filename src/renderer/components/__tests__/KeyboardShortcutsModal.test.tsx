import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal';

// Mock the store
const mockSetHelpModalOpen = vi.fn();

vi.mock('@renderer/stores/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    isHelpModalOpen: true,
    setHelpModalOpen: mockSetHelpModalOpen,
  })),
}));

describe('KeyboardShortcutsModal', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all shortcut categories', () => {
    render(<KeyboardShortcutsModal />);
    
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('should display navigation shortcuts correctly', () => {
    render(<KeyboardShortcutsModal />);
    
    expect(screen.getByText('Ctrl+1')).toBeInTheDocument();
    expect(screen.getByText('Go to Explore')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+2')).toBeInTheDocument();
    expect(screen.getByText('Go to Analytics')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+3')).toBeInTheDocument();
    expect(screen.getByText('Go to Build')).toBeInTheDocument();
  });

  it('should display search shortcuts correctly', () => {
    render(<KeyboardShortcutsModal />);
    
    expect(screen.getByText('Ctrl+F')).toBeInTheDocument();
    expect(screen.getByText('Open Search')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    expect(screen.getByText('Command Palette')).toBeInTheDocument();
  });

  it('should display project shortcuts correctly', () => {
    render(<KeyboardShortcutsModal />);
    
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
    expect(screen.getByText('Open Project')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    expect(screen.getByText('Save Project')).toBeInTheDocument();
  });

  it('should display editor shortcuts correctly', () => {
    render(<KeyboardShortcutsModal />);
    
    expect(screen.getByText('Shift+Alt+F')).toBeInTheDocument();
    expect(screen.getByText('Format Document')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Shift+V')).toBeInTheDocument();
    expect(screen.getByText('Validate JSON')).toBeInTheDocument();
  });

  it('should display help shortcuts correctly', () => {
    render(<KeyboardShortcutsModal />);
    
    expect(screen.getByText('Shift+?')).toBeInTheDocument();
    expect(screen.getByText('Show Help')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    render(<KeyboardShortcutsModal />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockSetHelpModalOpen).toHaveBeenCalledWith(false);
  });

  it('should close modal when escape key is pressed', async () => {
    render(<KeyboardShortcutsModal />);
    
    await user.keyboard('{Escape}');
    
    expect(mockSetHelpModalOpen).toHaveBeenCalledWith(false);
  });

  it('should close modal when clicking outside', async () => {
    render(<KeyboardShortcutsModal />);
    
    // Click on backdrop
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockSetHelpModalOpen).toHaveBeenCalledWith(false);
    }
  });

  it('should have proper accessibility attributes', () => {
    render(<KeyboardShortcutsModal />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    
    const title = screen.getByRole('heading', { name: /keyboard shortcuts/i });
    expect(title).toBeInTheDocument();
  });

  it('should focus trap within modal', async () => {
    render(<KeyboardShortcutsModal />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    
    // Modal should trap focus
    expect(closeButton).toHaveFocus();
    
    // Tab navigation should stay within modal
    await user.keyboard('{Tab}');
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    
    expect(closeButton).toHaveFocus();
  });

  it('should display keyboard shortcuts with proper formatting', () => {
    render(<KeyboardShortcutsModal />);
    
    // Check that keyboard shortcuts have proper styling
    const shortcutElements = screen.getAllByText(/Ctrl\+/);
    expect(shortcutElements.length).toBeGreaterThan(0);
    
    // Each shortcut should be properly formatted
    shortcutElements.forEach(element => {
      expect(element).toHaveClass('font-mono', 'text-sm', 'bg-muted', 'px-2', 'py-1', 'rounded');
    });
  });

  it('should organize shortcuts into sections', () => {
    render(<KeyboardShortcutsModal />);
    
    // Each section should have a header and shortcuts
    const sections = [
      'Navigation',
      'Search', 
      'Project',
      'Editor',
      'Help'
    ];
    
    sections.forEach(sectionName => {
      const header = screen.getByText(sectionName);
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('H3');
    });
  });

  it('should handle platform-specific shortcuts', () => {
    // Mock Mac platform
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      writable: true,
    });
    
    render(<KeyboardShortcutsModal />);
    
    // On Mac, should show Cmd instead of Ctrl where appropriate
    if (navigator.platform.toLowerCase().includes('mac')) {
      expect(screen.getAllByText(/Cmd\+/).length).toBeGreaterThan(0);
    }
  });

  it('should provide visual hierarchy with proper spacing', () => {
    render(<KeyboardShortcutsModal />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-2xl'); // Proper width
    
    // Check for proper spacing classes
    const content = modal.querySelector('[data-testid="modal-content"]');
    expect(content).toHaveClass('space-y-6'); // Proper spacing between sections
  });

  it('should be scrollable for long content', () => {
    render(<KeyboardShortcutsModal />);
    
    const scrollArea = screen.getByTestId('shortcuts-scroll-area');
    expect(scrollArea).toBeInTheDocument();
    expect(scrollArea).toHaveClass('max-h-[60vh]'); // Limited height for scrolling
  });

  it('should announce modal opening to screen readers', () => {
    render(<KeyboardShortcutsModal />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
