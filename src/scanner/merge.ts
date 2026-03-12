import type { Feature, FeatureMap } from './schema.js';

/**
 * Merges mobile and dashboard features into a single FeatureMap.
 *
 * - Features found in both mobile and dashboard (matched by slug) have sourceApp set to 'both'.
 * - Platform context is attached as apiContext to all features.
 * - generatedAt is set to current ISO timestamp.
 */
export function mergeFeatureMaps(
  mobileFeatures: Feature[],
  dashboardFeatures: Feature[],
  platformContext: string,
): FeatureMap {
  const featuresBySlug = new Map<string, Feature>();

  // Add all mobile features first
  for (const feature of mobileFeatures) {
    featuresBySlug.set(feature.slug, {
      ...feature,
      apiContext: platformContext || undefined,
    });
  }

  // Merge dashboard features — if slug already exists from mobile, set sourceApp to 'both'
  for (const feature of dashboardFeatures) {
    const existing = featuresBySlug.get(feature.slug);
    if (existing) {
      featuresBySlug.set(feature.slug, {
        ...existing,
        sourceApp: 'both',
        // Merge adminRoles from dashboard into the combined entry
        adminRoles: feature.adminRoles,
        // Keep dashboard audience classification for combined features
        audience: existing.audience === 'end_user' && feature.audience === 'admin'
          ? 'end_user'  // end_user wins in combined entries (broader audience)
          : existing.audience,
        apiContext: platformContext || undefined,
      });
    } else {
      featuresBySlug.set(feature.slug, {
        ...feature,
        apiContext: platformContext || undefined,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    features: Array.from(featuresBySlug.values()),
  };
}
