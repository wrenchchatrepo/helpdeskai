# HelpDesk - Google Workspace Support Management System

A comprehensive support management system built with Google Apps Script, designed to handle customer support requests through multiple channels (email, Slack, Google Chat) and provide a unified interface for managing support cards.

## Features

- **Multi-Channel Support**
  - Email integration through HubDesk
  - Slack integration for real-time communication
  - Google Chat integration for workspace users
  - Google Meet integration for video calls

- **Card-Based System**
  - Customer cards for storing contact information
  - Issue cards for tracking support requests
  - Automatic linking between related cards
  - File attachments support

- **Google Workspace Integration**
  - Google Calendar for scheduling meetings
  - Google Drive for file storage
  - BigQuery for data storage and analytics
  - Cloud Storage for attachments

- **Security & Authentication**
  - Google Workspace authentication
  - Domain-based access control
  - Role-based permissions
  - Secure file handling

## Prerequisites

1. Google Workspace account with admin privileges
2. Google Cloud project with the following APIs enabled:
   - Google Apps Script API
   - BigQuery API
   - Cloud Storage API
   - Gmail API
   - Google Calendar API
   - Google Chat API

3. Development tools:
   - Node.js (>= 14.0.0)
   - npm or yarn
   - clasp (Google Apps Script CLI)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/wrenchchatrepo/lookerhelp.git
   cd lookerhelp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Login to Google:
   ```bash
   npm run login
   ```

4. Create a new Apps Script project:
   ```bash
   npm run create
   ```

5. Configure the project:
   - Copy `config.example.js` to `config.js`
   - Update configuration values
   - Set up OAuth credentials in Google Cloud Console
   - Configure BigQuery dataset and tables
   - Set up Cloud Storage bucket

6. Deploy the application:
   ```bash
   npm run deploy
   ```

## Configuration

### Required Script Properties

Set these in the Google Apps Script project settings:

- `OAUTH_CLIENT_ID`: OAuth 2.0 client ID
- `OAUTH_CLIENT_SECRET`: OAuth 2.0 client secret
- `PROJECT_ID`: Google Cloud project ID
- `STORAGE_BUCKET`: Cloud Storage bucket name

### Optional Integrations

1. **Slack Integration**
   - Create a Slack app
   - Configure webhook URLs
   - Set up OAuth permissions

2. **Email Integration (HubDesk)**
   - Configure email forwarding
   - Set up HubDesk integration
   - Configure email processing rules

## Usage

### Managing Cards

1. **Creating Cards**
   - Customer cards are created automatically from Google Groups
   - Issue cards are created when support requests are received
   - Manual card creation is available through the web interface

2. **Updating Cards**
   - Add comments and updates through any integrated channel
   - Attach files (images, documents, etc.)
   - Update status and labels

3. **Viewing Cards**
   - Access the web interface at your deployed URL
   - Filter and search cards
   - View statistics and reports

### Administration

1. **User Management**
   - Control access permissions
   - Manage user roles
   - Monitor user activity

2. **System Settings**
   - Configure notification preferences
   - Set up automation rules
   - Manage integrations

3. **Maintenance**
   - Monitor system health
   - View logs and analytics
   - Perform cleanup tasks

## Development

### Project Structure

```
src/
├── App.js                 # Main application entry point
├── AuthManager.js         # Authentication management
├── CardManager.js         # Card CRUD operations
├── DatabaseManager.js     # BigQuery interactions
├── LogManager.js          # Logging functionality
├── NotificationManager.js # Notification handling
├── SettingsManager.js     # Settings management
├── StorageManager.js      # File storage operations
├── Utils.js              # Utility functions
└── templates/            # HTML templates
    ├── home.html         # Home page template
    ├── cards.html        # Cards view template
    ├── admin.html        # Admin interface template
    └── ...               # Other templates
```

### Available Scripts

- `npm run push`: Push changes to Apps Script
- `npm run watch`: Watch for changes and push automatically
- `npm run deploy`: Deploy a new version
- `npm run open`: Open the script in the Apps Script editor
- `npm run logs`: View Apps Script logs
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify OAuth configuration
   - Check domain restrictions
   - Ensure proper scopes are enabled

2. **Storage Issues**
   - Verify Cloud Storage permissions
   - Check quota limits
   - Ensure proper file paths

3. **Integration Problems**
   - Verify API credentials
   - Check webhook configurations
   - Monitor API quotas

### Getting Help

- Check the logs using `npm run logs`
- Review the [Technical Documentation](docs/TECHNICAL_SPEC.md)
- Contact support@wrench.chat

## Contributing

This is an internal tool for wrench.chat. For questions or support, contact support@wrench.chat.

## License

Proprietary software. All rights reserved.
