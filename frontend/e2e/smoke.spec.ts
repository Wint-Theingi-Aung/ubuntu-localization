import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Ubuntu Localization — Smoke Test', () => {
  test('dashboard loads with all sections', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/Ubuntu/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Translation Progress')).toBeVisible();
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
  });

  test('navigate to Templates page', async ({ page }) => {
    await page.goto(`${BASE}/templates`);
    await expect(page.getByRole('heading', { name: 'Templates' })).toBeVisible();
    await expect(page.getByText('Ubuntu packages requiring')).toBeVisible();
  });

  test('navigate to Translation page and see upload zone', async ({ page }) => {
    await page.goto(`${BASE}/translate`);
    await expect(page.getByRole('heading', { name: 'Translation' })).toBeVisible();
    await expect(page.getByText('Target Language')).toBeVisible();
    await expect(page.getByText('Try Demo')).toBeVisible();
  });

  test('navigate to Glossary page', async ({ page }) => {
    await page.goto(`${BASE}/glossary`);
    await expect(page.getByRole('heading', { name: 'Glossary' })).toBeVisible();
    await expect(page.getByText('terms')).toBeVisible();
  });

  test('navigate to Guide page and see default chapter', async ({ page }) => {
    await page.goto(`${BASE}/guide`);
    await expect(page.getByRole('heading', { name: 'Guide' })).toBeVisible();
    // Getting Started chapter is open by default with overview section expanded
    await expect(page.getByText('What is Ubuntu Localization?')).toBeVisible();
    await expect(page.getByText('Prerequisites')).toBeVisible();
  });

  test('navigate to Contributors page', async ({ page }) => {
    await page.goto(`${BASE}/contributors`);
    await expect(page.getByRole('heading', { name: 'Contributors' })).toBeVisible();
  });

  test('navigate to History page', async ({ page }) => {
    await page.goto(`${BASE}/history`);
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  });

  test('translate page demo flow works', async ({ page }) => {
    await page.goto(`${BASE}/translate`);
    // Click Try Demo
    await page.getByText('Try Demo').click();
    // Should see translate step with entries
    await expect(page.getByText('Power Off', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /To Translate/ })).toBeVisible();
  });

  test('no console errors across all pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const pages = ['/', '/templates', '/translate', '/glossary', '/guide', '/contributors', '/history'];
    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('networkidle');
    }
    expect(errors).toEqual([]);
  });
});
