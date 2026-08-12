import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

await page.goto('http://localhost:5173/');
await page.waitForTimeout(2000);

// Testar login
const emailInput = page.locator('input[type="email"]');
const passwordInput = page.locator('input[type="password"]');
const submitButton = page.locator('button:has-text("Criar e continuar"), button:has-text("Entrar")');

await emailInput.fill('teste@pilha.com');
await passwordInput.fill('teste123');
await submitButton.click();

await page.waitForTimeout(3000);

// Verificar se há erros
const bodyText = await page.locator('body').innerText();
const hasError = bodyText.includes('undefined is not an object') || errors.length > 0;

console.log('=== STATUS ===');
console.log('Erros:', errors.length > 0 ? errors : 'Nenhum');
console.log('Texto da página (primeiras 500 chars):', bodyText.substring(0, 500));

await browser.close();
