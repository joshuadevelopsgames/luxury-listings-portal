/**
 * Client Portal Isolation
 *
 * Provides utilities for isolating client data in a multi-tenant context.
 * Each client workspace is treated as an isolated tenant, ensuring:
 *   - Client users only see their own workspace data
 *   - Internal/external content boundary is enforced
 *   - Cross-client data leakage is prevented
 *
 * BACKWARD COMPATIBILITY:
 * This is a NEW utility that doesn't modify any existing data structures.
 * Existing code continues to work unchanged. Components that need isolation
 * can opt-in by using these utilities.
 *
 * Data model extension (added to existing client docs):
 *   clients/{clientId}.portalAccess: {
 *     enabled: boolean,
 *     approvalRequired: boolean,        // 'none' | 'optional' | 'required' | 'multi_level'
 *     approvalLevel: string,
 *     portalUsers: [{ email, role, invitedBy, invitedAt }],
 *     sharedLinkEnabled: boolean,        // No-login approval via link
 *     sharedLinkToken: string,
 *   }
 *
 * Workspace model (for future multi-agency):
 *   workspaces/{workspaceId}: {
 *     name: string,
 *     ownerEmail: string,
 *     memberEmails: string[],
 *     clientIds: string[],
 *     createdAt: timestamp,
 *   }
 */

/**
 * Content visibility levels (internal vs external).
 * Content marked as 'internal' is hidden from client portal users.
 */
export const CONTENT_VISIBILITY = {
  INTERNAL: 'internal',         // Only team members can see
  CLIENT_REVIEW: 'client_review', // Visible to client for approval
  PUBLISHED: 'published',       // Publicly visible
};

/**
 * Content approval levels (matching industry patterns from Planable/Hootsuite).
 */
export const APPROVAL_LEVELS = {
  NONE: 'none',                 // No approval needed
  OPTIONAL: 'optional',        // Approvers assigned but not required
  REQUIRED: 'required',        // At least one approver must sign off
  MULTI_LEVEL: 'multi_level',  // Cascading: internal → manager → client
};

/**
 * Content status workflow.
 * Each transition may require different permissions.
 */
export const CONTENT_STATUS = {
  DRAFT: 'draft',
  INTERNAL_REVIEW: 'internal_review',
  CLIENT_REVIEW: 'client_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
};

/**
 * Valid status transitions.
 * Key = current status, value = array of allowed next statuses.
 */
export const STATUS_TRANSITIONS = {
  [CONTENT_STATUS.DRAFT]: [CONTENT_STATUS.INTERNAL_REVIEW, CONTENT_STATUS.SCHEDULED],
  [CONTENT_STATUS.INTERNAL_REVIEW]: [CONTENT_STATUS.DRAFT, CONTENT_STATUS.CLIENT_REVIEW, CONTENT_STATUS.APPROVED, CONTENT_STATUS.REJECTED],
  [CONTENT_STATUS.CLIENT_REVIEW]: [CONTENT_STATUS.INTERNAL_REVIEW, CONTENT_STATUS.APPROVED, CONTENT_STATUS.REJECTED],
  [CONTENT_STATUS.APPROVED]: [CONTENT_STATUS.SCHEDULED, CONTENT_STATUS.DRAFT],
  [CONTENT_STATUS.REJECTED]: [CONTENT_STATUS.DRAFT],
  [CONTENT_STATUS.SCHEDULED]: [CONTENT_STATUS.PUBLISHED, CONTENT_STATUS.DRAFT],
  [CONTENT_STATUS.PUBLISHED]: [], // Terminal state
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(fromStatus, toStatus) {
  const allowed = STATUS_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Get the display label for a content status.
 */
export function getStatusLabel(status) {
  const labels = {
    [CONTENT_STATUS.DRAFT]: 'Draft',
    [CONTENT_STATUS.INTERNAL_REVIEW]: 'Internal Review',
    [CONTENT_STATUS.CLIENT_REVIEW]: 'Client Review',
    [CONTENT_STATUS.APPROVED]: 'Approved',
    [CONTENT_STATUS.REJECTED]: 'Needs Revision',
    [CONTENT_STATUS.SCHEDULED]: 'Scheduled',
    [CONTENT_STATUS.PUBLISHED]: 'Published',
  };
  return labels[status] || status;
}

/**
 * Get the color for a content status (for UI badges).
 */
export function getStatusColor(status) {
  const colors = {
    [CONTENT_STATUS.DRAFT]: 'gray',
    [CONTENT_STATUS.INTERNAL_REVIEW]: 'blue',
    [CONTENT_STATUS.CLIENT_REVIEW]: 'purple',
    [CONTENT_STATUS.APPROVED]: 'green',
    [CONTENT_STATUS.REJECTED]: 'red',
    [CONTENT_STATUS.SCHEDULED]: 'orange',
    [CONTENT_STATUS.PUBLISHED]: 'emerald',
  };
  return colors[status] || 'gray';
}

/**
 * Filter content items by visibility for a given viewer.
 *
 * @param {object[]} items - Content items array
 * @param {object} viewer - The viewing user
 * @param {boolean} viewer.isClientPortalUser - Whether viewing from client portal
 * @param {boolean} viewer.isTeamMember - Whether an internal team member
 * @returns {object[]} Filtered items visible to the viewer
 */
export function filterByVisibility(items, viewer) {
  if (!viewer) return [];

  // Team members see everything
  if (viewer.isTeamMember && !viewer.isClientPortalUser) {
    return items;
  }

  // Client portal users only see items in client_review, approved, scheduled, published
  if (viewer.isClientPortalUser) {
    const clientVisibleStatuses = [
      CONTENT_STATUS.CLIENT_REVIEW,
      CONTENT_STATUS.APPROVED,
      CONTENT_STATUS.SCHEDULED,
      CONTENT_STATUS.PUBLISHED,
    ];
    return items.filter(item =>
      clientVisibleStatuses.includes(item.status) ||
      item.visibility === CONTENT_VISIBILITY.CLIENT_REVIEW ||
      item.visibility === CONTENT_VISIBILITY.PUBLISHED
    );
  }

  return items;
}

/**
 * Tenant-scoped query helper.
 * Ensures all queries include a workspace/client filter.
 *
 * @param {string} clientId - The client workspace ID to scope to
 * @param {object[]} items - Items to filter
 * @returns {object[]} Items belonging to the specified client
 */
export function scopeToClient(clientId, items) {
  if (!clientId) return items;
  return items.filter(item =>
    item.clientId === clientId ||
    item.client_id === clientId ||
    item.workspaceId === clientId
  );
}

/**
 * Generate a random portal access token for shareable approval links.
 */
export function generatePortalToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
