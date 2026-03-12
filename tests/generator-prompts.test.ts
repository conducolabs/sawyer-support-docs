import { describe, it, expect } from 'vitest';
import {
  GENERATION_SYSTEM_PROMPT,
  buildFeaturePrompt,
  buildFrontmatter,
} from '../src/generator/index.js';
import type { Feature } from '../src/scanner/index.js';

const endUserFeature: Feature = {
  name: 'Login',
  slug: 'login',
  featureArea: 'auth',
  sourceApp: 'mobile',
  audience: 'end_user',
  description: 'Allows users to log in to the mobile app using their credentials.',
};

const adminFeature: Feature = {
  name: 'Member Management',
  slug: 'member-management',
  featureArea: 'members',
  sourceApp: 'dashboard',
  audience: 'admin',
  adminRoles: ['club_admin', 'company_admin'],
  description: 'Allows admins to manage club members.',
};

const featureWithApiContext: Feature = {
  name: 'Payments',
  slug: 'payments',
  featureArea: 'finance',
  sourceApp: 'both',
  audience: 'admin',
  adminRoles: ['company_admin'],
  description: 'Handles payment processing.',
  apiContext: 'Uses Stripe API v3 for payment processing. Webhooks are configured for payment events.',
};

describe('GENERATION_SYSTEM_PROMPT', () => {
  it('uses Du-form (informal address)', () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain('Du');
    expect(GENERATION_SYSTEM_PROMPT).not.toMatch(/\bSie\b/);
  });

  it('contains Übersicht as always-include section', () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain('## Übersicht');
    expect(GENERATION_SYSTEM_PROMPT).toMatch(/Übersicht.*[Aa]lways/s);
  });

  it('contains Schritt-für-Schritt as conditional section', () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain('## Schritt-für-Schritt');
  });

  it('contains FAQ as conditional section', () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain('## FAQ');
  });

  it('contains Fehlerbehebung as conditional section', () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain('## Fehlerbehebung');
  });

  it('contains enrollment callout German text', () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain(
      'Für die Anmeldung wende Dich an Deine lokale Kontaktperson',
    );
  });

  it('instructs Claude to return body only (no frontmatter in output)', () => {
    // System prompt must tell Claude NOT to include frontmatter — frontmatter is programmatic
    const lower = GENERATION_SYSTEM_PROMPT.toLowerCase();
    // Should mention either "body only", "no frontmatter", or "return only the markdown"
    const hasFrontmatterInstruction =
      lower.includes('no frontmatter') ||
      lower.includes('body only') ||
      lower.includes('return only the markdown') ||
      lower.includes('ohne frontmatter') ||
      lower.includes('do not include frontmatter') ||
      lower.includes('without frontmatter');
    expect(hasFrontmatterInstruction).toBe(true);
  });
});

describe('buildFeaturePrompt', () => {
  it('mentions end users and mobile app for end_user audience', () => {
    const prompt = buildFeaturePrompt(endUserFeature);
    const lower = prompt.toLowerCase();
    expect(lower).toMatch(/end.?user|mobile app/);
  });

  it('mentions admin for admin audience', () => {
    const prompt = buildFeaturePrompt(adminFeature);
    const lower = prompt.toLowerCase();
    expect(lower).toContain('admin');
  });

  it('includes admin role names in the prompt for admin features', () => {
    const prompt = buildFeaturePrompt(adminFeature);
    expect(prompt).toContain('club_admin');
    expect(prompt).toContain('company_admin');
  });

  it('includes apiContext when provided', () => {
    const prompt = buildFeaturePrompt(featureWithApiContext);
    expect(prompt).toContain('Stripe API v3');
    expect(prompt).toContain('Webhooks are configured');
  });

  it('omits apiContext section when not provided', () => {
    const prompt = buildFeaturePrompt(endUserFeature);
    expect(prompt).not.toContain('apiContext');
    expect(prompt).not.toContain('API/backend context');
  });

  it('includes feature name in the prompt', () => {
    const prompt = buildFeaturePrompt(endUserFeature);
    expect(prompt).toContain('Login');
  });

  it('includes feature description in the prompt', () => {
    const prompt = buildFeaturePrompt(endUserFeature);
    expect(prompt).toContain(endUserFeature.description);
  });
});

describe('buildFrontmatter', () => {
  it('produces valid YAML frontmatter block with title and language: de', () => {
    const result = buildFrontmatter(endUserFeature);
    expect(result).toBe('---\ntitle: "Login"\nlanguage: de\n---\n\n');
  });

  it('escapes double quotes in the title', () => {
    const feature: Feature = {
      ...endUserFeature,
      name: 'Mein "Test"',
    };
    const result = buildFrontmatter(feature);
    expect(result).toContain('title: "Mein \\"Test\\""');
  });

  it('starts with --- delimiter', () => {
    const result = buildFrontmatter(endUserFeature);
    expect(result.startsWith('---\n')).toBe(true);
  });

  it('ends with blank line after closing delimiter', () => {
    const result = buildFrontmatter(endUserFeature);
    expect(result.endsWith('---\n\n')).toBe(true);
  });
});
