import { test, expect } from '@playwright/test';

test.describe('智能问答模块 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('应该能够发送消息并接收回复', async ({ page }) => {
    // 等待页面加载
    await expect(page.locator('textarea[placeholder*="输入"]')).toBeVisible();

    // 输入消息
    const message = '你好，请介绍一下非遗知识图谱';
    await page.locator('textarea').fill(message);

    // 发送消息
    await page.locator('button[type="submit"]').click();

    // 等待回复
    await expect(page.locator('[data-testid="message-bubble"]')).toHaveCount(2, {
      timeout: 10000,
    });

    // 验证消息内容
    const messages = page.locator('[data-testid="message-bubble"]');
    await expect(messages.nth(0)).toContainText(message);
  });

  test('应该能够收藏消息', async ({ page }) => {
    // 发送消息
    await page.locator('textarea').fill('测试收藏功能');
    await page.locator('button[type="submit"]').click();

    // 等待回复出现
    await page.waitForTimeout(2000);

    // 点击收藏按钮
    const favoriteButton = page.locator('button[aria-label="收藏"]').first();
    await favoriteButton.click();

    // 验证收藏状态
    await expect(favoriteButton).toHaveAttribute('aria-label', '已收藏');
  });

  test('应该能够复制消息内容', async ({ page }) => {
    // 发送消息
    await page.locator('textarea').fill('测试复制功能');
    await page.locator('button[type="submit"]').click();

    // 等待回复
    await page.waitForTimeout(2000);

    // 点击复制按钮
    const copyButton = page.locator('button[aria-label="复制"]').first();
    await copyButton.click();

    // 验证复制成功提示
    await expect(page.locator('[data-testid="toast"]')).toContainText('已复制');
  });

  test('应该能够切换会话', async ({ page }) => {
    // 点击新建会话按钮
    const newSessionButton = page.locator('button[aria-label="新建对话"]');
    await newSessionButton.click();

    // 验证新会话创建
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('textarea')).toHaveValue('');
  });

  test('应该能够搜索消息', async ({ page }) => {
    // 发送几条消息
    await page.locator('textarea').fill('第一条消息');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    await page.locator('textarea').fill('第二条消息');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    // 打开搜索面板
    await page.keyboard.press('Control+F');

    // 输入搜索关键词
    await page.locator('input[placeholder*="搜索"]').fill('第一条');

    // 验证搜索结果
    await expect(page.locator('[data-testid="search-result"]')).toContainText('第一条消息');
  });

  test('应该能够使用快捷命令', async ({ page }) => {
    // 打开命令面板
    await page.keyboard.press('Control+K');

    // 验证命令面板显示
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    // 输入命令
    await page.locator('input[placeholder*="命令"]').fill('新建');

    // 选择第一个命令
    await page.keyboard.press('Enter');
  });

  test('应该能够编辑消息', async ({ page }) => {
    // 发送消息
    await page.locator('textarea').fill('原始消息');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // 点击编辑按钮
    const editButton = page.locator('button[aria-label="编辑"]');
    await editButton.click();

    // 修改消息
    await page.locator('textarea').fill('修改后的消息');

    // 保存
    await page.locator('button[aria-label="保存"]').click();

    // 验证修改成功
    await expect(page.locator('[data-testid="message-content"]')).toContainText('修改后的消息');
  });

  test('应该能够使用语音输入（如果支持）', async ({ page }) => {
    // 检查浏览器是否支持语音输入
    const voiceButton = page.locator('button[aria-label="语音输入"]');
    
    const isSupported = await voiceButton.count() > 0;
    
    if (isSupported) {
      await voiceButton.click();
      await expect(voiceButton).toHaveAttribute('aria-label', '停止录音');
      
      await voiceButton.click();
      await expect(voiceButton).toHaveAttribute('aria-label', '语音输入');
    }
  });

  test('应该能够查看知识图谱', async ({ page }) => {
    // 发送触发图谱的消息
    await page.locator('textarea').fill('显示非遗知识图谱');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    // 验证图谱面板显示
    await expect(page.locator('[data-testid="graph-panel"]')).toBeVisible();
  });

  test('应该能够导出图谱快照', async ({ page }) => {
    // 发送消息
    await page.locator('textarea').fill('测试图谱');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // 点击保存快照按钮
    const snapshotButton = page.locator('button[aria-label="保存快照"]');
    await snapshotButton.click();

    // 验证快照保存成功
    await expect(page.locator('[data-testid="toast"]')).toContainText('快照已保存');
  });

  test('应该能够处理网络错误', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/v1/chat/*', (route) => {
      route.abort('failed');
    });

    // 发送消息
    await page.locator('textarea').fill('测试网络错误');
    await page.locator('button[type="submit"]').click();

    // 等待错误提示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('应该能够自动滚动到最新消息', async ({ page }) => {
    // 发送多条消息
    for (let i = 0; i < 5; i++) {
      await page.locator('textarea').fill(`消息 ${i + 1}`);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    }

    // 验证最后一条消息可见
    const lastMessage = page.locator('[data-testid="message-bubble"]').last();
    await expect(lastMessage).toBeInViewport();
  });

  test('应该能够加载历史会话', async ({ page }) => {
    // 发送一条消息创建会话
    await page.locator('textarea').fill('测试会话');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // 切换到其他会话
    const newSessionButton = page.locator('button[aria-label="新建对话"]');
    await newSessionButton.click();
    await page.waitForTimeout(1000);

    // 切回之前的会话
    await page.locator('[data-testid="session-item"]').first().click();

    // 验证历史消息加载
    await expect(page.locator('[data-testid="message-bubble"]')).toHaveCount(2);
  });

  test('应该能够删除消息', async ({ page }) => {
    // 发送消息
    await page.locator('textarea').fill('待删除消息');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // 点击删除按钮
    const deleteButton = page.locator('button[aria-label="删除"]');
    await deleteButton.click();

    // 确认删除
    await page.locator('button[aria-label="确认删除"]').click();

    // 验证消息已删除
    await expect(page.locator('text="待删除消息"')).not.toBeVisible();
  });
});
