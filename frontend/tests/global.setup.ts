import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

const TEST_EMAIL = process.env.TEST_EMAIL || 'playwright@reasonsforall.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'PlaywrightTest123!';

async function globalSetup(config: FullConfig) {
  console.log('\n🔧 Global setup: authenticating test user via UI...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/login');
    
    // Fill the login form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Click Sign In and wait for redirect to dashboard
    await Promise.all([
      page.waitForURL('**/dashboard/servers', { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('✅ Successfully authenticated test user via UI:', TEST_EMAIL);

    // Save the browser storage state (cookies + localStorage)
    await context.storageState({ path: path.join(__dirname, '.auth-storage.json') });
    console.log('✅ Auth state saved for test reuse\n');
  } catch (err: any) {
    console.error('❌ UI login failed:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
