// Google Sheets API Configuration
// To enable real Google Sheets integration:

// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Create a new project or select existing one
// 3. Enable Google Sheets API
// 4. Create credentials (API Key)
// 5. Restrict the API key to only Google Sheets API
// 6. Replace 'your_api_key_here' below with your actual API key

export const GOOGLE_SHEETS_CONFIG = {
  SPREADSHEET_ID: '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g',
  SHEET_NAME: 'Social Media Packages',
  SHEET_GID: '802756732',
  API_KEY: 'AIzaSyDxiQTlAv1UHxGYRXaZvxi2HulXBHTca3E',
  
  // Column mappings based on your Social Media Packages tab structure
  COLUMNS: {
    CLIENT_NAME: 0,        // Column A - Client Name
    PACKAGE_TYPE: 1,       // Column B - Package Type
    EMAIL: 2,              // Column C - Email
    DATE_ADDED: 3,         // Column D - Date Added
    POSTED_ON: 4,          // Column E - Posted On (Page)
    PAYMENT_STATUS: 5,     // Column F - Payment Status
    SALES_STAGE: 6,        // Column G - Sales Stage
    APPROVAL_STATUS: 7,    // Column H - Approval Status
    NOTES: 8,              // Column I - Notes
    STATUS_CHANGE_DATE: 9, // Column J - Status Change Date
    PACKAGE_SIZE: 10,      // Column K - Package Size
    POSTS_USED: 11,       // Column L - Posts Used
    LAST_POST_DATE: 12,    // Column M - Last Post Date
    POSTS_REMAINING: 13,  // Column N - Posts Remaining
    PACKAGE_COMPLETED: 14, // Column O - Package Completed
    APPROVAL_EMAIL: 15,    // Column P - Approval Email Recipient
    PRICE_PAID: 16,       // Column Q - Price Paid (USD)
    TALLY: 17,            // Column R - Tally
    POST_INSIGHTS: 18     // Column S - Post Insights Sent
  }
};

// API endpoints
export const GOOGLE_SHEETS_API = {
  BASE_URL: 'https://sheets.googleapis.com/v4/spreadsheets',
  VALUES_ENDPOINT: (spreadsheetId, sheetName, apiKey) => 
    `${GOOGLE_SHEETS_API.BASE_URL}/${spreadsheetId}/values/${sheetName}?key=${apiKey}`
};
