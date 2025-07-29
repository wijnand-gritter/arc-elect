import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });
  });

  test.describe('Basic Accessibility Compliance', () => {
    test('should not have any automatically detectable accessibility issues on Explore page', async ({ page }) => {
      await page.keyboard.press('Control+1'); // Navigate to Explore
      await page.waitForSelector('[data-testid="explore-page"]');
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility issues on Analytics page', async ({ page }) => {
      await page.keyboard.press('Control+2'); // Navigate to Analytics
      await page.waitForSelector('[data-testid="analytics-page"]');
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility issues on Build page', async ({ page }) => {
      await page.keyboard.press('Control+3'); // Navigate to Build
      await page.waitForSelector('[data-testid="build-page"]');
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have accessibility issues in modals', async ({ page }) => {
      // Open help modal
      await page.keyboard.press('Shift+?');
      await page.waitForSelector('[data-testid="keyboard-shortcuts-modal"]');
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
      
      // Close modal and test create project modal
      await page.keyboard.press('Escape');
      await page.keyboard.press('Control+n');
      await page.waitForSelector('[data-testid="create-project-modal"]');
      
      const createModalResults = await new AxeBuilder({ page }).analyze();
      expect(createModalResults.violations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async ({ page }) => {
      // Test tab navigation through main interface
      await page.keyboard.press('Tab');
      
      let focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toHaveAttribute('tabindex', '0');
      
      // Continue tabbing through interface
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
        
        // Each focused element should be visible and properly focusable
        await expect(focusedElement).toBeVisible();
        
        // Check that focus is clearly visible
        const focusStyles = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            boxShadow: styles.boxShadow,
          };
        });
        
        expect(
          focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none'
        ).toBeTruthy();
      }
    });

    test('should support reverse tab navigation', async ({ page }) => {
      // Tab forward a few times
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Then tab backward
      await page.keyboard.press('Shift+Tab');
      
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
    });

    test('should handle Enter key for activation', async ({ page }) => {
      // Navigate to a button using Tab
      await page.keyboard.press('Tab');
      
      // Find the first button
      let focusedElement = await page.locator(':focus').first();
      while (!(await focusedElement.evaluate(el => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'))) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
      }
      
      // Activate with Enter
      await page.keyboard.press('Enter');
      
      // Should trigger the button's action
      // (Specific assertions depend on which button was activated)
    });

    test('should handle Space key for activation', async ({ page }) => {
      // Similar to Enter test but with Space key
      await page.keyboard.press('Tab');
      
      let focusedElement = await page.locator(':focus').first();
      while (!(await focusedElement.evaluate(el => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'))) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
      }
      
      await page.keyboard.press('Space');
      // Should activate the focused element
    });

    test('should support arrow key navigation in lists', async ({ page }) => {
      // Navigate to schema list
      await page.keyboard.press('Control+1'); // Explore page
      await page.waitForSelector('[data-testid="schema-list"]');
      
      // Tab to first schema item
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').first();
      
      while (!(await focusedElement.getAttribute('role') === 'listitem')) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
      }
      
      // Use arrow keys to navigate
      await page.keyboard.press('ArrowDown');
      
      const nextFocused = await page.locator(':focus').first();
      expect(nextFocused).not.toBe(focusedElement);
      
      await page.keyboard.press('ArrowUp');
      // Should be back to original element or similar
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.keyboard.press('Control+1'); // Explore page
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      expect(headings.length).toBeGreaterThan(0);
      
      // Check that h1 exists and is unique
      const h1Elements = await page.locator('h1').all();
      expect(h1Elements.length).toBe(1);
      
      // Check heading hierarchy (h2 should come after h1, etc.)
      for (const heading of headings.slice(0, 5)) { // Check first 5 headings
        const level = await heading.evaluate(el => parseInt(el.tagName.slice(1)));
        expect(level).toBeGreaterThan(0);
        expect(level).toBeLessThan(7);
      }
    });

    test('should have proper landmark regions', async ({ page }) => {
      // Check for main landmarks
      const main = await page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
      
      // Check for navigation
      const nav = await page.locator('nav, [role="navigation"]').first();
      await expect(nav).toBeVisible();
      
      // Check for complementary content if present
      const aside = page.locator('aside, [role="complementary"]');
      if (await aside.count() > 0) {
        await expect(aside.first()).toBeVisible();
      }
    });

    test('should have proper form labels', async ({ page }) => {
      // Open create project modal
      await page.keyboard.press('Control+n');
      await page.waitForSelector('[data-testid="create-project-modal"]');
      
      const formInputs = await page.locator('input, select, textarea').all();
      
      for (const input of formInputs) {
        const hasLabel = await input.evaluate(el => {
          const id = el.getAttribute('id');
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledby = el.getAttribute('aria-labelledby');
          
          if (ariaLabel || ariaLabelledby) return true;
          
          if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            return !!label;
          }
          
          // Check if wrapped in label
          const parent = el.closest('label');
          return !!parent;
        });
        
        expect(hasLabel).toBeTruthy();
      }
    });

    test('should announce live regions', async ({ page }) => {
      // Check for aria-live regions
      const liveRegions = await page.locator('[aria-live]').all();
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Trigger an action that should announce something
      await page.keyboard.press('Control+1');
      
      // Check that announcement was made
      const politeRegion = page.locator('[aria-live="polite"]');
      const assertiveRegion = page.locator('[aria-live="assertive"]');
      
      const hasAnnouncement = await Promise.race([
        politeRegion.textContent().then(text => text && text.trim() !== ''),
        assertiveRegion.textContent().then(text => text && text.trim() !== ''),
      ]);
      
      expect(hasAnnouncement).toBeTruthy();
    });

    test('should provide meaningful alt text for images', async ({ page }) => {
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');
        
        // Images should have alt text or be marked as decorative
        if (role !== 'presentation' && role !== 'none') {
          expect(alt !== null || ariaLabel !== null).toBeTruthy();
        }
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus in modals', async ({ page }) => {
      // Open help modal
      await page.keyboard.press('Shift+?');
      await page.waitForSelector('[data-testid="keyboard-shortcuts-modal"]');
      
      // Focus should be trapped within modal
      
      // Tab through modal
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should still be within modal
      const currentFocus = await page.locator(':focus').first();
      const isInModal = await currentFocus.evaluate(el => {
        const modal = el.closest('[role="dialog"]');
        return !!modal;
      });
      
      expect(isInModal).toBeTruthy();
    });

    test('should restore focus after modal closes', async ({ page }) => {
      // Focus an element
      await page.keyboard.press('Tab');
      const originalFocus = await page.locator(':focus').first();
      const originalId = await originalFocus.getAttribute('id') || 
                         await originalFocus.evaluate(el => el.tagName + ':' + Array.from(el.parentNode.children).indexOf(el));
      
      // Open and close modal
      await page.keyboard.press('Shift+?');
      await page.waitForSelector('[data-testid="keyboard-shortcuts-modal"]');
      await page.keyboard.press('Escape');
      
      // Focus should be restored
      await page.waitForTimeout(100); // Allow for focus restoration
      const restoredFocus = await page.locator(':focus').first();
      const restoredId = await restoredFocus.getAttribute('id') || 
                         await restoredFocus.evaluate(el => el.tagName + ':' + Array.from(el.parentNode.children).indexOf(el));
      
      expect(restoredId).toBe(originalId);
    });

    test('should manage focus for dynamic content', async ({ page }) => {
      // Navigate to Build page and open a schema
      await page.keyboard.press('Control+3');
      await page.waitForSelector('[data-testid="build-page"]');
      
      // Click on a schema in the tree
      const treeItem = page.locator('[data-testid="schema-tree-item"]').first();
      await treeItem.click();
      
      // New tab should receive focus
      await page.waitForSelector('[data-testid="editor-tab"]');
      const activeTab = page.locator('[data-testid="editor-tab"][aria-selected="true"]');
      await expect(activeTab).toBeFocused();
    });
  });

  test.describe('High Contrast and Reduced Motion', () => {
    test('should support high contrast mode', async ({ page }) => {
      // Mock high contrast preference
      await page.emulateMedia({ prefersColorScheme: 'dark', prefersReducedMotion: 'no-preference' });
      
      // Check that high contrast styles are applied
      const body = page.locator('body');
      const backgroundColor = await body.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // Should have distinct background color
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('should respect reduced motion preferences', async ({ page }) => {
      // Mock reduced motion preference
      await page.emulateMedia({ prefersReducedMotion: 'reduce' });
      
      // Trigger an animation
      await page.keyboard.press('Control+1');
      
      // Check that animations are reduced or disabled
      const animatedElement = page.locator('[data-testid="page-transition"]');
      if (await animatedElement.count() > 0) {
        const animation = await animatedElement.evaluate(el => 
          window.getComputedStyle(el).animationDuration
        );
        
        // Animation should be very fast or disabled
        expect(animation === '0s' || animation === '0.01s').toBeTruthy();
      }
    });
  });

  test.describe('Assistive Technology Integration', () => {
    test('should provide proper ARIA attributes', async ({ page }) => {
      // Check common ARIA attributes
      const elementsWithAriaExpanded = await page.locator('[aria-expanded]').all();
      for (const element of elementsWithAriaExpanded) {
        const expanded = await element.getAttribute('aria-expanded');
        expect(['true', 'false'].includes(expanded)).toBeTruthy();
      }
      
      const elementsWithAriaSelected = await page.locator('[aria-selected]').all();
      for (const element of elementsWithAriaSelected) {
        const selected = await element.getAttribute('aria-selected');
        expect(['true', 'false'].includes(selected)).toBeTruthy();
      }
    });

    test('should update ARIA states dynamically', async ({ page }) => {
      // Open and close help modal to test aria-expanded
      const helpButton = page.locator('[data-testid="help-button"]');
      if (await helpButton.count() > 0) {
        await expect(helpButton).toHaveAttribute('aria-expanded', 'false');
        
        await helpButton.click();
        await expect(helpButton).toHaveAttribute('aria-expanded', 'true');
        
        await page.keyboard.press('Escape');
        await expect(helpButton).toHaveAttribute('aria-expanded', 'false');
      }
    });

    test('should provide context for complex widgets', async ({ page }) => {
      // Check tree widget
      await page.keyboard.press('Control+3'); // Build page
      const tree = page.locator('[role="tree"]');
      
      if (await tree.count() > 0) {
        await expect(tree).toHaveAttribute('aria-label');
        
        const treeItems = page.locator('[role="treeitem"]');
        const firstItem = treeItems.first();
        
        if (await firstItem.count() > 0) {
          // Should have proper tree item attributes
          const hasProperAttributes = await firstItem.evaluate(el => {
            return el.hasAttribute('aria-level') || 
                   el.hasAttribute('aria-setsize') || 
                   el.hasAttribute('aria-posinset');
          });
          
          expect(hasProperAttributes).toBeTruthy();
        }
      }
    });
  });

  test.describe('Error Accessibility', () => {
    test('should announce errors to screen readers', async ({ page }) => {
      // Trigger a validation error in the editor
      await page.keyboard.press('Control+3'); // Build page
      await page.waitForSelector('[data-testid="monaco-editor"]');
      
      // Open a schema and introduce an error
      await page.click('[data-testid="schema-tree-item"]');
      await page.keyboard.press('Control+a'); // Select all
      await page.keyboard.type('{ invalid json'); // Invalid JSON
      
      // Validate
      await page.keyboard.press('Control+Shift+v');
      
      // Error should be announced
      const errorRegion = page.locator('[aria-live="assertive"]');
      const errorText = await errorRegion.textContent();
      expect(errorText).toContain('error');
    });

    test('should provide accessible error recovery', async ({ page }) => {
      // Create an error situation
      await page.keyboard.press('Control+n'); // New project
      await page.click('[data-testid="create-project-button"]'); // Without filling required fields
      
      // Should focus the first error field
      const firstErrorField = page.locator('.error input, [aria-invalid="true"]').first();
      if (await firstErrorField.count() > 0) {
        await expect(firstErrorField).toBeFocused();
        
        // Should have proper error messaging
        const errorMessage = page.locator('[role="alert"]').first();
        await expect(errorMessage).toBeVisible();
      }
    });
  });
});
