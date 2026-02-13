/**
 * Tenant Scoping for Multi-Agency Support
 *
 * Provides the foundation for multi-tenant architecture where:
 *   - Each agency/organization is a tenant
 *   - Each tenant has its own set of clients, team members, and settings
 *   - A single user can belong to multiple tenants with different roles
 *
 * BACKWARD COMPATIBILITY:
 * The current app operates as a single-tenant system (one agency).
 * This utility adds a default tenant that maps to the existing data,
 * so all existing code continues to work unchanged.
 *
 * When ready to go multi-tenant:
 *   1. Create a `tenants` collection in Firestore
 *   2. Add a `tenantId` field to existing collections (clients, tasks, etc.)
 *   3. Update Firestore rules to include tenantId in queries
 *   4. Use these utilities to scope all operations
 *
 * Hierarchy:
 *   Platform (Super Admin)
 *     → Tenant / Organization (Owner, Admin)
 *       → Client Workspace (Manager, Contributor)
 *         → Social Profile (Publisher, Drafter, Viewer)
 */

/**
 * Default tenant for single-agency mode.
 * All existing data implicitly belongs to this tenant.
 */
export const DEFAULT_TENANT_ID = 'default';

/**
 * Tenant-level roles (distinct from app-level roles).
 */
export const TENANT_ROLES = {
  OWNER: 'tenant_owner',       // Full control over tenant
  ADMIN: 'tenant_admin',       // Manage team, clients, settings
  MANAGER: 'tenant_manager',   // Manage assigned clients
  MEMBER: 'tenant_member',     // Basic access within tenant
  CLIENT: 'tenant_client',     // External client user (portal)
};

/**
 * Get the current tenant context.
 * In single-agency mode, always returns the default tenant.
 * Override this when implementing multi-tenant routing.
 */
export function getCurrentTenantId() {
  // In future: read from URL params, context, or session
  // e.g., /org/abc123/dashboard → tenantId = 'abc123'
  return DEFAULT_TENANT_ID;
}

/**
 * Scope a Firestore query builder to a specific tenant.
 * In single-agency mode, this is a no-op (returns original query).
 *
 * @param {object} query - Firestore query
 * @param {string} tenantId - Tenant ID to scope to
 * @returns {object} Scoped query
 */
export function scopeQuery(query, tenantId = DEFAULT_TENANT_ID) {
  if (tenantId === DEFAULT_TENANT_ID) {
    // Single-agency mode: no scoping needed (all data belongs to default tenant)
    return query;
  }
  // Multi-tenant mode: add .where('tenantId', '==', tenantId)
  // This requires the tenantId field to exist on documents
  return query;
}

/**
 * Add tenant context to a new document before writing.
 *
 * @param {object} docData - Document data to write
 * @param {string} tenantId - Tenant ID
 * @returns {object} Document with tenantId added
 */
export function addTenantContext(docData, tenantId = DEFAULT_TENANT_ID) {
  if (tenantId === DEFAULT_TENANT_ID) {
    // Single-agency mode: don't add tenantId to avoid breaking existing queries
    return docData;
  }
  return {
    ...docData,
    tenantId,
  };
}

/**
 * Tenant configuration template.
 * When creating a new tenant, use this as the default structure.
 */
export const TENANT_TEMPLATE = {
  name: '',
  slug: '',                     // URL-friendly identifier
  ownerEmail: '',
  plan: 'starter',              // starter, professional, enterprise
  settings: {
    approvalWorkflow: 'required', // none, optional, required, multi_level
    clientPortalEnabled: false,
    maxUsers: 10,
    maxClients: 50,
    brandColor: '#0071e3',
    logoUrl: '',
  },
  members: [],                  // [{ email, role, joinedAt }]
  clientIds: [],                // References to clients collection
  createdAt: null,
  updatedAt: null,
};

/**
 * Check if the app is running in multi-tenant mode.
 */
export function isMultiTenantEnabled() {
  // Future: read from system_config/features or environment variable
  return false;
}

/**
 * Get the tenant-specific permission for a user.
 * In single-agency mode, maps to existing role system.
 *
 * @param {string} userEmail
 * @param {string} tenantId
 * @returns {string} Tenant role
 */
export function getTenantRole(userEmail, tenantId = DEFAULT_TENANT_ID) {
  if (tenantId === DEFAULT_TENANT_ID) {
    // In single-agency mode, tenant role = app role
    return null; // Let the existing role system handle it
  }
  // Future: look up tenant membership
  return TENANT_ROLES.MEMBER;
}
