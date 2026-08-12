import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { registerAndOpenCompany, resetApp } from './helpers/appFlow';

async function expectNoAutomaticViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => resetApp(page));

test('oferece salto por teclado para o conteúdo principal', async ({ page }) => {
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Ir para o conteúdo principal' });
  await expect(skipLink).toBeFocused();
  await skipLink.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('não encontra violações automáticas na tela de acesso', async ({ page }) => {
  await expectNoAutomaticViolations(page);
});

test('navega por teclado e audita panorama e convites', async ({ page }) => {
  await registerAndOpenCompany(page);
  await expectNoAutomaticViolations(page);

  const peopleTab = page.getByRole('button', { name: 'Pessoas e acessos' });
  await peopleTab.focus();
  await expect(peopleTab).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Pessoas e acessos' })).toBeVisible();
  await expectNoAutomaticViolations(page);
});
