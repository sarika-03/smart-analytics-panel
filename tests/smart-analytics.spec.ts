import { expect, test } from '@grafana/plugin-e2e';
import type { Locator } from '@playwright/test';

const dashboardFile = { fileName: 'dashboard.json' };
const customOptionsLabel = 'Smart Analytics Panel';

const parseAnomalyCount = async (locator: Locator): Promise<number> => {
  const text = (await locator.textContent()) ?? '';
  const match = text.match(/(\d+)/);

  return match ? Number(match[1]) : 0;
};

const setSliderValue = async (slider: Locator, value: number) => {
  await slider.evaluate((node, nextValue) => {
    const input = node instanceof HTMLInputElement ? node : node.querySelector('input');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Slider input not found');
    }

    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
};

test.describe('Smart Analytics Panel', () => {
  test('renders correctly with Random Walk data', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '3' });

    await expect(page.locator('[data-testid="smart-analytics-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-stats-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-stat-min"]')).toContainText('Min');
    await expect(page.locator('[data-testid="smart-analytics-stat-max"]')).toContainText('Max');
    await expect(page.locator('[data-testid="smart-analytics-stat-average"]')).toContainText('Average');
  });

  test('updates anomaly count when anomaly threshold slider changes', async ({
    gotoPanelEditPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
    const options = panelEditPage.getCustomOptions(customOptionsLabel);
    const slider = options.getSliderInput('Anomaly threshold');
    const anomalyCount = page.locator('[data-testid="smart-analytics-anomaly-count"]');

    await expect(anomalyCount).toBeVisible();

    await setSliderValue(slider, 0.05);
    await expect
      .poll(async () => parseAnomalyCount(anomalyCount), {
        message: 'expected more anomalies at a low threshold',
      })
      .toBeGreaterThan(0);

    const lowThresholdCount = await parseAnomalyCount(anomalyCount);

    await setSliderValue(slider, 0.9);

    await expect
      .poll(async () => parseAnomalyCount(anomalyCount), {
        message: 'expected anomaly count to update at a high threshold',
      })
      .toBeLessThanOrEqual(lowThresholdCount);
  });

  test('hides and shows trend section via panel option', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
    const options = panelEditPage.getCustomOptions(customOptionsLabel);
    const showTrend = options.getSwitch('Show trend');
    const trendSection = page.locator('[data-testid="smart-analytics-trend-section"]');

    await expect(trendSection).toBeVisible();
    await showTrend.uncheck();
    await expect(trendSection).not.toBeVisible();

    await showTrend.check();
    await expect(trendSection).toBeVisible();
  });

  test('hides and shows stats section via panel option', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
    const options = panelEditPage.getCustomOptions(customOptionsLabel);
    const showStats = options.getSwitch('Show stats');
    const statsSection = page.locator('[data-testid="smart-analytics-stats-section"]');

    await expect(statsSection).toBeVisible();
    await showStats.uncheck();
    await expect(statsSection).not.toBeVisible();

    await showStats.check();
    await expect(statsSection).toBeVisible();
  });

  test('shows no data message for no data scenario', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '2' });

    await expect(page.locator('[data-testid="smart-analytics-panel"]')).toContainText('No data in selected time range');
  });

  test('renders multiple series and legend entries', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '4' });

    await expect(page.locator('[data-testid="smart-analytics-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-series-path"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="smart-analytics-legend-item"]')).toHaveCount(3);
  });

  test('handles a single data point safely', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '5' });

    await expect(page.locator('[data-testid="smart-analytics-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-trend-section"]')).toContainText('Trend needs at least two points');
    await expect(page.locator('[data-testid="smart-analytics-insights-section"]')).toContainText('Waiting for more live data points');
  });

  test('stays visible in a compact viewport', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    await page.setViewportSize({ width: 900, height: 700 });

    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(page.locator('[data-testid="smart-analytics-panel"]')).toBeVisible();
    await page.setViewportSize({ width: 640, height: 520 });

    await expect(page.locator('[data-testid="smart-analytics-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-insights-section"]')).toBeVisible();
  });

  test('refreshes without crashing and keeps data visible', async ({
    gotoPanelEditPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard(dashboardFile);
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(page.locator('[data-testid="smart-analytics-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-chart"]')).toBeVisible();

    // A full page reload is more reliable here than refreshPanel() on the edit page,
    // which can time out waiting for an internal Grafana response hook.
    await page.reload();
    await expect(page.locator('[data-testid="smart-analytics-panel"]')).toBeVisible();

    await expect(page.locator('[data-testid="smart-analytics-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="smart-analytics-anomaly-count"]')).toBeVisible();
  });
});
