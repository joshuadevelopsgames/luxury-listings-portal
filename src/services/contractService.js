// Contract Management Service
// Handles contract file uploads to Google Drive and metadata storage in Google Sheets

import { API_KEYS, GOOGLE_SHEETS_CONFIG, GOOGLE_DRIVE_CONFIG } from '../config/apiKeys';
import { firestoreService } from './firestoreService';

class ContractService {
  constructor() {
    this.collections = {
      CONTRACTS: 'client_contracts'
    };
  }

  /**
   * Upload contract file to Google Drive
   * @param {File} file - The contract file to upload
   * @param {string} clientId - The client ID
   * @param {string} contractName - Name of the contract
   * @returns {Promise<string>} - Google Drive file ID
   */
  async uploadContractToDrive(file, clientId, contractName) {
    try {
      // Use Google Apps Script for secure server-side upload
      // This avoids exposing API keys in client-side code
      const formData = new FormData();
      formData.append('action', 'uploadContract');
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('contractName', contractName);
      formData.append('folderName', GOOGLE_DRIVE_CONFIG.CONTRACTS_FOLDER_NAME);

      const response = await fetch(GOOGLE_SHEETS_CONFIG.GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload contract: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return {
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        webViewLink: result.webViewLink
      };
    } catch (error) {
      console.error('Error uploading contract to Drive:', error);
      throw error;
    }
  }

  /**
   * Save contract metadata to Firestore
   * @param {Object} contractData - Contract metadata
   * @returns {Promise<string>} - Contract document ID
   */
  async saveContractMetadata(contractData) {
    try {
      const contractId = await firestoreService.addContract(contractData);
      console.log('✅ Contract metadata saved:', contractId);
      return contractId;
    } catch (error) {
      console.error('Error saving contract metadata:', error);
      throw error;
    }
  }

  /**
   * Add contract to Google Sheets (optional, for backup/viewing)
   * @param {Object} contractData - Contract data to add
   */
  async addContractToSheets(contractData) {
    try {
      // Use Google Apps Script to add contract row to sheets
      const params = new URLSearchParams({
        action: 'addContract',
        contractData: JSON.stringify({
          clientName: contractData.clientName,
          clientEmail: contractData.clientEmail,
          contractName: contractData.contractName,
          contractType: contractData.contractType,
          startDate: contractData.startDate,
          endDate: contractData.endDate,
          packageType: contractData.contractDetails?.packageType,
          monthlyPosts: contractData.contractDetails?.monthlyPosts,
          price: contractData.contractDetails?.price,
          driveFileUrl: contractData.driveFileUrl,
          driveFileId: contractData.driveFileId
        })
      });

      const response = await fetch(`${GOOGLE_SHEETS_CONFIG.GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`);
      
      if (!response.ok) {
        console.warn('Failed to add contract to Sheets, but continuing...');
        return { success: false };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('Error adding contract to Sheets:', error);
      // Don't throw - Sheets is optional backup
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new contract
   * @param {File} file - Contract file
   * @param {Object} contractData - Contract metadata
   * @returns {Promise<Object>} - Created contract
   */
  async createContract(file, contractData) {
    try {
      // 1. Upload file to Google Drive
      const driveResult = await this.uploadContractToDrive(
        file,
        contractData.clientId,
        contractData.contractName
      );

      // 2. Prepare contract metadata
      const fullContractData = {
        ...contractData,
        driveFileId: driveResult.fileId,
        driveFileUrl: driveResult.fileUrl,
        webViewLink: driveResult.webViewLink,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: 'active'
      };

      // 3. Save to Firestore
      const contractId = await this.saveContractMetadata(fullContractData);

      // 4. Optionally add to Google Sheets (for backup/viewing)
      await this.addContractToSheets({
        ...fullContractData,
        id: contractId
      });

      return {
        id: contractId,
        ...fullContractData
      };
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  }

  /**
   * Get contracts for a client
   * @param {string} clientId - Client ID
   * @returns {Promise<Array>} - List of contracts
   */
  async getClientContracts(clientId) {
    try {
      return await firestoreService.getContractsByClient(clientId);
    } catch (error) {
      console.error('Error getting client contracts:', error);
      return [];
    }
  }

  /**
   * Get contract by ID
   * @param {string} contractId - Contract ID
   * @returns {Promise<Object>} - Contract data
   */
  async getContract(contractId) {
    try {
      return await firestoreService.getContractById(contractId);
    } catch (error) {
      console.error('Error getting contract:', error);
      throw error;
    }
  }

  /**
   * Update contract metadata
   * @param {string} contractId - Contract ID
   * @param {Object} updates - Fields to update
   */
  async updateContract(contractId, updates) {
    try {
      await firestoreService.updateContract(contractId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating contract:', error);
      throw error;
    }
  }

  /**
   * Delete contract
   * @param {string} contractId - Contract ID
   */
  async deleteContract(contractId) {
    try {
      await firestoreService.deleteContract(contractId);
    } catch (error) {
      console.error('Error deleting contract:', error);
      throw error;
    }
  }
}

export const contractService = new ContractService();
export default contractService;

