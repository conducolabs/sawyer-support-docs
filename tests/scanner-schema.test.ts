import { describe, it, expect } from 'vitest';
import {
  FeatureSchema,
  FeatureMapSchema,
  ScanStateSchema,
} from '../src/scanner/schema.js';
import { buildSlug } from '../src/paths/slugify.js';

describe('FeatureSchema', () => {
  const validFeature = {
    name: 'User Login',
    slug: 'user-login',
    featureArea: 'authentication',
    sourceApp: 'mobile' as const,
    audience: 'end_user' as const,
    description: 'Allows users to log in to the app',
  };

  it('accepts a valid end_user feature', () => {
    const result = FeatureSchema.safeParse(validFeature);
    expect(result.success).toBe(true);
  });

  it('accepts audience "admin"', () => {
    const result = FeatureSchema.safeParse({ ...validFeature, audience: 'admin' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown audience values', () => {
    const result = FeatureSchema.safeParse({ ...validFeature, audience: 'guest' });
    expect(result.success).toBe(false);
  });

  it('accepts adminRoles array with valid values for admin audience', () => {
    const result = FeatureSchema.safeParse({
      ...validFeature,
      audience: 'admin',
      adminRoles: ['club_admin', 'company_admin'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts adminRoles with all valid role values', () => {
    const result = FeatureSchema.safeParse({
      ...validFeature,
      audience: 'admin',
      adminRoles: ['club_admin', 'company_admin', 'super_admin'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects adminRoles with unknown role values', () => {
    const result = FeatureSchema.safeParse({
      ...validFeature,
      audience: 'admin',
      adminRoles: ['club_admin', 'unknown_role'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional apiContext string', () => {
    const result = FeatureSchema.safeParse({
      ...validFeature,
      apiContext: 'GET /api/v1/auth/login',
    });
    expect(result.success).toBe(true);
  });

  it('accepts feature without apiContext (optional field)', () => {
    const result = FeatureSchema.safeParse(validFeature);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiContext).toBeUndefined();
    }
  });

  it('rejects feature missing required name field', () => {
    const { name, ...withoutName } = validFeature;
    const result = FeatureSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it('rejects feature missing required sourceApp field', () => {
    const { sourceApp, ...withoutSourceApp } = validFeature;
    const result = FeatureSchema.safeParse(withoutSourceApp);
    expect(result.success).toBe(false);
  });

  it('rejects feature missing required description field', () => {
    const { description, ...withoutDescription } = validFeature;
    const result = FeatureSchema.safeParse(withoutDescription);
    expect(result.success).toBe(false);
  });

  it('accepts sourceApp "both"', () => {
    const result = FeatureSchema.safeParse({ ...validFeature, sourceApp: 'both' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown sourceApp values', () => {
    const result = FeatureSchema.safeParse({ ...validFeature, sourceApp: 'web' });
    expect(result.success).toBe(false);
  });
});

describe('FeatureMapSchema', () => {
  const validFeatureMap = {
    generatedAt: '2026-03-12T10:00:00.000Z',
    features: [
      {
        name: 'User Login',
        slug: 'user-login',
        featureArea: 'authentication',
        sourceApp: 'mobile',
        audience: 'end_user',
        description: 'Allows users to log in',
      },
    ],
  };

  it('accepts a valid feature map with all required fields', () => {
    const result = FeatureMapSchema.safeParse(validFeatureMap);
    expect(result.success).toBe(true);
  });

  it('accepts feature map with empty features array', () => {
    const result = FeatureMapSchema.safeParse({
      generatedAt: '2026-03-12T10:00:00.000Z',
      features: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects feature map missing generatedAt field', () => {
    const result = FeatureMapSchema.safeParse({ features: [] });
    expect(result.success).toBe(false);
  });

  it('rejects feature map with invalid feature entry', () => {
    const result = FeatureMapSchema.safeParse({
      ...validFeatureMap,
      features: [{ name: 'No Slug Feature' }], // missing required fields
    });
    expect(result.success).toBe(false);
  });
});

describe('ScanStateSchema', () => {
  it('accepts empty state object', () => {
    const result = ScanStateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts state with per-repo sha and scannedAt', () => {
    const result = ScanStateSchema.safeParse({
      mobile: { sha: 'abc123', scannedAt: '2026-03-12T10:00:00.000Z' },
      dashboard: { sha: 'def456', scannedAt: '2026-03-12T10:00:00.000Z' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial state with only some repos', () => {
    const result = ScanStateSchema.safeParse({
      platform: { sha: 'ghi789', scannedAt: '2026-03-12T10:00:00.000Z' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects state with repo entry missing sha', () => {
    const result = ScanStateSchema.safeParse({
      mobile: { scannedAt: '2026-03-12T10:00:00.000Z' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects state with repo entry missing scannedAt', () => {
    const result = ScanStateSchema.safeParse({
      mobile: { sha: 'abc123' },
    });
    expect(result.success).toBe(false);
  });
});

describe('buildSlug idempotency (SCAN-06)', () => {
  it('same feature name always produces the same slug', () => {
    const featureName = 'User Authentication';
    const slug1 = buildSlug(featureName);
    const slug2 = buildSlug(featureName);
    expect(slug1).toBe(slug2);
  });

  it('buildSlug produces stable slugs for typical feature names', () => {
    const names = ['Club Overview', 'Payment Settings', 'Admin Dashboard', 'User Login'];
    for (const name of names) {
      const slug1 = buildSlug(name);
      const slug2 = buildSlug(name);
      expect(slug1).toBe(slug2);
      expect(slug1).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
