import { test, expect } from '@playwright/test';

// Global setup injects auth session via storageState — no login needed here

test('Create a database server and generate an API key', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds timeout for complex reasoning workflows
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  // --- Step 1: Go to dashboard (session is pre-loaded via storageState) ---
  await page.goto('/dashboard/servers');
  // If redirected to login the session wasn't loaded — means Supabase key format changed
  await expect(page.locator('h1', { hasText: 'Reasoning Servers' })).toBeVisible({ timeout: 15000 });
  console.log('✅ Dashboard loaded');

  // --- Step 2: Create Server Wizard ---
  await page.goto('/dashboard/servers/create');
  await expect(page.locator('input[id="name"]')).toBeVisible({ timeout: 10000 });

  // Step 1: name
  await page.fill('input[id="name"]', 'Neon Production DB');
  const nextButton1 = page.locator('button:has-text("Next Step")');
  await expect(nextButton1).toBeEnabled();
  await nextButton1.click();

  // Step 2: dialect (default is PostgreSQL, just advance)
  await expect(page.locator('h3:has-text("Engine Profile"), div:has-text("Engine Profile")').first()).toBeVisible({ timeout: 10000 });
  const nextButton2 = page.locator('button:has-text("Next Step")');
  await expect(nextButton2).toBeEnabled();
  await nextButton2.click();

  // Step 3: connection string
  await expect(page.locator('input[id="conn"]')).toBeVisible({ timeout: 10000 });
  const testDbUrl = process.env.TEST_DATABASE_URL ?? '';
  if (!testDbUrl) throw new Error('TEST_DATABASE_URL env var is not set. Add it to your .env.local file.');
  await page.fill('input[id="conn"]', testDbUrl);
  const connectButton = page.locator('button:has-text("Connect & Map")');
  await expect(connectButton).toBeEnabled();
  await connectButton.click();

  // Wait for redirect to server details page (ignoring the create page itself)
  await page.waitForURL(url => url.pathname.startsWith('/dashboard/servers/') && url.pathname !== '/dashboard/servers/create', { timeout: 30000 });
  await expect(page.locator('h1', { hasText: 'Neon Production DB' })).toBeVisible({ timeout: 15000 });
  console.log('✅ Server created');

  // --- Step 3: Policy Chat Box Verification ---
  await expect(page.locator('text=Logical Policy Chat & AI Verification Agent')).toBeVisible({ timeout: 10000 });
  const chatInput = page.locator('input[placeholder="Enter a logical statement to evaluate..."]');
  await expect(chatInput).toBeVisible({ timeout: 5000 });
  
  await chatInput.fill('Evaluate if Waiter is disjoint from Buyer and cannot execute buy_product.');
  await page.click('button:has-text("Evaluate Query")');

  // Wait for the AI reasoner reply status badge
  const assistantReply = page.locator('text="Status:"').first();
  await expect(assistantReply).toBeVisible({ timeout: 15000 });
  console.log('✅ Chat reasoning query evaluated successfully');

  // --- Step 4: Generate API Key ---
  await page.click('button:has-text("API & Docs")');
  await expect(page.locator('text=Server Endpoint')).toBeVisible({ timeout: 5000 });

  await page.click('button:has-text("Generate New Key")');

  const keyInput = page.locator('input[type="password"]').first();
  await expect(keyInput).toBeVisible({ timeout: 5000 });
  const keyValue = await keyInput.inputValue();
  expect(keyValue).toContain('sk-rfa-');

  console.log('✅ API Key generated:', keyValue.slice(0, 20) + '...');
});
