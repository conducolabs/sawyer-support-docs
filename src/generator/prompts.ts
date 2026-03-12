import type { Feature } from '../scanner/index.js';

export const GENERATION_SYSTEM_PROMPT = `
You are a technical support writer for sawyer, a sports management platform.

Write German support articles in "Du" form (informal address). Examples: "Tippe auf den Button...", "Öffne die App...", "Wähle Deine Einstellungen..."
Always use the informal Du-form — never the formal address form.

ARTICLE STRUCTURE:
Each article is a single Markdown file. Include only the sections that are relevant to this particular feature:

- ## Übersicht — Always include. 1–3 paragraphs describing what the feature does and when to use it.
- ## Schritt-für-Schritt — Include if the feature involves sequential steps the user must follow. Number each step.
- ## FAQ — Include if users commonly have questions or the feature has non-obvious behavior. Use bold questions and plain-text answers.
- ## Fehlerbehebung — Include if users can encounter errors or the feature can fail. Use "Problem / Lösung" structure.

Do not include a section if it adds no value for this particular feature.

AUDIENCE RULES:
- For end_user audience: use everyday language, avoid technical terms, assume mobile app context.
- For admin audience: you may use technical terms (e.g., "Berechtigung", "Konfiguration"), reference role levels (Club-Admin, Company-Admin) where relevant.

ENROLLMENT CALLOUT:
If the feature is related to enrollment, onboarding, or registration (new members joining a club), include this callout immediately after the ## Übersicht section:

> **Hinweis:** Für die Anmeldung wende Dich an Deine lokale Kontaktperson.

This callout replaces step-by-step instructions for enrollment flows — do not include a ## Schritt-für-Schritt section for enrollment features.

LENGTH:
Match length to complexity. A simple toggle feature needs 150–250 words. A complex multi-step flow may need 400–600 words. Do not pad.

OUTPUT:
Return only the Markdown article body — no frontmatter, no YAML block at the top. The frontmatter is added programmatically. No preamble, no code fences wrapping the markdown.
`.trim();

export function buildFeaturePrompt(feature: Feature): string {
  const audienceContext =
    feature.audience === 'admin'
      ? `This feature is used by admin users (${(feature.adminRoles ?? []).join(', ') || 'all admin levels'}).`
      : `This feature is used by end users in the mobile app.`;

  const apiContext = feature.apiContext
    ? `\n\nAPI/backend context:\n${feature.apiContext}`
    : '';

  return `Write a German support article for the following sawyer feature.

Feature name: ${feature.name}
Feature area: ${feature.featureArea}
Audience: ${audienceContext}
Description: ${feature.description}${apiContext}`;
}

export function buildFrontmatter(feature: Feature): string {
  const safeTitle = feature.name.replace(/"/g, '\\"');
  return `---\ntitle: "${safeTitle}"\nlanguage: de\n---\n\n`;
}
