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
  // The only progress figure: how many strings still have no translation.
  await expect(page.getByText('10 strings remaining')).toBeVisible();
  await expect(page.getByText(/strings remaining/)).toHaveCount(1);
  await expect(page.getByText(/Batch \d+ of \d+/)).toHaveCount(0);
  await expect(page.getByText(/confirmed$/)).toHaveCount(0);
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
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toBeVisible();

    await page.getByRole('button', { name: 'Review Translations' }).click();
    await expect(page.getByText('D0 Power Off')).toBeVisible();
    await expect(page.getByText('D9 System Settings')).toBeVisible();
    // No status summary panel: the batch reads as "nothing left to translate".
    await expect(page.getByText('awaiting review')).toHaveCount(0);
    await expect(page.getByText('confirmed in batch')).toHaveCount(0);
    await expect(page.getByText('0 strings remaining')).toBeVisible();
    // Every string still waiting for a human check keeps the yellow indicator.
    await expect(page.locator('.badge-yellow', { hasText: 'Needs Review' })).toHaveCount(10);
  });

  test('a partially translated batch opens review with only translated strings', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    await page.getByRole('button', { name: 'Review Translations' }).click();

    // Reset the long string at index 4 — it returns to pending and empties.
    await resetString(page, 'D4 Install Updates');

    // Only the 9 remaining translated strings stay in review.
    await expect(page.getByText('D3 Log Out...')).toBeVisible();
    await expect(page.getByText('D5 Remove Package')).toBeVisible();
    await expect(page.getByText('D4 Install Updates')).toHaveCount(0);
    // The skipped string is not hidden: it comes back as the remaining count,
    // which is the only summary the page keeps.
    await expect(page.getByText('1 string remaining')).toBeVisible();
    await expect(page.getByText('not translated — skipped for now')).toHaveCount(0);
    await expect(page.getByText('Confirm Valid (0)')).toHaveCount(0);
  });

  test('confirming a partial batch keeps saved translations and leaves the skipped string pending', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    await page.getByRole('button', { name: 'Review Translations' }).click();

    await resetString(page, 'D4 Install Updates');

    // Confirm the 9 valid entries. Batch is not fully confirmed, so no auto-advance.
    await page.getByRole('button', { name: /Confirm Valid \(9\)/ }).click();
    await expect(page.locator('.badge-green', { hasText: 'Confirmed' })).toHaveCount(9);

    // Back in translate phase: saved translations survive, only 1 string left.
    await page.getByRole('button', { name: 'Back to Edit' }).click();
    await expect(page.getByRole('button', { name: 'Translate', exact: true })).toBeEnabled();

    // Re-translate the skipped string and review the whole batch again.
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toBeVisible();
    await page.getByRole('button', { name: 'Review Translations' }).click();
    await expect(page.getByText('D4 Install Updates').first()).toBeVisible();
    await expect(page.getByText('D0 Power Off').first()).toBeVisible();
  });

  test('review stays closed when the only "translation" was reset back to empty', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
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

/** A PO file whose first 7 strings are already translated by a human. */
const PO_MIXED = `msgid ""
msgstr ""
"Project-Id-Version: test\\n"
"Language: my\\n"

msgid "Power Off"
msgstr "ပါဝါပိတ်ရန်"

msgid "Suspend"
msgstr "ဆွဲခေါက်ရန်"

msgid "Restart..."
msgstr "ပြန်လည်စတင်ရန်"

msgid "Log Out..."
msgstr "ထွက်ရန်"

msgid "Install Updates"
msgstr "အသစ်များတင်ရန်"

msgid "Remove Package"
msgstr "ဖယ်ရှားရန်"

msgid "Open Terminal"
msgstr "တာမင်နယ်ဖွင့်ရန်"

msgid "Close Window"
msgstr ""

msgid "Search Files"
msgstr ""

msgid "System Settings"
msgstr ""
`;

test.describe('translation progress and review actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockTranslateApi(page);
  });

  test('Review Translations stays disabled while a translation is running', async ({ page }) => {
    await uploadPo(page);
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    await page.getByRole('button', { name: 'Review Translations' }).click();

    // One string of the batch goes back to pending.
    await resetString(page, 'D4 Install Updates');
    await page.getByRole('button', { name: 'Back to Edit' }).click();
    await expect(page.getByText('1 string remaining')).toBeVisible();

    // Hold the next response open so the in-flight state is observable.
    await page.route('**/api/translate', async route => {
      const body = route.request().postDataJSON();
      const entries: Array<{ index: number; msgid: string }> = body.entries;
      await new Promise(resolve => setTimeout(resolve, 700));
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

    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    // In flight: the busy label is showing and Review cannot be entered yet.
    await expect(page.getByText('Translating...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review Translations' })).toBeDisabled();

    // Once the results are in the fields, Review opens again.
    await expect(page.getByRole('button', { name: 'Review Translations' })).toBeEnabled();
    // Nothing is left to translate, so Translate idles until a string resets.
    await expect(page.getByRole('button', { name: 'Translate', exact: true })).toBeDisabled();
    await expect(page.getByText('0 strings remaining')).toBeVisible();
  });

  test('a batch with nothing to confirm offers no confirm action at all', async ({ page }) => {
    await page.goto('/translate');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'messages.po',
      mimeType: 'text/x-gettext-translation',
      buffer: Buffer.from(PO_MIXED),
    });
    await page.getByRole('button', { name: 'Upload & Parse' }).click();
    await expect(page.getByText('3 strings remaining')).toBeVisible();

    // The already-translated strings can be reviewed straight away.
    await page.getByRole('button', { name: 'Review Translations' }).click();

    await expect(page.getByText('Power Off')).toBeVisible();
    await expect(page.getByText('awaiting review')).toHaveCount(0);
    await expect(page.getByText('confirmed in batch')).toHaveCount(0);
    // Nothing is awaiting confirmation, so no zero-count action is rendered.
    await expect(page.getByRole('button', { name: /Confirm Valid/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Confirm All/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Back to Edit' }).click();
    await expect(page.getByRole('button', { name: 'Translate', exact: true })).toBeEnabled();
  });

  test('a partial API response fills every field it did return', async ({ page }) => {
    await page.route('**/api/translate', async route => {
      const body = route.request().postDataJSON();
      const entries: Array<{ index: number; msgid: string }> = body.entries;
      // The model answers for 8 of the 10 strings.
      const answered = entries.filter(e => e.index !== 8 && e.index !== 9);
      await route.fulfill({
        json: {
          translations: answered.map(e => ({
            index: e.index,
            msgid: e.msgid,
            translated: `D${e.index} ${e.msgid}`,
            qa_passed: true,
            qa_checks: [],
          })),
          summary: { total: answered.length, passed: answered.length, failed: 0 },
        },
      });
    });

    await uploadPo(page);
    await page.getByRole('button', { name: 'Translate', exact: true }).click();

    // The eight answers land in their own field, in source order.
    const fields = page.locator('textarea:not([readonly])');
    await expect(fields).toHaveCount(8);
    await expect(fields.nth(0)).toHaveValue('D0 Power Off');
    await expect(fields.nth(7)).toHaveValue('D7 Close Window');
    // The two the model skipped stay untranslated instead of being dropped.
    await expect(page.getByText('Click Translate to generate')).toHaveCount(2);
    await expect(page.getByText('2 of 10 strings were not translated')).toBeVisible();
    await expect(page.getByText('2 strings remaining')).toBeVisible();

    // Nothing is marked translated that did not arrive.
    await expect(page.getByText('D8 Search Files')).toHaveCount(0);
    await expect(page.getByText('D9 System Settings')).toHaveCount(0);
  });
});

/** A PO file whose strings are all untranslated: n strings, n/10 batches. */
const poOf = (n: number) =>
  ['msgid ""', 'msgstr ""', '"Project-Id-Version: test\\n"', '"Language: my\\n"', '']
    .concat(Array.from({ length: n }, (_, i) => `msgid "String ${i}"\nmsgstr ""\n`))
    .join('\n');

test.describe('batch-to-batch progress', () => {
  test.beforeEach(async ({ page }) => {
    await mockTranslateApi(page);
  });

  test('the remaining count carries across batches until the file is done', async ({ page }) => {
    await page.goto('/translate');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'messages.po',
      mimeType: 'text/x-gettext-translation',
      buffer: Buffer.from(poOf(12)),
    });
    await page.getByRole('button', { name: 'Upload & Parse' }).click();
    await expect(page.getByText('12 strings remaining')).toBeVisible();

    // First batch: 10 of the 12 strings.
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    await expect(page.getByText('2 strings remaining')).toBeVisible();
    await page.getByRole('button', { name: 'Review Translations' }).click();
    await page.getByRole('button', { name: /Confirm All & Next Batch \(10\)/ }).click();

    // The page moves on to the leftover strings instead of reporting totals.
    await expect(page.getByRole('button', { name: 'Review Translations' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Translate', exact: true }).click();
    await expect(page.getByText('0 strings remaining')).toBeVisible();
    await page.getByRole('button', { name: 'Review Translations' }).click();
    await page.getByRole('button', { name: /Confirm All & Next Batch \(2\)/ }).click();

    await expect(page.getByText('Translation Complete!')).toBeVisible();
    await expect(page.getByText('12 strings confirmed and ready to export')).toBeVisible();
  });
});
