// Secure API Keys Configuration
// All API keys should be stored in environment variables
// Never commit actual keys to git

export const API_KEYS = {
  // Google Sheets API Key (for read operations)
  GOOGLE_SHEETS_API_KEY: process.env.REACT_APP_GOOGLE_SHEETS_API_KEY || '',
  
  // Google Drive API Key (for file operations)
  GOOGLE_DRIVE_API_KEY: process.env.REACT_APP_GOOGLE_DRIVE_API_KEY || '',
  
  // ImgBB API Key (for image uploads)
  IMGBB_API_KEY: process.env.REACT_APP_IMGBB_API_KEY || '1e52042b16f9d095084295e32d073030',
  
  // OpenAI API Key (for AI features)
  OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
};

// Google Sheets Configuration
export const GOOGLE_SHEETS_CONFIG = {
  SPREADSHEET_ID: process.env.REACT_APP_GOOGLE_SHEETS_SPREADSHEET_ID || '1QDxr6nxOEQskXIciEeZiZBlVE-lMkGN875k8bBtKSEA',
  SHEET_NAME: 'Client Packages',
  GOOGLE_APPS_SCRIPT_URL: process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbx4ugw4vME8hCeaE3Bieu7gsrNJqbGHxkNwZR97vKi0wVbaQNMgGFnG3W-lKrkwXzFkdQ/exec',
};

// Google Drive Configuration
export const GOOGLE_DRIVE_CONFIG = {
  CONTRACTS_FOLDER_ID: process.env.REACT_APP_GOOGLE_DRIVE_CONTRACTS_FOLDER_ID || '',
  CONTRACTS_FOLDER_NAME: 'Client Contracts',
};

// Validate that required API keys are present
export const validateApiKeys = () => {
  const warnings = [];
  
  if (!API_KEYS.GOOGLE_SHEETS_API_KEY) {
    warnings.push('REACT_APP_GOOGLE_SHEETS_API_KEY is not set');
  }
  
  if (!API_KEYS.GOOGLE_DRIVE_API_KEY && !GOOGLE_DRIVE_CONFIG.CONTRACTS_FOLDER_ID) {
    warnings.push('REACT_APP_GOOGLE_DRIVE_API_KEY or CONTRACTS_FOLDER_ID is not set');
  }
  
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ API Key Warnings:', warnings);
    console.warn('💡 Create a .env.local file with your API keys');
  }
  
  return warnings.length === 0;
};

