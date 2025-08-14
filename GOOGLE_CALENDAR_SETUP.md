# Google Calendar Integration Setup

## Overview
The HR Calendar page now includes Google Calendar integration, allowing HR managers to:
- View team events and meetings from Google Calendar
- See leave requests alongside calendar events
- Sync calendar data in real-time
- Manage team schedules more effectively

## Features Added

### 📅 **Calendar Component**
- Monthly calendar view with navigation
- Event display with color coding by type
- Click interactions for dates and events
- Responsive design for all screen sizes

### 🔗 **Google Calendar Service**
- Full Google Calendar API integration
- Event creation, updating, and deletion
- Automatic event categorization
- Real-time synchronization

### 🎯 **Event Types**
- **Leave Events**: Vacation and sick leave requests
- **Meeting Events**: Team meetings and 1:1s
- **Training Events**: Workshops and seminars
- **HR Events**: Interviews and hiring activities

## Setup Instructions

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins

### 2. Environment Variables
Create a `.env` file in your project root:
```env
REACT_APP_GOOGLE_API_KEY=your_api_key_here
REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
```

### 3. API Permissions
Ensure your Google Cloud project has these APIs enabled:
- Google Calendar API
- Google+ API (for authentication)

### 4. OAuth Consent Screen
Configure the OAuth consent screen with:
- Application name
- User support email
- Developer contact information
- Scopes: `https://www.googleapis.com/auth/calendar.readonly`

## Usage

### 🔌 **Connecting to Google Calendar**
1. Click "Connect" button in the Google Calendar status card
2. Authorize the application in Google's OAuth flow
3. Calendar events will automatically sync

### 📊 **Calendar View**
- Navigate between months with arrow buttons
- Click on dates to select them
- Click on events to view details
- Events are color-coded by type

### 🔄 **Syncing Calendar**
- Use "Sync Calendar" button to refresh data
- Events update automatically when connected
- Leave requests are integrated with calendar view

## Event Categories

| Type | Color | Description | Examples |
|------|-------|-------------|----------|
| Leave | 🟡 Yellow | Time off requests | Vacation, Sick leave |
| Meeting | 🔵 Blue | Team gatherings | 1:1s, Reviews, Standups |
| Training | 🟢 Green | Learning activities | Workshops, Seminars |
| HR | 🟣 Purple | HR activities | Interviews, Hiring |

## Technical Details

### **Calendar Component**
- React-based calendar grid
- Responsive design with Tailwind CSS
- Event filtering and categorization
- Date selection and navigation

### **Google Calendar Service**
- RESTful API integration
- OAuth 2.0 authentication
- Event CRUD operations
- Automatic error handling

### **Data Flow**
1. User connects Google Calendar
2. Service fetches events via API
3. Events are categorized and formatted
4. Calendar component displays combined data
5. Real-time updates when events change

## Troubleshooting

### **Common Issues**
- **Authentication Failed**: Check OAuth credentials and scopes
- **Events Not Loading**: Verify API key and client ID
- **Permission Denied**: Ensure proper OAuth consent screen setup

### **Debug Steps**
1. Check browser console for errors
2. Verify environment variables are loaded
3. Test Google Calendar API access
4. Check OAuth consent screen configuration

## Future Enhancements

### **Planned Features**
- Event creation from HR Calendar
- Team calendar sharing
- Automated leave request processing
- Calendar export functionality
- Mobile app integration

### **Advanced Features**
- Recurring event support
- Calendar conflict detection
- Team availability tracking
- Integration with other HR systems

## Security Notes

- API keys are stored in environment variables
- OAuth tokens are handled securely
- Calendar data is read-only by default
- User consent is required for access

## Support

For technical support with Google Calendar integration:
1. Check Google Cloud Console logs
2. Verify API quotas and limits
3. Review OAuth consent screen settings
4. Test with Google's API explorer

---

**Note**: This integration requires proper Google Cloud Console setup and OAuth 2.0 configuration. Follow the setup instructions carefully to ensure proper functionality.
