import { expect, test } from '@playwright/test';

test('onboarding → dashboard → pre-test → mistake log → flashcard → reference → export', async ({ page }) => {
  await page.goto('./');

  // First visit lands on onboarding; the disclaimer must be accepted.
  await expect(page.getByRole('heading', { name: 'Welcome to ShieldUp' })).toBeVisible();
  await page.getByLabel('Profile name').fill('Smoke');
  await page.getByRole('button', { name: 'Build my plan' }).click();
  await expect(page.getByRole('alert')).toContainText('disclaimer');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Build my plan' }).click();

  await expect(page.getByRole('heading', { name: 'Hi Smoke' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Plan status' })).toBeVisible();

  // Module 3 pre-test: always pick A and claim to be sure, so at least one miss lands in the log.
  await page.goto('./#/modules/3');
  await expect(page.getByRole('heading', { name: /M3 · Scanning Networks/ })).toBeVisible();
  await page.getByRole('link', { name: /Pre-test/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: /^Sure/ }).click();
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByText('Report an error')).toBeVisible();
    await page.getByRole('button', { name: /Next question|See results/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();

  await page.getByRole('link', { name: 'Open mistake log' }).click();
  await expect(page.getByRole('heading', { name: 'Mistake log' })).toBeVisible();
  await expect(page.getByText('confidently wrong').first()).toBeVisible();

  // Opening the module unlocked its cards.
  await page.goto('./#/cards');
  await page.getByRole('button', { name: /Show answer/ }).click();
  await page.getByRole('button', { name: /^Good/ }).click();
  await expect(page.getByText(/1 done/)).toBeVisible();

  // Reference: a sheet renders, search spans sheets, the glossary tab filters terms.
  await page.goto('./#/reference');
  await expect(page.getByRole('heading', { name: 'Ports and protocols' })).toBeVisible();
  await page.getByLabel('Search the reference').fill('GDPR');
  await expect(page.getByRole('status')).toContainText('matching section');
  await page.getByRole('tab', { name: /Glossary/ }).click();
  await page.getByLabel('Search the reference').fill('zone transfer');
  await expect(page.getByText('Zone transfer (AXFR)')).toBeVisible();

  // Backup works and produces a valid progress file.
  await page.goto('./#/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this profile' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^shieldup-smoke-\d{4}-\d{2}-\d{2}\.json$/);
});
