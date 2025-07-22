# Builder.io Smartling Integration Plugin

A comprehensive integration that connects Builder.io content with Smartling's translation management platform, enabling seamless content localization workflows.

## Installation

1. From the Builder.io plugins tab, select `smartling`
2. Configure your Smartling project credentials (see Configuration section below)

## Configuration

The plugin requires project-level API credentials for secure, isolated access:

### Required Settings
- **Project ID**: Your Smartling project ID (limits access to a single project)
- **User ID**: Your Smartling user ID for API access
- **User Secret**: Your Smartling user secret for API authentication

### Optional Settings
- **Authorize Smartling Jobs through Builder**: Auto-authorize jobs when sent to Smartling (default: true)
- **Copy Locales from Smartling to Builder**: Sync target locales from Smartling to Builder (default: true)

## Key Features

### 🚀 Direct Smartling Job Integration
- Create new Smartling jobs directly from Builder
- Add content to existing Smartling jobs
- No local job management - works directly with Smartling API v2

### 📊 Job Management Dashboard
- View all translation jobs with real-time status updates
- Track progress across multiple content items and locales
- Access complete job activity timelines
- Direct links to view jobs in Smartling dashboard

### ⚡ Real-time Updates
- Server-Sent Events (SSE) for live status updates
- Webhook integration for automatic status synchronization
- Visual indicators for real-time connection status

### 🎯 Streamlined Workflow
- Single-click content translation
- Bulk translation operations
- Project-scoped operations (no account-level access needed)

## Content Translation Workflow

### What Gets Translated
- **Text Elements**: All text components in Builder content
- **Custom Fields**: Content fields marked as `localized`
- **Exclusions**: Right-click any text element and select "Exclude from future translations"

### Translation Process

#### 1. Send Content for Translation
**Single Content:**
- Open any content item
- Click "Send for Translation" in the content actions menu
- Choose to create a new job or add to an existing job

**Bulk Translation:**
- Select multiple content items from the content list
- Click "Send for Translation" in the bulk actions menu
- Configure job settings in the job selector dialog

#### 2. Job Selection Interface
- **Create New Job**: Enter job name and optional description
- **Add to Existing Job**: Select from active Smartling jobs in your project
- **Target Locales**: Automatically configured based on project settings

#### 3. Monitor Progress
- Use "View All Translation Jobs" to access the job management dashboard
- Track real-time status updates and progress
- View detailed content breakdowns and activity timelines

#### 4. Apply Translations
- Translations are automatically applied via webhooks when completed
- Manual application available through "Apply Translation" action
- Content metadata tracks translation status and job references

## Content Actions

### Available Actions
- **Send for Translation**: Add content to Smartling jobs
- **Request Updated Translation**: Update content in existing jobs
- **Apply Translation**: Apply completed translations to content
- **View All Translation Jobs**: Open job management dashboard
- **View Translation Strings in Smartling**: Direct link to Smartling dashboard
- **Remove from Translation Job**: Remove content from jobs

### Context Menu Actions
- **Exclude from Future Translations**: Mark text elements to skip
- **Include in Future Translations**: Re-enable translation for excluded elements

## Job Management Dashboard

### Features
- **Job Overview Table**: Status, progress, target locales, and timestamps
- **Real-time Updates**: Live status changes via webhooks and SSE
- **Progress Tracking**: Visual progress bars and completion percentages
- **Job Details**: Detailed view of content items and locale-specific progress
- **Activity Timeline**: Complete history of job events and updates
- **Smartling Integration**: One-click access to jobs in Smartling dashboard

### Status Indicators
- **Pending**: Job created, awaiting translation
- **In Progress**: Translation work in progress
- **Completed**: All translations finished
- **Cancelled**: Job cancelled or stopped

## API Integration

### Endpoints Used
- `/api/v2/smartling/batch/create` - Create new translation jobs
- `/api/v2/smartling/jobs/status/all` - Get job status overview
- `/api/v2/smartling/jobs/{jobUid}/status/detailed` - Detailed job status
- `/api/v2/smartling/jobs/{jobUid}/activity` - Job activity timeline
- `/api/v2/smartling/jobs/status/stream` - Real-time status updates (SSE)
- `/api/v2/smartling/webhook/events` - Webhook event handling

### Security & Isolation
- **Project-Level Access**: Each Builder space limited to one Smartling project
- **No Account Access**: Plugin cannot access other projects in your account
- **Secure Authentication**: User-level API credentials with project scope
- **Isolated Operations**: Teams cannot interfere with each other's translations

## Troubleshooting

### Common Issues

**"No translation jobs found"**
- Ensure you have created translation jobs using the plugin
- Check that your API credentials are configured correctly

**"Unable to open Smartling"**
- Verify your Project ID is configured in plugin settings
- Ensure you have access to the Smartling project

**Real-time updates not working**
- Check browser console for SSE connection errors
- Verify webhook endpoints are accessible
- Confirm API key permissions

### Content Not Translating
- Ensure content is published (drafts cannot be translated)
- Check that text elements are not excluded from translation
- Verify target locales are configured in your Smartling project

## Migration from Legacy Version

If upgrading from a previous version that used local translation jobs:

1. **Existing Jobs**: Legacy local jobs will continue to work
2. **New Workflow**: Use "Send for Translation" for new content
3. **Job Management**: Access the new dashboard via "View All Translation Jobs"
4. **Direct Integration**: New jobs work directly with Smartling (no local job model)

## Support

For issues specific to this plugin:
- Check the job management dashboard for detailed status information
- Review browser console for API errors
- Verify Smartling project configuration and permissions

For Smartling-specific questions:
- Consult [Smartling Documentation](https://help.smartling.com/)
- Contact Smartling Support for platform issues