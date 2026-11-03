/**
 * Browser smoke: boots the server from source on a fixture feed (templates/<type>/ card folders plus a
 * broken card, an alert and the SKILL.md email-summary table) against the built UI (ui/dist) and drives it in Chromium.
 * Asserts every fixture type renders its real body (04 registry), never the
 * "Unsupported type" fallback.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FakeNotifyAdapter } from '../../src/integrations/notify/fake.js';
import { startServer, type RunningServer } from '../../src/http/server.js';
import { ensureDirs, feedDir } from '../../src/paths.js';
import { ENV_HOME } from '../../src/constants/env.js';

const ROOT = resolve(import.meta.dirname, '../..');
const UI_DIR = join(ROOT, 'ui/dist');
const TYPES = ['markdown', 'table', 'list', 'kpi', 'media', 'calendar', 'bookmarks'] as const;

interface Harness {
  server: RunningServer;
  home: string;
}

interface FixtureCard {
  id: string;
  card: Record<string, unknown>;
  /** data.json text or object; omitted = no data.json */
  data?: unknown;
}

function writeAtomic(file: string, text: string): void {
  writeFileSync(`${file}.tmp`, text);
  renameSync(`${file}.tmp`, file);
}

async function boot(cards: FixtureCard[], alerts: Record<string, unknown>[] = []): Promise<Harness> {
  const home = mkdtempSync(join(tmpdir(), 'tickdeck-smoke-'));
  const env = { ...process.env, [ENV_HOME]: home };
  ensureDirs(env);
  for (const c of cards) {
    const dir = join(feedDir(env), c.id);
    mkdirSync(dir, { recursive: true });
    writeAtomic(join(dir, 'card.json'), JSON.stringify(c.card));
    if (c.data !== undefined) writeAtomic(join(dir, 'data.json'), typeof c.data === 'string' ? c.data : JSON.stringify(c.data));
  }
  if (alerts.length > 0) {
    mkdirSync(join(feedDir(env), 'alerts'), { recursive: true });
    for (const a of alerts) writeAtomic(join(feedDir(env), 'alerts', `${String(a['id'])}.json`), JSON.stringify({ ...a, id: undefined }));
  }
  const server = await startServer({ env, uiDir: UI_DIR, port: 0, notifyAdapter: new FakeNotifyAdapter() });
  return { server, home };
}

async function shutdown(h: Harness | undefined): Promise<void> {
  if (!h) return;
  await h.server.stop();
  rmSync(h.home, { recursive: true, force: true });
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

const readJson = (...parts: string[]): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, ...parts), 'utf8')) as Record<string, unknown>;

/** Shipped templates/<type>/{card,data}.json as a fixture card (folder name = type). */
const template = (type: string): FixtureCard => ({
  id: type,
  card: readJson('templates', type, 'card.json'),
  data: { ...readJson('templates', type, 'data.json'), updatedAt: new Date().toISOString() },
});

/** The email-summary data.json block from SKILL.md (the doc an agent is told to write). */
function skillBlock(kind: 'card' | 'data'): Record<string, unknown> {
  const md = readFileSync(join(ROOT, 'src/skill/SKILL.md'), 'utf8');
  const m = new RegExp(`<!-- example:${kind} email-summary -->\\s*\`\`\`json\\n([\\s\\S]*?)\`\`\``).exec(md);
  if (!m) throw new Error(`SKILL.md has no ${kind} example`);
  return JSON.parse(m[1]!) as Record<string, unknown>;
}

test.describe('populated feed', () => {
  let h: Harness | undefined;
  test.beforeAll(async () => {
    const cards: FixtureCard[] = TYPES.map(template);
    // Side tables are invalid (side-not-allowed); a markdown card keeps the left column populated.
    const side = template('markdown');
    cards.push({ ...side, id: 'side-note', card: { ...side.card, layout: { ...(side.card['layout'] as object), column: 'left' } } });
    cards.push({
      id: 'smoke-broken',
      card: { type: 'markdown', title: 'Smoke broken' },
      data: { updatedAt: '2026-10-05T07:30:00Z', error: 'Upstream API unreachable' },
    });
    h = await boot(cards, [{ id: 'smoke-alert', title: 'Smoke alert', text: 'Disk almost full', priority: 5 }]);
  });
  test.afterAll(() => shutdown(h));

  test('ui/dist is served by 02 (index + assets)', async ({ request }) => {
    const url = h!.server.url;
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    const html = await res.text();
    const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]!);
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) {
      const r = await request.get(new URL(a, url.endsWith('/') ? url : `${url}/`).toString());
      expect(r.status(), a).toBe(200);
    }
  });

  test('renders cards, broken, alert, done and reopen with no console errors', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(h!.server.url);

    // Header: no theme toggle; connection dot is visibly coloured.
    await expect(page.getByRole('button', { name: /theme/i })).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'Connected' })).toHaveCSS('background-color', /^rgb\((?!0, 0, 0\))/);
    // One rendered card element per fixture type (folder name = type).
    for (const type of TYPES) await expect(page.locator(`[data-card-id="${type}"]`).first(), type).toBeVisible();
    // Three columns: left | center | right placement comes from each template's card.json layout.
    await expect(page.locator('[data-column="center"] [data-card-id="table"]')).toBeVisible();
    await expect(page.locator('[data-column="center"] [data-card-id="markdown"]')).toBeVisible();
    await expect(page.locator('[data-column="right"] [data-card-id="kpi"]')).toBeVisible();
    // Collapsed panels render as chips; expand them all so the real bodies mount.
    const expanders = page.getByRole('button', { name: /^Expand/ });
    while (await expanders.count()) await expanders.first().click();
    await expect(page.getByText(/Unsupported type/i)).toHaveCount(0);
    await expect(page.locator('table').first()).toBeVisible(); // table body
    await expect(page.locator('[data-card-id] a.card-link').first()).toBeVisible(); // list/markdown links

    // Broken card: message shown, no data/body of its own.
    const broken = page.locator('[data-card-id="smoke-broken"]');
    await expect(broken).toBeVisible();
    await expect(broken.getByText('Upstream API unreachable')).toBeVisible();
    await expect(broken.getByRole('group', { name: 'Broken card' })).toBeVisible();
    await expect(broken.getByText(/Unsupported type/i)).toHaveCount(0);

    // Alert strip.
    const alerts = page.getByRole('region', { name: 'Alerts' });
    await expect(alerts.locator('[data-alert-id="smoke-alert"]')).toBeVisible();

    // Done on a panel moves it to the Completed section; Reopen brings it back.
    const id = 'table';
    const panel = page.locator(`section[data-card-id="${id}"]`);
    await panel.getByRole('button', { name: 'Done' }).click();
    const completed = page.getByTestId('completed');
    await expect(completed).toBeVisible();
    const head = completed.getByRole('button', { name: /^Completed/ });
    if ((await head.getAttribute('aria-expanded')) === 'false') await head.click();
    const row = completed.locator(`[data-completed-id="${id}"]`);
    await expect(row).toBeVisible();
    await expect(panel).toHaveCount(0);
    await row.getByRole('button', { name: 'Reopen' }).click();
    await expect(page.locator(`section[data-card-id="${id}"]`)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('font served locally, no external requests, weight 400 everywhere (03 A4/A7)', async ({ page }) => {
    const origin = new URL(h!.server.url).origin;
    const reqs: string[] = [];
    const fonts: { url: string; status: number }[] = [];
    // Card content images (media template thumbnails) legitimately point at remote hosts; assets/fonts/css/js must not.
    page.on('request', (r) => {
      if (r.resourceType() !== 'image') reqs.push(r.url());
    });
    page.on('response', (r) => {
      if (/\.woff2(\?|$)/.test(r.url())) fonts.push({ url: r.url(), status: r.status() });
    });
    await page.goto(h!.server.url);
    await expect(page.locator('[data-card-id="table"]').first()).toBeVisible();
    const expanders = page.getByRole('button', { name: /^Expand/ });
    while (await expanders.count()) await expanders.first().click();
    await page.evaluate('document.fonts.ready');
    expect(fonts.length).toBeGreaterThan(0);
    for (const f of fonts) {
      expect(f.url.startsWith(origin), f.url).toBe(true);
      expect(f.status, f.url).toBe(200);
    }
    const external = reqs.filter((u) => /^https?:/.test(u) && !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(u));
    expect(external).toEqual([]);
    const weights = (await page.evaluate(
      `[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,th,strong,b')].map((e) => getComputedStyle(e).fontWeight)`,
    )) as string[];
    expect(weights.length).toBeGreaterThan(0);
    expect(weights.filter((w) => w !== '400')).toEqual([]);
  });

  test('side cards are flat; center cards show edge and updated meta (03 A7)', async ({ page }) => {
    await page.goto(h!.server.url);
    const side = page.locator('[data-column="left"] [data-card-id="side-note"]');
    await expect(side).toBeVisible();
    await expect(side).toHaveClass(/card--side/);
    await expect(side.getByRole('button', { name: 'Done' })).toBeHidden();
    await expect(side.getByRole('button', { name: 'Hide' })).toBeHidden();
    await expect(side.locator('.card-meta')).toBeHidden();
    await expect(side.locator('.unseen-dot')).toBeHidden();
    await expect(side.locator('.card-body')).toHaveCSS('border-left-width', '1px');
    const center = page.locator('[data-column="center"] [data-card-id="markdown"]');
    await expect(center).toHaveClass(/card--center/);
    await expect(center.locator('.card-meta')).toBeVisible();
    await expect(center.locator('.card-body')).toHaveCSS('border-left-width', '3px');
    await center.hover();
    await expect(center.getByRole('button', { name: 'Done' })).toBeVisible();
  });

  test('360px: no horizontal scroll, columns stack center/left/right (R9)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(h!.server.url);
    await expect(page.locator('[data-column="center"]')).toBeVisible();
    const expanders = page.getByRole('button', { name: /^Expand/ });
    while (await expanders.count()) await expanders.first().click();
    const overflow = await page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth') as number;
    expect(overflow).toBeLessThanOrEqual(0);
    const top = async (c: string): Promise<number> => (await page.locator(`[data-column="${c}"]`).boundingBox())!.y;
    const [center, left, right] = [await top('center'), await top('left'), await top('right')];
    expect(center).toBeLessThan(left);
    expect(left).toBeLessThan(right);
  });

  test('header has page padding and fits the viewport at 1280 (post-review)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(h!.server.url);
    const brand = (await page.locator('.header__brand').boundingBox())!;
    expect(brand.x).toBeGreaterThanOrEqual(12);
    const dot = (await page.getByRole('img', { name: 'Connected' }).boundingBox())!;
    expect(dot.x + dot.width).toBeLessThanOrEqual(1280 - 12);
    await expect(page.locator('.header__status')).toContainText('connected');
  });

  test('header fits the viewport at 360 with a gutter (post-review)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(h!.server.url);
    const boxes = await page.locator('.header, .header *').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: String(e.getAttribute('class') ?? ''), left: r.left, right: r.right, w: r.width };
      }),
    );
    for (const b of boxes.filter((x) => x.w > 0 && !/^header$/.test(String(x.cls)))) {
      expect(b.left, String(b.cls)).toBeGreaterThanOrEqual(0);
      expect(b.right, String(b.cls)).toBeLessThanOrEqual(360);
    }
    expect((await page.locator('.header__brand').boundingBox())!.x).toBeGreaterThanOrEqual(12);
    expect((await page.locator('.search-box input').boundingBox())!.x).toBeGreaterThanOrEqual(12);
  });

  test('compact table: one-line truncating cells, aligned, wrap scrolls in-card (post-review)', async ({ page }) => {
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(h!.server.url);
      const expanders = page.getByRole('button', { name: /^Expand/ });
      while (await expanders.count()) await expanders.first().click();
      const card = page.locator('[data-card-id="table"]').first();
      await expect(card.locator('.cell-truncate').first()).toHaveCSS('white-space', 'nowrap');
      await expect(card.locator('.tbl-wrap')).toHaveCSS('overflow-x', 'auto');
      const rows = await card.locator('tbody tr').evaluateAll((trs) =>
        trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.getBoundingClientRect().height)),
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(Math.max(...r) - Math.min(...r), `${width}`).toBeLessThan(2);
      const links = card.locator('td a.card-link:not(.tbl-rowlink *)');
      if (await links.count()) {
        const cell = (await links.first().locator('xpath=ancestor::td').boundingBox())!;
        const text = (await links.first().boundingBox())!;
        expect(Math.abs(text.y + text.height / 2 - (cell.y + cell.height / 2))).toBeLessThan(4);
      }
      const box = (await card.locator('.tbl-wrap').boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const cardBox = (await card.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
      if (process.env['TICKDECK_SHOTS']) {
        await page.evaluate('window.scrollTo(0, 0)');
        await page.screenshot({ path: join(process.env['TICKDECK_SHOTS'], `app-${width}.png`), fullPage: true });
      }
    }
  });

  test('media row is a labelled focusable region; calendar and bookmarks render in side columns (05 A6/A1/A3)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(h!.server.url);
    for (const id of ['media', 'calendar', 'bookmarks']) await expect(page.locator(`[data-card-id="${id}"]`).first()).toBeVisible();
    const expanders = page.getByRole('button', { name: /^Expand/ });
    while (await expanders.count()) await expanders.first().click();
    const row = page.locator('[data-column="center"] [data-card-id="media"] [role="region"][tabindex="0"]');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('aria-label', /Camera snapshots/);
    const cal = page.locator('[data-column="right"] [data-card-id="calendar"]');
    await expect(cal.locator('.cal-grid')).toBeVisible();
    await expect(cal.locator('.agenda-wrap')).toBeVisible();
    const bm = page.locator('[data-column="left"] [data-card-id="bookmarks"]');
    await expect(bm.locator('.bm-item a').first()).toBeVisible();
    expect(await bm.locator('.bm-item a').count()).toBeGreaterThan(0);
    await expect(page.getByText(/Unsupported type/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('reduced motion disables animation (R12)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(h!.server.url);
    await expect(page.locator('body')).toHaveCSS('animation-name', 'none');
  });
});

test.describe('SKILL.md email-summary table', () => {
  let h: Harness | undefined;
  test.beforeAll(async () => {
    h = await boot([{ id: 'email-summary', card: skillBlock('card'), data: skillBlock('data') }]);
  });
  test.afterAll(() => shutdown(h));

  test('renders the documented table card in the center column', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(h!.server.url);
    const card = page.locator('[data-column="center"] [data-card-id="email-summary"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole('columnheader', { name: /From/ })).toBeVisible();
    await expect(card.getByRole('columnheader', { name: /Subject/ })).toBeVisible();
    await expect(card.locator('tbody tr')).toHaveCount(5);
    await expect(card.getByText('Q4 planning notes', { exact: true })).toBeVisible();
    await expect(card.getByText(/Unsupported type|No data yet/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('empty feed', () => {
  let h: Harness | undefined;
  test.beforeAll(async () => {
    h = await boot([]);
  });
  test.afterAll(() => shutdown(h));

  test('shows the empty state with no console errors', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(h!.server.url);
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No cards yet')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

