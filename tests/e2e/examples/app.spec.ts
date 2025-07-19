import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Check if we're on the home page
    await expect(page.getByRole('heading', { name: /home/i })).toBeVisible();

    // Navigate to settings
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Navigate back to home
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page.getByRole('heading', { name: /home/i })).toBeVisible();
  });
});

test.describe('Theme Functionality', () => {
  test('should switch themes', async ({ page }) => {
    await page.goto('/settings');

    // Find the theme selector
    const themeSelect = page.getByRole('combobox', { name: /theme/i });
    await expect(themeSelect).toBeVisible();

    // Check current theme
    const currentTheme = await themeSelect.inputValue();
    expect(['light', 'dark', 'system']).toContain(currentTheme);

    // Switch to dark theme
    await themeSelect.selectOption('dark');
    await expect(themeSelect).toHaveValue('dark');

    // Switch to light theme
    await themeSelect.selectOption('light');
    await expect(themeSelect).toHaveValue('light');
  });
});

test.describe('Settings Page', () => {
  test('should have all settings controls', async ({ page }) => {
    await page.goto('/settings');

    // Check for theme selector
    await expect(page.getByRole('combobox', { name: /theme/i })).toBeVisible();

    // Check for action buttons
    await expect(page.getByRole('button', { name: /clear/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /import/i })).toBeVisible();
  });
});
