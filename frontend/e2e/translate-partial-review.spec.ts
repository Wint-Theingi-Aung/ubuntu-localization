import { test, expect, type Page } from '@playwright/test';

/**
 * Partial-batch review on /translate.
 *
 * Review Translations becomes available with 1+ translated strings, lists only
 * translated strings, keeps skipped strings pending for later, and never
 * discards translations that are already saved.
 */

const PO_CONTENT = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: my\\n"

msgid "Power Off"
msgstr ""

msgid "Suspend"
msgstr ""

msgid "Restart..."
msgstr ""

msgid "Log Out..."
msgstr ""

msgid "Install Updates"
msgstr ""

msgid "Remove Package"
msgstr ""

msgid "Open Terminal"
msgstr ""

msgid "Close Window"
msgstr ""

msgid "Search Files"
msgstr ""

msgid "System Settings"
msgstr ""
`;

/** Mock Gemini so no GOOGLE_API_KEY is needed. Translates whatever is requested. */
async function mockTranslateApi(page: Page) {
  await page.route('**/api/translate', async route => {
    const body = route.request().postDataJSON();
    const entries: Array<{ index: number; msgid: string }> = body.entries;
    await route.fulfill({
      json: {
        translations: entries.map(e => ({
          index: e.index,
          msgid: e.msgid,
          translated: `D${e.index} ${e.msgid}`,
          qa_passed: true,
          qa_checks: [],
        })),
        summary: { total: entries.length, passed: entries.length, failed: 0 },
      },
    });
  });
}

async function uploadPo(page: Page) {
  await page.goto('/translate');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'messages.po',
    mimeType: 'text/x-gettext-translation',
    buffer: Buffer.from(PO_CONTENT),
  });
  await page.getByRole('button', { name: 'Upload & Parse' }).click();
  await expect(page.getByText('Batch 1 of 1')).toBeVisible();
}

/** Click a translated string in the current view and reset it back to pending. */
async function resetString(page: Page, label: string) {
  await page.getByText(label).first().click();
  await page.getByRole('button', { name: 'Reset' }).first().click();
}

test.describe('partial batch review', () => {
  test.beforeEach(async ({ page }) => {
    await mockTranslateApi(page);
  });

  test('Review Translations is unavailable while all 10 strings are empty', async ({ page }) => {
    await uploadPo(page);
    await expect(page.getByText('Power Off', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toHaveCount(0);
  });

  test('translating all 10 strings makes Review Translations available', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: /Translate Batch \(10 strings\)/ }).click();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toBeVisible();

    await page.getByRole('button', { name: 'Review Translations' }).click();
    await expect(page.getByText('D0 Power Off')).toBeVisible();
    await expect(page.getByText('D9 System Settings')).toBeVisible();
    await expect(page.getByText('awaiting review')).toBeVisible();
  });

  test('a partially translated batch opens review with only translated strings', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: /Translate Batch \(10 strings\)/ }).click();
    await page.getByRole('button', { name: 'Review Translations' }).click();

    // Reset the long string at index 4 — it returns to pending and empties.
    await resetString(page, 'D4 Install Updates');

    // Only the 9 remaining translated strings stay in review.
    await expect(page.getByText('D3 Log Out...')).toBeVisible();
    await expect(page.getByText('D5 Remove Package')).toBeVisible();
    await expect(page.getByText('D4 Install Updates')).toHaveCount(0);
    // The skipped string is reported, not silently dropped from the batch.
    await expect(page.getByText('1 not translated — skipped for now')).toBeVisible();
  });

  test('confirming a partial batch keeps saved translations and leaves the skipped string pending', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: /Translate Batch \(10 strings\)/ }).click();
    await page.getByRole('button', { name: 'Review Translations' }).click();

    await resetString(page, 'D4 Install Updates');

    // Confirm the 9 valid entries. Batch is not fully confirmed, so no auto-advance.
    await page.getByRole('button', { name: /Confirm Valid \(9\)/ }).click();
    await expect(page.locator('.badge-green', { hasText: 'Confirmed' })).toHaveCount(9);

    // Back in translate phase: saved translations survive, only 1 string left.
    await page.getByRole('button', { name: 'Back to Edit' }).click();
    await expect(page.getByRole('button', { name: /Translate Batch \(1 strings\)/ })).toBeEnabled();

    // Re-translate the skipped string and review the whole batch again.
    await page.getByRole('button', { name: /Translate Batch \(1 strings\)/ }).click();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toBeVisible();
    await page.getByRole('button', { name: 'Review Translations' }).click();
    await expect(page.getByText('D4 Install Updates').first()).toBeVisible();
    await expect(page.getByText('D0 Power Off').first()).toBeVisible();
  });

  test('review stays closed when the only "translation" was reset back to empty', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: /Translate Batch \(10 strings\)/ }).click();
    await page.getByRole('button', { name: 'Review Translations' }).click();

    for (const label of ['D0 Power Off', 'D1 Suspend']) {
      await resetString(page, label);
    }
    await page.getByRole('button', { name: 'Back to Edit' }).click();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toBeVisible();

    // Reset the rest from review until nothing is left translated.
    await page.getByRole('button', { name: 'Review Translations' }).click();
    for (let i = 2; i < 10; i++) {
      await resetString(page, `D${i} `);
    }
    await expect(page.getByText('No translated strings in this batch yet. Go back to Edit and translate at least one string.')).toBeVisible();
    await page.getByRole('button', { name: 'Back to Edit' }).click();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toHaveCount(0);
  });
});
