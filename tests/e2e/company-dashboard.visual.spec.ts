import { expect, test } from '@playwright/test';
import { registerAndOpenCompany, resetApp } from './helpers/appFlow';

test.beforeEach(async ({ page }) => resetApp(page));

test('@visual registra panorama empresarial', async ({ page }) => {
  await registerAndOpenCompany(page);
  await expect(page).toHaveScreenshot('company-overview.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test('@visual registra criação de convite', async ({ page }) => {
  await registerAndOpenCompany(page);
  await page.getByRole('button', { name: 'Pessoas e acessos' }).click();
  await page.getByLabel('Nome completo').fill('Pessoa Convidada');
  await page.getByLabel('E-mail').fill('pessoa.convidada@example.test');
  await page.getByRole('button', { name: 'Criar convite' }).click();
  await expect(page.getByText('PILHA-00001-000001')).toBeVisible();
  await expect(page).toHaveScreenshot('company-invitation.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});
