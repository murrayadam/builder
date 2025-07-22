# Smartling Plugin Development Setup

This guide explains how to test the Smartling plugin against the new v2 API found in `builder-internal`.

## Prerequisites

1. Clone `builder-internal` as a sibling directory to this repo:
   ```
   repos/
   ├── builder/              (this repo)
   └── builder-internal/     (cloned repo with v2 API)
   ```

2. Ensure the v2 API file exists at:
   `builder-internal/packages/api/src/smartling.ts`

## Quick Start

1. **Run the development setup script:**
   ```bash
   node dev-server.js
   ```

2. **Start the builder-internal API server:**
   ```bash
   cd ../builder-internal
   npm install
   npm run dev  # or whatever command starts the API server
   ```

3. **Start the plugin in development mode:**
   ```bash
   npm run start
   ```

4. **Test in Builder with local API:**
   - Add `?smartling-dev=true` to any Builder URL
   - Or run Builder on `localhost` (auto-detected)

## How It Works

### Automatic API Detection

The plugin automatically detects when to use the local v2 API based on:
- `NODE_ENV === 'development'`
- Running on `localhost`
- URL parameter `smartling-dev=true`

### API Switching

- **Development mode**: Uses `http://localhost:3000/api/v2/smartling/`
- **Production mode**: Uses the normal Builder API endpoints

### Fallback Behavior

The plugin includes fallback logic:
1. Try v2 API methods first
2. If v2 methods fail, fallback to v1 API methods
3. This ensures compatibility during development

## Files Changed for Development

### `src/smartling-dev.ts`
- Development version of SmartlingApi
- Overrides base URL to point to localhost:3000
- Adds new v2 API methods
- Provides factory function to choose API version

### `src/plugin.tsx`
- Uses `createSmartlingApi()` instead of `new SmartlingApi()`
- Automatically switches between v1 and v2 APIs

### `src/simple-dashboard.tsx`
- Includes fallback logic for API methods
- Tries v2 methods first, falls back to v1

## Testing Different Scenarios

### Test v2 API Only
Add this to URL: `?smartling-dev=true`

### Test Fallback Behavior
1. Start plugin in dev mode
2. Stop the builder-internal server
3. Plugin should fallback to v1 API gracefully

### Test Production API
Remove `?smartling-dev=true` from URL or test on production domains

## Debugging

### Check API Usage
Look for console logs:
- "Using local Smartling API for development"
- "v2 API not available, falling back to v1"

### Network Requests
Monitor network tab to see which endpoints are being called:
- Local v2: `http://localhost:3000/api/v2/smartling/*`
- Production v1: `https://builder.io/api/v2/smartling/*`

## Modifying for v2 API Changes

If the v2 API has different endpoints or response structures:

1. **Update `SmartlingApiDev` class** in `src/smartling-dev.ts`
2. **Override specific methods** to match v2 API structure
3. **Add new v2-specific methods** as needed
4. **Update fallback logic** in components if response structure changes

Example:
```typescript
// In SmartlingApiDev class
getJobs(): Promise<{ items: any[] }> {
  return this.request('jobs'); // v2 endpoint
}

// Override if v2 has different structure
getJobDetails(jobUid: string): Promise<{ job: any; content: any[] }> {
  return this.request(`jobs/${jobUid}/details`); // v2 endpoint
}
```

## Environment Variables (Optional)

You can also set environment variables to control API usage:

```bash
# Force development API
SMARTLING_DEV=true npm run start

# Force production API (even on localhost)
SMARTLING_PROD=true npm run start
```