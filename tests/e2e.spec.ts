import { test, expect } from '@playwright/test';

// Test de inicio y acceso

test('Inicio: header, footer y navegación principal', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.locator('nav')).toBeVisible();
});

// Test de login y registro

test('Login: email/contraseña y Google', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Iniciar sesión');
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'testpassword');
  await page.click('button:has-text("Iniciar sesión")');
  // Espera modal username si corresponde
  if (await page.locator('text=Define tu nombre de usuario').isVisible()) {
    await page.fill('input[placeholder="Nombre de usuario"]', 'testuser');
    await page.click('button:has-text("Guardar nombre")');
  }
  await expect(page.locator('text=Shots guardados')).toBeVisible();
});

// Test de logout

test('Logout: cerrar sesión y regreso al login', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Asume usuario logueado
  await page.click('button:has-text("Cerrar sesión")');
  await expect(page.locator('text=Iniciar sesión')).toBeVisible();
});

// Puedes agregar más tests siguiendo la estructura anterior para tableros, overlays, modales, navegación, etc.
