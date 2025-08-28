import { expect, test } from '@playwright/test';

test.describe('見積の在庫連動テスト', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用の固定データを前提とする
    // seeds または factory で以下のシナリオを用意：
    // - 材料：「障子紙（標準）」(unit=枚)
    // - 見積：上記材料を必要量 > availableQty になるよう1件作成
    // - タスク：同材料を使用する未完タスクあり
  });

  test('入庫で不足バナーが対応可能に変わる', async ({ page, request }) => {
    await page.goto('/estimates');

    // E2Eテスト用の見積カード（障子紙（標準）20枚必要）を特定
    const e2eEstimateCard = page
      .locator('[data-testid="estimate-card"]')
      .filter({ hasText: '障子紙（標準）20.0枚' });
    await e2eEstimateCard.waitFor();

    // まず不足で表示されていること
    const banner = e2eEstimateCard.getByTestId('estimate-stock-banner');
    await expect(banner).toContainText('不足');

    // 入庫を実行（テスト用の材料IDを使用）
    const materialId = 1; // 障子紙（標準）のID
    await request.post(`/api/materials/${materialId}/receive`, {
      headers: { 'X-Idempotency-Key': 'e2e-recv-1' },
      data: { quantity: 50 }, // 不足を埋める量（-44.5枚 + 50枚 = 5.5枚）
    });

    // フロントエンドのキャッシュをクリアするため、強制的に再読込
    await page.reload();

    // ページの読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // 見積カードが再表示されるまで待機
    await page.locator('[data-testid="estimate-card"]').first().waitFor();

    // 対応可能に変わったことを確認
    const updatedCard = page
      .locator('[data-testid="estimate-card"]')
      .filter({ hasText: '障子紙（標準）20.0枚' });
    const updatedBanner = updatedCard.getByTestId('estimate-stock-banner');
    await expect(updatedBanner).toContainText('在庫で対応可能');
  });

  test('タスク完了で対応可能が不足に変わる', async ({ page, request }) => {
    await page.goto('/estimates');

    // まず入庫して対応可能にする
    const materialId = 1; // 障子紙（標準）のID
    await request.post(`/api/materials/${materialId}/receive`, {
      headers: { 'X-Idempotency-Key': 'e2e-recv-2' },
      data: { quantity: 50 }, // 不足を埋める量
    });

    // ページを再読込
    await page.reload();

    // ページの読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // E2Eテスト用の見積カードを特定
    const e2eEstimateCard = page
      .locator('[data-testid="estimate-card"]')
      .filter({ hasText: '障子紙（標準）20.0枚' });
    await e2eEstimateCard.waitFor();

    // 対応可能で表示されていること
    const banner = e2eEstimateCard.getByTestId('estimate-stock-banner');
    await expect(banner).toContainText('対応可能');

    // 在庫を圧迫するタスクを完了（テスト用のタスクIDを使用）
    const taskId = 113; // E2Eテスト用のタスクID（更新されたID）
    await request.post(`/api/tasks/${taskId}/complete`, {
      headers: { 'X-Idempotency-Key': 'e2e-task-1' },
    });

    // 再読込
    await page.reload();

    // ページの読み込み完了を待機
    await page.waitForLoadState('networkidle');

    // 不足に変わったことを確認
    const updatedCard = page
      .locator('[data-testid="estimate-card"]')
      .filter({ hasText: '障子紙（標準）20.0枚' });
    const updatedBanner = updatedCard.getByTestId('estimate-stock-banner');
    await expect(updatedBanner).toContainText('不足');
  });

  test('行バッジが正しく表示される', async ({ page }) => {
    await page.goto('/estimates');

    // E2Eテスト用の見積カードを特定
    const e2eEstimateCard = page
      .locator('[data-testid="estimate-card"]')
      .filter({ hasText: '障子紙（標準）20.0枚' });
    await e2eEstimateCard.waitFor();

    // 各行に在庫バッジが表示されることを確認
    const lineBadges = e2eEstimateCard.getByTestId('estimate-line-badge');
    await expect(lineBadges).toHaveCount(1); // 1行のみ

    // バッジの内容を確認（在庫あり/不足/未登録のいずれか）
    for (const badge of await lineBadges.all()) {
      const text = await badge.textContent();
      expect(text).toMatch(/OK|不足|未登録/);
    }
  });

  test('集計バナーが正しく表示される', async ({ page }) => {
    await page.goto('/estimates');

    // E2Eテスト用の見積カードを特定
    const e2eEstimateCard = page
      .locator('[data-testid="estimate-card"]')
      .filter({ hasText: '障子紙（標準）20.0枚' });
    await e2eEstimateCard.waitFor();

    // 集計バナーが表示されることを確認
    const banner = e2eEstimateCard.getByTestId('estimate-stock-banner');
    await expect(banner).toBeVisible();

    // バナーの内容を確認（不足または対応可能）
    const bannerText = await banner.textContent();
    expect(bannerText).toMatch(/不足|在庫で対応可能/);

    // 不足がある場合は「ほかN件」の表記も確認（ただし1件のみの場合は不要）
    if (bannerText?.includes('不足') && bannerText.includes('ほか')) {
      expect(bannerText).toMatch(/ほか\d+件/);
    }
  });
});
