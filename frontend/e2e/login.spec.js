import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
  });

  test('should show validation error on empty submit', async ({ page }) => {
    await page.goto('/login');
    // Attempt submit without filling any fields
    await page.getByRole('button', { name: /login|sign in/i }).click();
    // Expect some validation feedback
    await expect(page.getByText(/required|invalid|please/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error on wrong credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in wrong credentials — adapt selectors to actual login form
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]'));

    if (await emailInput.isVisible()) {
      await emailInput.fill('wrong@example.com');
    }
    await passwordInput.fill('wrongpassword');

    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Should show an error toast or inline message
    await expect(
      page.getByText(/invalid|failed|incorrect|error/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/i, { timeout: 5000 });
  });

  test('should redirect to dashboard on successful admin login', async ({ page }) => {
    await page.goto('/login');

    // Use seeded test credentials (must exist in test database)
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
    const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]'));

    if (await emailInput.isVisible()) {
      await emailInput.fill('testadmin@example.com');
    }
    await passwordInput.fill('TestPass123!');

    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Should navigate away from login
    await expect(page).not.toHaveURL(/login/i, { timeout: 15000 });
  });
});
