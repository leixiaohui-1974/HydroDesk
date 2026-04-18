import { test, expect } from '@playwright/test';
test('check console', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/review');
  await page.waitForTimeout(2000);
  console.log("PAGE ERRORS:", errors);
  const body = await page.innerHTML('body');
  console.log("BODY HTML:", body.slice(0, 1000));
});
