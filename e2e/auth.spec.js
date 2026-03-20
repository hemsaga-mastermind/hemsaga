// @ts-check
const { test, expect } = require('@playwright/test');

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@hemsaga.local';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2E-Test-Password-1';

test.describe('Auth', () => {
  test('auth page loads and shows sign in', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder('you@hemsaga.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login with test user redirects to dashboard', async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder('you@hemsaga.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('My Spaces')).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated dashboard redirects to auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});
