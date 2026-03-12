import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs before importing modules that use existsSync
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

import { existsSync } from 'node:fs';
import { deriveSlugsFromChangedRepos, findMissingArticles } from '../src/commands/run.js';
import type { Feature } from '../src/scanner/index.js';

// ---- Test fixtures ----

const mobileFeature: Feature = {
  name: 'Mobile Login',
  slug: 'mobile-login',
  featureArea: 'auth',
  sourceApp: 'mobile',
  audience: 'end_user',
  description: 'Login via mobile app',
};

const dashboardFeature: Feature = {
  name: 'Dashboard Overview',
  slug: 'dashboard-overview',
  featureArea: 'analytics',
  sourceApp: 'dashboard',
  audience: 'admin',
  description: 'Overview dashboard for admins',
};

const bothFeature: Feature = {
  name: 'Notifications',
  slug: 'notifications',
  featureArea: 'core',
  sourceApp: 'both',
  audience: 'end_user',
  description: 'Notification system on mobile and dashboard',
};

const allFeatures = [mobileFeature, dashboardFeature, bothFeature];

// ---- deriveSlugsFromChangedRepos ----

describe('deriveSlugsFromChangedRepos', () => {
  it('returns slugs of mobile features when mobile is in changedRepos', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set(['mobile']));
    expect(result.has('mobile-login')).toBe(true);
  });

  it('does NOT return dashboard feature slug when only mobile changed', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set(['mobile']));
    expect(result.has('dashboard-overview')).toBe(false);
  });

  it('returns slugs of dashboard features when dashboard is in changedRepos', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set(['dashboard']));
    expect(result.has('dashboard-overview')).toBe(true);
  });

  it('does NOT return mobile feature slug when only dashboard changed', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set(['dashboard']));
    expect(result.has('mobile-login')).toBe(false);
  });

  it('returns slugs of "both" features when mobile changed', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set(['mobile']));
    expect(result.has('notifications')).toBe(true);
  });

  it('returns slugs of "both" features when dashboard changed', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set(['dashboard']));
    expect(result.has('notifications')).toBe(true);
  });

  it('returns empty set when changedRepos is empty', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set());
    expect(result.size).toBe(0);
  });

  it('returns all relevant slugs when both mobile and dashboard changed', () => {
    const result = deriveSlugsFromChangedRepos(allFeatures, new Set(['mobile', 'dashboard']));
    expect(result.has('mobile-login')).toBe(true);
    expect(result.has('dashboard-overview')).toBe(true);
    expect(result.has('notifications')).toBe(true);
  });

  it('returns empty set for features with non-matching sourceApp when platform changes', () => {
    // platform is not a valid sourceApp, none of the features should match
    const result = deriveSlugsFromChangedRepos(
      [mobileFeature, dashboardFeature],
      new Set(['platform']),
    );
    expect(result.size).toBe(0);
  });

  it('works with empty features array', () => {
    const result = deriveSlugsFromChangedRepos([], new Set(['mobile']));
    expect(result.size).toBe(0);
  });
});

// ---- findMissingArticles ----

describe('findMissingArticles', () => {
  const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExistsSync.mockReset();
  });

  it('returns slug when German article file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = findMissingArticles('/project', [mobileFeature]);
    expect(result.has('mobile-login')).toBe(true);
  });

  it('returns empty set when all German article files exist', () => {
    mockExistsSync.mockReturnValue(true);
    const result = findMissingArticles('/project', allFeatures);
    expect(result.size).toBe(0);
  });

  it('returns only the slug of the missing feature', () => {
    mockExistsSync
      .mockReturnValueOnce(false) // mobile-login missing
      .mockReturnValueOnce(true)  // dashboard-overview present
      .mockReturnValueOnce(true); // notifications present
    const result = findMissingArticles('/project', allFeatures);
    expect(result.has('mobile-login')).toBe(true);
    expect(result.has('dashboard-overview')).toBe(false);
    expect(result.has('notifications')).toBe(false);
  });

  it('checks the correct path using buildArticlePath with lang "de"', () => {
    mockExistsSync.mockReturnValue(true);
    findMissingArticles('/project', [mobileFeature]);
    // Should check the German article path — docs/de/auth/mobile-login.md
    const calledPath = mockExistsSync.mock.calls[0]![0] as string;
    expect(calledPath).toContain('de');
    expect(calledPath).toContain('auth');
    expect(calledPath).toContain('mobile-login');
  });

  it('returns empty set for empty features array', () => {
    const result = findMissingArticles('/project', []);
    expect(result.size).toBe(0);
    expect(mockExistsSync).not.toHaveBeenCalled();
  });
});
