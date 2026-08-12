import type { Page } from '@playwright/test';

export async function resetApp(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

export async function registerAndOpenCompany(page: Page) {
  await page.getByLabel('E-mail').fill('gestao.visual@example.test');
  await page.getByLabel('Senha').fill('senha-visual-segura');
  await page.getByRole('button', { name: 'Criar e continuar' }).click();
  await page.getByRole('button', { name: /Painel empresa/ }).click();
  await page.getByRole('heading', { name: 'Panorama de bem-estar' }).waitFor();
}
