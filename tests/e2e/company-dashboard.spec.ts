import { expect, test } from '@playwright/test';
import { registerAndOpenCompany, resetApp } from './helpers/appFlow';

test.beforeEach(async ({ page }) => resetApp(page));

test('percorre panorama e cria convite organizacional', async ({ page }) => {
  await registerAndOpenCompany(page);
  await expect(page.getByText('Participação', { exact: true })).toBeVisible();
  await expect(page.getByText('Privacidade por padrão')).toBeVisible();

  await page.getByRole('button', { name: 'Pessoas e acessos' }).click();
  await page.getByLabel('Nome completo').fill('Pessoa Convidada');
  await page.getByLabel('E-mail').fill('pessoa.convidada@example.test');
  await page.getByRole('button', { name: 'Criar convite' }).click();

  await expect(page.getByText('PILHA-00001-000001')).toBeVisible();
  await expect(page.getByText('Pendente', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Revogar' }).click();
  await expect(page.getByText('Revogado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar novo link' }).click();
  await expect(page.getByText('Pendente', { exact: true })).toBeVisible();
  await expect(page.getByText(/Novo link gerado/)).toBeVisible();

  await page.getByLabel('Nome completo').fill('Pessoa Convidada Duplicada');
  await page.getByLabel('E-mail').fill('PESSOA.CONVIDADA@example.test');
  await page.getByRole('button', { name: 'Criar convite' }).click();
  await expect(page.getByText(/convite ativo para este e-mail/)).toBeVisible();
});
