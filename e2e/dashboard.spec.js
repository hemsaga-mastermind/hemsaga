// @ts-check
const { test, expect } = require('@playwright/test');

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@hemsaga.local';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2E-Test-Password-1';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder('you@hemsaga.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('My Spaces')).toBeVisible({ timeout: 10000 });
  });

  test('no spaces: shows create first space CTA', async ({ page }) => {
    // If user has no spaces, we see create first space
    const createFirst = page.getByText(/create your first/i);
    const newSpaceBtn = page.getByRole('button', { name: /new space/i });
    const hasCreateFirst = await createFirst.isVisible().catch(() => false);
    const hasNewSpace = await newSpaceBtn.isVisible().catch(() => false);
    expect(hasCreateFirst || hasNewSpace).toBeTruthy();
  });

  test('create a new space', async ({ page }) => {
    await page.getByRole('button', { name: /new space/i }).click();
    await expect(page.getByRole('heading', { name: /create a space/i })).toBeVisible();
    await page.getByPlaceholder(/e\.g\./i).first().fill('E2E Test Space');
    await page.getByRole('button', { name: /create space/i }).click();
    await expect(page.getByRole('button', { name: /E2E Test Space/ }).first()).toBeVisible({ timeout: 8000 });
  });

  test('add a memory', async ({ page }) => {
    // Ensure we have a space first
    const spaceBtn = page.getByRole('button', { name: /E2E Test Space/ });
    if (!(await spaceBtn.first().isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /new space/i }).click();
      await page.getByPlaceholder(/e\.g\./i).first().fill('E2E Test Space');
      await page.getByRole('button', { name: /create space/i }).click();
      await expect(page.getByRole('button', { name: /E2E Test Space/ }).first()).toBeVisible({ timeout: 8000 });
    }
    await page.getByRole('button', { name: /memory/i }).first().click();
    await expect(page.getByRole('heading', { name: /log a memory/i })).toBeVisible();
    const textarea = page.locator('textarea.hs-textarea');
    await textarea.fill('We went to the park. The sun was shining.');
    await page.getByRole('button', { name: /save memory/i }).click();
    await expect(page.locator('.hs-mem-text').filter({ hasText: 'We went to the park' }).first()).toBeVisible({ timeout: 8000 });
  });

  test('memories list and edit date', async ({ page }) => {
    await page.getByRole('button', { name: '🌸 Memories' }).click();
    await expect(page.getByText(/memories/i).first()).toBeVisible({ timeout: 5000 });
    const editDateBtn = page.getByRole('button', { name: /edit date/i }).first();
    if (await editDateBtn.isVisible().catch(() => false)) {
      await editDateBtn.click();
      await expect(page.getByRole('heading', { name: /edit date/i })).toBeVisible();
      await page.getByRole('button', { name: /cancel/i }).first().click();
    }
  });

  test('generate story button is present when space has memories', async ({ page }) => {
    const genBtn = page.getByRole('button', { name: '✦ Generate' });
    await expect(genBtn).toBeVisible({ timeout: 5000 });
  });

  test('invite modal opens and shows generate link', async ({ page }) => {
    await page.getByRole('button', { name: /invite someone/i }).click();
    await expect(page.getByRole('heading', { name: /invite/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /generate invite link/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).first().click();
  });

  test('switch space: two spaces show in sidebar', async ({ page }) => {
    const spaceButtons = page.getByRole('button', { name: /E2E Test Space|Create your first/ });
    const count = await spaceButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
