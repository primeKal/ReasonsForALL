import { test, expect } from '@playwright/test';

test.describe('ReasonsForALL UI Tests', () => {
  test('Landing page loads with correct branding and hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check for branding text
    await expect(page.locator('text=Ralles').first()).toBeVisible();
    
    // Check for hero text
    await expect(page.locator('text=Turn unpredictable agents into')).toBeVisible();
    
    // Check for CTA
    const getStartedBtn = page.locator('text=Get Started');
    await expect(getStartedBtn).toBeVisible();
  });

  test('Authentication flow UI works properly', async ({ page }) => {
    await page.goto('/login');
    
    // Login Tab Check
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('label[for="email"]')).toBeVisible();
    
    // Register Check
    await page.click('text="Sign up"');
    await expect(page.locator('text=Create an account')).toBeVisible();
    await expect(page.locator('label[for="fullName"]')).toBeVisible();
    await expect(page.locator('label[for="companyName"]')).toBeVisible();
  });

  test('Dashboard loads the servers page', async ({ page }) => {
    await page.goto('/dashboard/servers');
    
    // Check page title
    await expect(page.locator('h1:has-text("Servers")')).toBeVisible();
    
    // Check for the mock server
    await expect(page.locator('text=Production Core')).toBeVisible();
    await expect(page.locator('text=PostgreSQL')).toBeVisible();
  });

  test('Create server wizard initializes correctly', async ({ page }) => {
    await page.goto('/dashboard/servers/create');
    
    await expect(page.locator('h1', { hasText: 'Connect Database' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('label[for="name"]')).toBeVisible();
  });
});
