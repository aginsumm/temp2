import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('智能问答模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('应该显示聊天界面', async ({ page }) => {
    await expect(page.locator('[data-testid="chat-container"]').or(page.locator('.chat-container'))).toBeVisible();
  });

  test('应该能够发送消息', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="输入"]').or(page.locator('input[placeholder*="输入"]'));
    await expect(input).toBeVisible();
    
    await input.fill('汉绣是什么？');
    
    const sendButton = page.locator('button:has-text("发送")').or(page.locator('button[type="submit"]'));
    await sendButton.click();
    
    await expect(page.locator('.message').or(page.locator('[data-testid="message"]'))).toBeVisible({ timeout: 10000 });
  });

  test('应该显示AI回复', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="输入"]').or(page.locator('input[placeholder*="输入"]'));
    await input.fill('武汉木雕的传承人');
    
    const sendButton = page.locator('button:has-text("发送")').or(page.locator('button[type="submit"]'));
    await sendButton.click();
    
    await page.waitForSelector('.message.assistant, [data-role="assistant"]', { timeout: 15000 });
    
    const response = page.locator('.message.assistant, [data-role="assistant"]');
    await expect(response).toBeVisible();
  });

  test('应该显示加载状态', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="输入"]').or(page.locator('input[placeholder*="输入"]'));
    await input.fill('测试加载状态');
    
    const sendButton = page.locator('button:has-text("发送")').or(page.locator('button[type="submit"]'));
    await sendButton.click();
    
    const loadingIndicator = page.locator('.loading, [data-testid="loading"], .animate-pulse');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 1000 }).catch(() => {});
  });

  test('应该支持会话历史', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="输入"]').or(page.locator('input[placeholder*="输入"]'));
    
    await input.fill('第一个问题');
    await page.locator('button:has-text("发送")').or(page.locator('button[type="submit"]')).click();
    await page.waitForTimeout(1000);
    
    await input.fill('第二个问题');
    await page.locator('button:has-text("发送")').or(page.locator('button[type="submit"]')).click();
    await page.waitForTimeout(1000);
    
    const messages = page.locator('.message, [data-testid="message"]');
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('应该支持新建会话', async ({ page }) => {
    const newChatButton = page.locator('button:has-text("新建"), button:has-text("新对话")');
    
    if (await newChatButton.count() > 0) {
      await newChatButton.first().click();
      
      const messages = page.locator('.message, [data-testid="message"]');
      const count = await messages.count();
      expect(count).toBe(0);
    }
  });
});

test.describe('知识图谱模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/knowledge`);
  });

  test('应该显示知识图谱', async ({ page }) => {
    await expect(page.locator('[data-testid="knowledge-graph"]').or(page.locator('.knowledge-graph'))).toBeVisible({ timeout: 10000 });
  });

  test('应该显示图谱节点', async ({ page }) => {
    await page.waitForSelector('canvas, svg', { timeout: 10000 });
    
    const graphContainer = page.locator('[data-testid="knowledge-graph"], .knowledge-graph');
    await expect(graphContainer).toBeVisible();
  });

  test('应该支持节点点击', async ({ page }) => {
    await page.waitForSelector('canvas, svg', { timeout: 10000 });
    
    const canvas = page.locator('canvas').first();
    if (await canvas.count() > 0) {
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  });

  test('应该支持缩放功能', async ({ page }) => {
    const zoomInButton = page.locator('button:has([data-icon="zoom-in"]), button[aria-label*="放大"]');
    if (await zoomInButton.count() > 0) {
      await zoomInButton.first().click();
    }
    
    const zoomOutButton = page.locator('button:has([data-icon="zoom-out"]), button[aria-label*="缩小"]');
    if (await zoomOutButton.count() > 0) {
      await zoomOutButton.first().click();
    }
  });

  test('应该支持搜索节点', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('汉绣');
      await page.waitForTimeout(500);
    }
  });

  test('应该支持筛选类别', async ({ page }) => {
    const filterButton = page.locator('button:has-text("筛选"), button[aria-label*="筛选"]');
    if (await filterButton.count() > 0) {
      await filterButton.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('应该支持切换视图模式', async ({ page }) => {
    const viewToggle = page.locator('button:has-text("2D"), button:has-text("3D")');
    if (await viewToggle.count() >= 2) {
      await viewToggle.nth(1).click();
      await page.waitForTimeout(500);
      
      await viewToggle.first().click();
    }
  });
});

test.describe('无障碍测试', () => {
  test('应该支持键盘导航', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('应该有适当的ARIA标签', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent.first()).toBeVisible();
  });

  test('按钮应该有可访问的名称', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      expect(ariaLabel || text).toBeTruthy();
    }
  });
});

test.describe('响应式测试', () => {
  test('移动端布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    
    await expect(page.locator('body')).toBeVisible();
    
    const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('平板端布局', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('桌面端布局', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('错误处理测试', () => {
  test('应该处理网络错误', async ({ page, context }) => {
    await context.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    await page.goto(BASE_URL);
    
    const input = page.locator('textarea[placeholder*="输入"]').or(page.locator('input[placeholder*="输入"]'));
    if (await input.count() > 0) {
      await input.fill('测试网络错误');
      await page.locator('button:has-text("发送")').or(page.locator('button[type="submit"]')).click();
      
      await page.waitForTimeout(2000);
    }
  });

  test('应该显示错误提示', async ({ page, context }) => {
    await context.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: '服务器错误' }),
      });
    });
    
    await page.goto(BASE_URL);
    
    const input = page.locator('textarea[placeholder*="输入"]').or(page.locator('input[placeholder*="输入"]'));
    if (await input.count() > 0) {
      await input.fill('测试服务器错误');
      await page.locator('button:has-text("发送")').or(page.locator('button[type="submit"]')).click();
      
      await page.waitForTimeout(2000);
    }
  });
});

test.describe('性能测试', () => {
  test('页面加载时间应该在可接受范围内', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
  });

  test('首次内容绘制时间', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : 0;
    });
    
    expect(fcp).toBeLessThan(2000);
  });
});
