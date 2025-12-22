import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check if the app is loaded (adjust selector based on your actual homepage)
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Wait for navigation to be ready
  await page.waitForLoadState('networkidle');
  
  // Add more specific navigation tests based on your app structure
  // Example: Click on a navigation item and verify the route changes
});

