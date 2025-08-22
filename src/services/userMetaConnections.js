// User Meta Connections Service
// Manages individual user connections to Instagram and Facebook

import { firestoreService } from './firestoreService';

class UserMetaConnections {
  constructor() {
    this.collection = 'user_meta_connections';
  }

  // Save user's Meta connection data
  async saveUserConnection(userEmail, connectionData) {
    try {
      const connection = {
        userEmail,
        accessToken: connectionData.accessToken,
        instagramBusinessAccountId: connectionData.instagramBusinessAccountId,
        facebookPageId: connectionData.facebookPageId,
        instagramUsername: connectionData.instagramUsername,
        facebookPageName: connectionData.facebookPageName,
        connectedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        isActive: true
      };

      await firestoreService.saveDocument(this.collection, userEmail, connection);
      console.log('✅ User Meta connection saved:', userEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save user Meta connection:', error);
      throw error;
    }
  }

  // Get user's Meta connection data
  async getUserConnection(userEmail) {
    try {
      const connection = await firestoreService.getDocument(this.collection, userEmail);
      if (connection && connection.isActive) {
        // Update last used timestamp
        await this.updateLastUsed(userEmail);
        return connection;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get user Meta connection:', error);
      return null;
    }
  }

  // Update last used timestamp
  async updateLastUsed(userEmail) {
    try {
      await firestoreService.updateDocument(this.collection, userEmail, {
        lastUsed: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to update last used timestamp:', error);
    }
  }

  // Check if user has active Meta connection
  async hasActiveConnection(userEmail) {
    try {
      const connection = await this.getUserConnection(userEmail);
      return !!connection;
    } catch (error) {
      console.error('❌ Failed to check user connection status:', error);
      return false;
    }
  }

  // Disconnect user's Meta account
  async disconnectUser(userEmail) {
    try {
      await firestoreService.updateDocument(this.collection, userEmail, {
        isActive: false,
        disconnectedAt: new Date().toISOString()
      });
      console.log('✅ User Meta connection disconnected:', userEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to disconnect user Meta connection:', error);
      throw error;
    }
  }

  // Get connection status for user
  async getConnectionStatus(userEmail) {
    try {
      const connection = await this.getUserConnection(userEmail);
      if (!connection) {
        return {
          isConnected: false,
          hasInstagram: false,
          hasFacebook: false,
          instagramUsername: null,
          facebookPageName: null
        };
      }

      return {
        isConnected: true,
        hasInstagram: !!connection.instagramBusinessAccountId,
        hasFacebook: !!connection.facebookPageId,
        instagramUsername: connection.instagramUsername,
        facebookPageName: connection.facebookPageName,
        connectedAt: connection.connectedAt,
        lastUsed: connection.lastUsed
      };
    } catch (error) {
      console.error('❌ Failed to get connection status:', error);
      return {
        isConnected: false,
        hasInstagram: false,
        hasFacebook: false,
        instagramUsername: null,
        facebookPageName: null
      };
    }
  }

  // Get all active connections (for admin purposes)
  async getAllActiveConnections() {
    try {
      const connections = await firestoreService.getCollection(this.collection);
      return connections.filter(conn => conn.isActive);
    } catch (error) {
      console.error('❌ Failed to get all active connections:', error);
      return [];
    }
  }

  // Refresh user's access token (if needed)
  async refreshUserToken(userEmail, newTokenData) {
    try {
      await firestoreService.updateDocument(this.collection, userEmail, {
        accessToken: newTokenData.accessToken,
        tokenExpiresAt: newTokenData.expiresIn ? 
          new Date(Date.now() + newTokenData.expiresIn * 1000).toISOString() : null,
        lastRefreshed: new Date().toISOString()
      });
      console.log('✅ User Meta token refreshed:', userEmail);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to refresh user token:', error);
      throw error;
    }
  }

  // Check if token is expired
  isTokenExpired(connection) {
    if (!connection.tokenExpiresAt) return false;
    return new Date() > new Date(connection.tokenExpiresAt);
  }

  // Get valid connection data for API calls
  async getValidConnection(userEmail) {
    try {
      const connection = await this.getUserConnection(userEmail);
      if (!connection) {
        throw new Error('No Meta connection found for user');
      }

      if (this.isTokenExpired(connection)) {
        throw new Error('Meta access token has expired. User needs to reconnect.');
      }

      return {
        accessToken: connection.accessToken,
        instagramBusinessAccountId: connection.instagramBusinessAccountId,
        facebookPageId: connection.facebookPageId
      };
    } catch (error) {
      console.error('❌ Failed to get valid connection:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const userMetaConnections = new UserMetaConnections();
export default userMetaConnections;


