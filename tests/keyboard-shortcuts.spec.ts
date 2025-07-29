import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    // Start the Electron app
    await page.goto('/'); // This will be handled by Electron
    
    // Wait for app to be ready
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });
  });

  test.describe('Navigation Shortcuts', () => {
    test('should navigate to Explore with Ctrl+1', async ({ page }) => {
      // Start from any page
      await page.keyboard.press('Control+2'); // Go to Analytics first
      await expect(page.locator('[data-testid="analytics-page"]')).toBeVisible();
      
      // Navigate to Explore
      await page.keyboard.press('Control+1');
      await expect(page.locator('[data-testid="explore-page"]')).toBeVisible();
      
      // Check URL or active state
      const exploreTab = page.locator('[data-testid="nav-explore"]');
      await expect(exploreTab).toHaveAttribute('aria-current', 'page');
    });

    test('should navigate to Analytics with Ctrl+2', async ({ page }) => {
      // Start from Explore
      await page.keyboard.press('Control+1');
      await expect(page.locator('[data-testid="explore-page"]')).toBeVisible();
      
      // Navigate to Analytics
      await page.keyboard.press('Control+2');
      await expect(page.locator('[data-testid="analytics-page"]')).toBeVisible();
      
      const analyticsTab = page.locator('[data-testid="nav-analytics"]');
      await expect(analyticsTab).toHaveAttribute('aria-current', 'page');
    });

    test('should navigate to Build with Ctrl+3', async ({ page }) => {
      // Navigate to Build
      await page.keyboard.press('Control+3');
      await expect(page.locator('[data-testid="build-page"]')).toBeVisible();
      
      const buildTab = page.locator('[data-testid="nav-build"]');
      await expect(buildTab).toHaveAttribute('aria-current', 'page');
    });

    test('should work with Cmd key on Mac', async ({ page }) => {
      // Check if running on Mac
      const userAgent = await page.evaluate(() => navigator.userAgent);
      const isMac = userAgent.includes('Mac');
      
      if (isMac) {
        await page.keyboard.press('Meta+1');
        await expect(page.locator('[data-testid="explore-page"]')).toBeVisible();
      }
    });
  });

  test.describe('Search Shortcuts', () => {
    test('should open search with Ctrl+F', async ({ page }) => {
      await page.keyboard.press('Control+f');
      
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeFocused();
    });

    test('should open command palette with Ctrl+K', async ({ page }) => {
      await page.keyboard.press('Control+k');
      
      const commandPalette = page.locator('[data-testid="command-palette"]');
      await expect(commandPalette).toBeVisible();
    });

    test('should not trigger search shortcuts when input is focused', async ({ page }) => {
      // Focus an input field
      await page.click('[data-testid="project-name-input"]');
      
      // Try to trigger search shortcut
      await page.keyboard.press('Control+f');
      
      // Search should not open
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).not.toBeVisible();
    });
  });

  test.describe('Project Shortcuts', () => {
    test('should create new project with Ctrl+N', async ({ page }) => {
      await page.keyboard.press('Control+n');
      
      const createModal = page.locator('[data-testid="create-project-modal"]');
      await expect(createModal).toBeVisible();
      
      // Modal should have focus
      const nameInput = page.locator('[data-testid="project-name-input"]');
      await expect(nameInput).toBeFocused();
    });

    test('should open project with Ctrl+O', async ({ page }) => {
      await page.keyboard.press('Control+o');
      
      // Should open file dialog (we can't test the actual dialog, but can test the trigger)
      // We can check if the appropriate IPC call was made
    });

    test('should save project with Ctrl+S', async ({ page }) => {
      // First create a project
      await page.keyboard.press('Control+n');
      await page.fill('[data-testid="project-name-input"]', 'Test Project');
      await page.click('[data-testid="create-project-button"]');
      
      // Wait for project to be created
      await page.waitForSelector('[data-testid="project-overview"]');
      
      // Save project
      await page.keyboard.press('Control+s');
      
      // Should show save confirmation or indicator
      const saveIndicator = page.locator('[data-testid="save-indicator"]');
      await expect(saveIndicator).toBeVisible();
    });
  });

  test.describe('Editor Shortcuts', () => {
    test('should format document with Shift+Alt+F', async ({ page }) => {
      // Navigate to Build page
      await page.keyboard.press('Control+3');
      
      // Open a schema file
      await page.click('[data-testid="schema-tree-item"]');
      
      // Wait for Monaco editor
      await page.waitForSelector('[data-testid="monaco-editor"]');
      
      // Focus the editor
      await page.click('[data-testid="monaco-editor"] .monaco-editor');
      
      // Format document
      await page.keyboard.press('Shift+Alt+f');
      
      // Check if format was applied (content should be formatted)
      // This is harder to test directly, but we can check if the action was triggered
    });

    test('should validate JSON with Ctrl+Shift+V', async ({ page }) => {
      // Navigate to Build page
      await page.keyboard.press('Control+3');
      
      // Open a schema file
      await page.click('[data-testid="schema-tree-item"]');
      
      // Wait for Monaco editor
      await page.waitForSelector('[data-testid="monaco-editor"]');
      
      // Focus the editor
      await page.click('[data-testid="monaco-editor"] .monaco-editor');
      
      // Validate JSON
      await page.keyboard.press('Control+Shift+v');
      
      // Should show validation results
      const validationPanel = page.locator('[data-testid="validation-panel"]');
      await expect(validationPanel).toBeVisible();
    });
  });

  test.describe('Help Shortcuts', () => {
    test('should show help with Shift+?', async ({ page }) => {
      await page.keyboard.press('Shift+?');
      
      const helpModal = page.locator('[data-testid="keyboard-shortcuts-modal"]');
      await expect(helpModal).toBeVisible();
      
      // Modal should have proper title
      const modalTitle = page.locator('[data-testid="modal-title"]');
      await expect(modalTitle).toHaveText('Keyboard Shortcuts');
    });

    test('should close help modal with Escape', async ({ page }) => {
      // Open help modal first
      await page.keyboard.press('Shift+?');
      const helpModal = page.locator('[data-testid="keyboard-shortcuts-modal"]');
      await expect(helpModal).toBeVisible();
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(helpModal).not.toBeVisible();
    });
  });

  test.describe('Shortcut Combinations', () => {
    test('should handle rapid shortcut sequences', async ({ page }) => {
      // Navigate between pages rapidly
      await page.keyboard.press('Control+1');
      await page.keyboard.press('Control+2');
      await page.keyboard.press('Control+3');
      
      // Should end up on Build page
      await expect(page.locator('[data-testid="build-page"]')).toBeVisible();
    });

    test('should handle shortcuts during modal interactions', async ({ page }) => {
      // Open help modal
      await page.keyboard.press('Shift+?');
      const helpModal = page.locator('[data-testid="keyboard-shortcuts-modal"]');
      await expect(helpModal).toBeVisible();
      
      // Try navigation shortcuts while modal is open
      await page.keyboard.press('Control+1');
      
      // Modal should still be open, navigation should not work
      await expect(helpModal).toBeVisible();
      
      // Close modal first
      await page.keyboard.press('Escape');
      
      // Then navigation should work
      await page.keyboard.press('Control+1');
      await expect(page.locator('[data-testid="explore-page"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Integration', () => {
    test('should announce page changes to screen readers', async ({ page }) => {
      // Navigate to different pages
      await page.keyboard.press('Control+1');
      
      // Check for aria-live announcements
      const announcement = page.locator('[aria-live="polite"]');
      await expect(announcement).toContainText('Navigated to Explore');
      
      await page.keyboard.press('Control+2');
      await expect(announcement).toContainText('Navigated to Analytics');
    });

    test('should maintain focus order after shortcuts', async ({ page }) => {
      // Use navigation shortcut
      await page.keyboard.press('Control+1');
      
      // Tab navigation should work properly
      await page.keyboard.press('Tab');
      
      // First focusable element should be focused
      const firstFocusable = page.locator('[data-testid="first-focusable-element"]');
      await expect(firstFocusable).toBeFocused();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle shortcuts when no project is loaded', async ({ page }) => {
      // Clear any existing project
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      
      // Try shortcuts that require a project
      await page.keyboard.press('Control+s');
      
      // Should show appropriate message or modal
      const noProjectMessage = page.locator('[data-testid="no-project-message"]');
      await expect(noProjectMessage).toBeVisible();
    });

    test('should gracefully handle disabled shortcuts', async ({ page }) => {
      // Navigate to a context where some shortcuts might be disabled
      await page.keyboard.press('Control+3'); // Build page
      
      // Try editor shortcuts without an active editor
      await page.keyboard.press('Shift+Alt+f');
      
      // Should not cause errors or unexpected behavior
      // The page should remain stable
      await expect(page.locator('[data-testid="build-page"]')).toBeVisible();
    });
  });
});
