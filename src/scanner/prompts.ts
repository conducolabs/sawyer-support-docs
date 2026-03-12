/**
 * Prompt templates for the three-pass codebase scanning strategy.
 *
 * Pass 1: Discovery — find all screens and routes
 * Pass 2: Classification — filter user-facing vs infrastructure
 * Pass 3: Extraction — extract structured feature details
 * Platform: Context extraction — extract API context without generating feature entries
 */

export const SYSTEM_PROMPT = `You are analyzing a codebase to identify user-facing features for end-user support documentation.

Your goal is to find features that real users interact with — screens, flows, and capabilities that users accomplish tasks with.

ALWAYS EXCLUDE the following infrastructure components:
- Navigation wrappers and routing structures (e.g., Stack.Navigator, Tab.Navigator, AppRouter, RouterProvider)
- Loading screens, skeleton screens, splash screens
- Error boundaries and error fallback screens
- Auth guards, auth wrappers, protected route components
- Developer/debug screens, test screens, storybook entries
- Modal containers and bottom sheet wrappers that are purely presentational
- Layout components that only arrange child screens (not interactive themselves)

Features can be a single screen OR a multi-screen flow — use judgment based on what represents a coherent user capability. For example, a multi-step checkout flow is one feature, not five.`;

export const PASS1_PROMPT = `Identify all user-facing screens and routes in this codebase.

For each screen or route you find, report:
1. The file path (relative to the repo root)
2. The component name
3. A brief description of what the screen does from the user's perspective

Also report:
- The navigation library detected (React Navigation, Expo Router, Next.js pages router, Next.js app router, or other)
- The overall directory structure for screens/pages

Be thorough — check src/screens/, src/pages/, src/app/, src/views/, src/features/, and any other directories that contain screen-level components.`;

export function PASS2_PROMPT(pass1Result: string): string {
  return `Given the screens identified in Pass 1, classify each as either 'user_facing' or 'infrastructure'.

Pass 1 results:
${pass1Result}

Classification criteria:
- user_facing: screens where users accomplish tasks — viewing data, submitting forms, navigating features, making payments, managing profile, etc.
- infrastructure: loading screens, error boundaries, navigation wrappers, auth guards, dev tools, splash screens, onboarding skeleton containers, layout-only containers

Return ONLY the user-facing screens. For each, include the file path, component name, and description from Pass 1.`;
}

export function PASS3_PROMPT(
  pass2Result: string,
  repoType: 'mobile' | 'dashboard',
): string {
  const audienceContext =
    repoType === 'mobile'
      ? `This is a mobile app for end users. All features have audience: 'end_user'.`
      : `This is an admin dashboard. Features are used by admin users with different role levels:
- club_admin: manages a single sports club
- company_admin: manages multiple clubs under a company
- super_admin: platform-level administrator managing all companies

For each feature, identify which admin roles can access it based on the component's role guards, permission checks, or route configuration.`;

  return `For each user-facing screen identified in Pass 2, extract structured feature details.

Pass 2 results:
${pass2Result}

${audienceContext}

For each feature, extract:
1. canonical name: Use the most stable, official name for the feature. Prefer the product/marketing name if visible in the UI strings. Use title case. Examples: 'Check-in', 'Member Profile', 'Payment History', 'Club Settings' — NOT 'CheckinScreen', 'UserProfileView', 'PaymentsListContainer'.
2. featureArea: A category grouping for the feature area. Use lowercase, hyphenated. Examples: 'authentication', 'payments', 'check-in', 'member-management', 'club-settings', 'notifications'. Group related features under the same area.
3. description: 1-2 sentences describing what the feature does from the user's perspective. Write for a support documentation audience.
${repoType === 'dashboard' ? '4. adminRoles: Array of role strings from [club_admin, company_admin, super_admin] that can access this feature.' : ''}

Return a JSON object with a "features" array. Each feature must have: name, featureArea, description${repoType === 'dashboard' ? ', adminRoles' : ''}.`;
}

export const PLATFORM_PROMPT = `Analyze this API codebase and extract context about its endpoints and data models.

For each endpoint group or resource, extract:
1. The resource name (e.g., "members", "check-ins", "clubs", "payments")
2. HTTP methods available (GET, POST, PUT, DELETE, etc.)
3. Key data model fields relevant to end-user documentation
4. Any business logic relevant to understanding what end users can do (e.g., "check-in requires active membership", "payments support refunds within 30 days")

Format your response as a structured summary organized by resource name. Be concise — this context will be used to enrich feature descriptions in support documentation.

Do NOT classify these as features — they provide context for features identified in the mobile and dashboard scans.`;
