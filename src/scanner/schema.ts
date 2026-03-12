import { z } from 'zod';

export const AdminRoleSchema = z.enum(['club_admin', 'company_admin', 'super_admin']);

export const FeatureSchema = z.object({
  name: z.string(),
  slug: z.string(),
  featureArea: z.string(),
  sourceApp: z.enum(['mobile', 'dashboard', 'both']),
  audience: z.enum(['end_user', 'admin']),
  adminRoles: z.array(AdminRoleSchema).optional(),
  description: z.string(),
  apiContext: z.string().optional(),
});

export const FeatureMapSchema = z.object({
  generatedAt: z.string(),
  features: z.array(FeatureSchema),
});

export const ScanStateSchema = z.object({
  mobile: z.object({ sha: z.string(), scannedAt: z.string() }).optional(),
  dashboard: z.object({ sha: z.string(), scannedAt: z.string() }).optional(),
  platform: z.object({ sha: z.string(), scannedAt: z.string() }).optional(),
});

export type AdminRole = z.infer<typeof AdminRoleSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type FeatureMap = z.infer<typeof FeatureMapSchema>;
export type ScanState = z.infer<typeof ScanStateSchema>;
