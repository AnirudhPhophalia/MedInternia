import { jest } from '@jest/globals';

jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

describe('pdfExportService browser pool', () => {
  let puppeteerMock: any;
  let service: typeof import('../pdfExportService');

  beforeEach(() => {
    process.env.PDF_BROWSER_LAUNCH_RETRY_DELAY_MS = '1';
    jest.resetModules();
    puppeteerMock = require('puppeteer');
    service = require('../pdfExportService');
    puppeteerMock.launch.mockReset();
  });

  afterEach(async () => {
    await service.closePdfBrowserPool();
  });

  function mockBrowser(): { browser: any; page: any } {
    const page = {
      setContent: jest.fn(async () => undefined),
      pdf: jest.fn(async () => new Uint8Array([37, 80, 68, 70, 45, 1, 2, 3])),
      close: jest.fn(async () => undefined),
    };
    const browser = {
      connected: true,
      newPage: jest.fn(async () => page),
      close: jest.fn(async () => undefined),
      on: jest.fn(),
    };
    puppeteerMock.launch.mockResolvedValue(browser);
    return { browser, page };
  }

  it('should launch a single browser and reuse it across sequential requests', async () => {
    mockBrowser();

    await service.renderHtmlToPdfBuffer('<html><body>First</body></html>');
    await service.renderHtmlToPdfBuffer('<html><body>Second</body></html>');
    await service.renderHtmlToPdfBuffer('<html><body>Third</body></html>');

    expect(puppeteerMock.launch).toHaveBeenCalledTimes(1);
  });

  it('should share one browser across concurrent requests instead of launching per request', async () => {
    mockBrowser();

    const results = await Promise.all([
      service.renderHtmlToPdfBuffer('<html><body>One</body></html>'),
      service.renderHtmlToPdfBuffer('<html><body>Two</body></html>'),
      service.renderHtmlToPdfBuffer('<html><body>Three</body></html>'),
      service.renderHtmlToPdfBuffer('<html><body>Four</body></html>'),
      service.renderHtmlToPdfBuffer('<html><body>Five</body></html>'),
    ]);

    expect(puppeteerMock.launch).toHaveBeenCalledTimes(1);
    for (const buf of results) {
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.toString('utf-8', 0, 5)).toBe('%PDF-');
    }
  });

  it('should return a valid PDF buffer from the shared browser', async () => {
    mockBrowser();

    const pdfBuffer = await service.renderHtmlToPdfBuffer('<html><body>Test</body></html>');

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  it('should open a fresh tab per request and close it after rendering', async () => {
    const { browser, page } = mockBrowser();

    await service.renderHtmlToPdfBuffer('<html><body>Tab test</body></html>');

    expect(browser.newPage).toHaveBeenCalledTimes(1);
    expect(page.setContent).toHaveBeenCalledTimes(1);
    expect(page.pdf).toHaveBeenCalledTimes(1);
    expect(page.close).toHaveBeenCalledTimes(1);
  });

  it('should close the shared browser when the pool is shut down', async () => {
    const { browser } = mockBrowser();

    await service.renderHtmlToPdfBuffer('<html><body>Shutdown</body></html>');
    await service.closePdfBrowserPool();

    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('should relaunch the browser after it disconnects', async () => {
    const { browser } = mockBrowser();
    browser.connected = false;

    await service.renderHtmlToPdfBuffer('<html><body>First</body></html>');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.renderHtmlToPdfBuffer('<html><body>Second</body></html>');

    expect(puppeteerMock.launch.mock.calls.length).toBe(2);
    expect(browser.newPage).toHaveBeenCalledTimes(2);
  });

  it('should fall back to a minimal PDF without hanging when the browser fails to launch', async () => {
    puppeteerMock.launch.mockRejectedValue(new Error('Chrome is unavailable'));

    const pdfBuffer = await service.renderHtmlToPdfBuffer('<html><body>Fallback</body></html>');

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });
});
