import { test, expect } from '@playwright/test';

test.describe('Kitchen Dashboard Screenshots', () => {
  test('capture dashboard in different states', async ({ page }) => {
    // Navegar para o dashboard
    await page.goto('/kitchen');

    // Aguardar carregamento completo da página pelo heading
    await expect(page.getByRole('heading', { name: 'Cozinha — Pedidos' })).toBeVisible({ timeout: 10000 });

    // Capturar screenshot do estado inicial
    await page.screenshot({ path: 'test-results/dashboard-initial.png', fullPage: true });

    // Alternar modo compacto
    const compactModeCheckbox = page.getByLabel('Modo compacto');
    await compactModeCheckbox.click();
    await expect(compactModeCheckbox).toBeChecked();
    await page.screenshot({ path: 'test-results/dashboard-compact-mode.png', fullPage: true });

    // Alternar agrupamento de itens
    const groupItemsCheckbox = page.getByLabel('Agrupar itens');
    await groupItemsCheckbox.click();
    await expect(groupItemsCheckbox).toBeChecked();
    await page.screenshot({ path: 'test-results/dashboard-grouped-items.png', fullPage: true });

    // Filtrar por mesa
    await page.getByPlaceholder('filtrar por mesa').fill('1');
    await page.screenshot({ path: 'test-results/dashboard-table-filter.png', fullPage: true });

    // Limpar (usar ação disponível na UI demo)
    await page.getByRole('button', { name: 'Limpar demo' }).click();
    await page.screenshot({ path: 'test-results/dashboard-cleared-filters.png', fullPage: true });
  });
});