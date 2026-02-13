/**
 * Permission Enforcement Service
 *
 * Client-side service that calls server-side Cloud Functions
 * to validate permissions before sensitive operations.
 *
 * BACKWARD COMPATIBILITY: This is an opt-in layer. Existing code continues
 * to work with direct Firestore writes. Components can adopt server-side
 * validation gradually by calling validateBeforeWrite() before writes.
 *
 * Usage:
 *   import { permissionEnforcement } from './permissionEnforcementService';
 *   const { allowed, reason } = await permissionEnforcement.validateBeforeWrite('clients', 'create');
 *   if (!allowed) { toast.error(reason); return; }
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

let _validatePermissionFn = null;
let _updateUserPermissionsFn = null;

function getValidatePermissionFn() {
  if (!_validatePermissionFn) {
    _validatePermissionFn = httpsCallable(getFunctions(), 'validatePermission');
  }
  return _validatePermissionFn;
}

function getUpdateUserPermissionsFn() {
  if (!_updateUserPermissionsFn) {
    _updateUserPermissionsFn = httpsCallable(getFunctions(), 'updateUserPermissions');
  }
  return _updateUserPermissionsFn;
}

export const permissionEnforcement = {
  /**
   * Validate that the current user has permission to write to a collection.
   * @param {string} targetCollection - Firestore collection name
   * @param {string} action - Action type ('create', 'update', 'delete')
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async validateBeforeWrite(targetCollection, action = 'write') {
    try {
      const result = await getValidatePermissionFn()({
        action,
        targetCollection,
      });
      return result.data;
    } catch (error) {
      console.error('Permission validation error:', error);
      // On error, allow the operation (Firestore rules will still enforce)
      // This prevents the enforcement layer from blocking legitimate operations
      // if the Cloud Function is temporarily unavailable
      return { allowed: true, reason: 'Validation unavailable, relying on Firestore rules' };
    }
  },

  /**
   * Update user permissions via Cloud Function (admin-only, server-enforced).
   * @param {object} params
   * @param {string} params.targetEmail - User email to update
   * @param {string[]} [params.pages] - Page permissions
   * @param {string[]} [params.features] - Feature permissions
   * @param {boolean} [params.adminPermissions] - Admin permissions flag
   * @param {string} [params.role] - New role
   * @returns {Promise<{ok: boolean}>}
   */
  async updateUserPermissions({ targetEmail, pages, features, adminPermissions, role }) {
    try {
      const result = await getUpdateUserPermissionsFn()({
        targetEmail,
        pages,
        features,
        adminPermissions,
        role,
      });
      return result.data;
    } catch (error) {
      console.error('Permission update error:', error);
      throw error;
    }
  },
};
