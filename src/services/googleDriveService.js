// Google Drive Service
// Handles automatic folder access management for new users

import { GOOGLE_SHEETS_CONFIG, GOOGLE_DRIVE_CONFIG } from '../config/apiKeys';

class GoogleDriveService {
  constructor() {
    this.googleAppsScriptUrl = GOOGLE_SHEETS_CONFIG.GOOGLE_APPS_SCRIPT_URL;
    this.contractsFolderId = GOOGLE_DRIVE_CONFIG.CONTRACTS_FOLDER_ID || '1ld1rW8eTnWth2UDfRBrqGywZzsEPOJJw';
  }

  /**
   * Grant access to contracts folder for a user
   * @param {string} email - User's email address
   * @param {string} role - User's role (determines access level)
   * @returns {Promise<Object>} - Result of the operation
   */
  async grantFolderAccess(email, role) {
    try {
      // Determine access level based on role
      let accessLevel = 'viewer'; // Default to viewer
      
      // Social Media Managers and Admins get editor access
      if (role === 'social_media_manager' || role === 'admin') {
        accessLevel = 'writer'; // Editor access
      }
      // Content Directors get viewer access
      else if (role === 'content_director') {
        accessLevel = 'reader'; // Viewer access
      }
      // All other roles don't get access by default
      else {
        console.log(`⚠️ Role "${role}" does not need folder access, skipping`);
        return { success: true, skipped: true, message: `Role "${role}" does not need folder access` };
      }

      console.log(`🔐 Granting ${accessLevel} access to ${email} for folder ${this.contractsFolderId}`);

      // Call Google Apps Script to grant access
      const params = new URLSearchParams({
        action: 'grantDriveFolderAccess',
        email: email,
        folderId: this.contractsFolderId,
        accessLevel: accessLevel
      });

      const response = await fetch(`${this.googleAppsScriptUrl}?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Apps Script error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to grant folder access');
      }

      console.log(`✅ Successfully granted ${accessLevel} access to ${email}`);
      return {
        success: true,
        email: email,
        accessLevel: accessLevel,
        message: `Granted ${accessLevel} access to ${email}`
      };
    } catch (error) {
      console.error('❌ Error granting folder access:', error);
      // Don't throw - folder access is not critical for user creation
      // Just log the error and continue
      return {
        success: false,
        error: error.message,
        message: `Failed to grant folder access: ${error.message}`
      };
    }
  }

  /**
   * Revoke access from contracts folder for a user
   * @param {string} email - User's email address
   * @returns {Promise<Object>} - Result of the operation
   */
  async revokeFolderAccess(email) {
    try {
      console.log(`🔐 Revoking access from ${email} for folder ${this.contractsFolderId}`);

      const params = new URLSearchParams({
        action: 'revokeDriveFolderAccess',
        email: email,
        folderId: this.contractsFolderId
      });

      const response = await fetch(`${this.googleAppsScriptUrl}?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Apps Script error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke folder access');
      }

      console.log(`✅ Successfully revoked access from ${email}`);
      return {
        success: true,
        email: email,
        message: `Revoked access from ${email}`
      };
    } catch (error) {
      console.error('❌ Error revoking folder access:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to revoke folder access: ${error.message}`
      };
    }
  }

  /**
   * Update access level for a user
   * @param {string} email - User's email address
   * @param {string} newRole - User's new role
   * @returns {Promise<Object>} - Result of the operation
   */
  async updateFolderAccess(email, newRole) {
    try {
      // First revoke existing access, then grant new access
      await this.revokeFolderAccess(email);
      return await this.grantFolderAccess(email, newRole);
    } catch (error) {
      console.error('❌ Error updating folder access:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update folder access: ${error.message}`
      };
    }
  }
}

export const googleDriveService = new GoogleDriveService();
export default googleDriveService;

