import pkg from '../package.json';
import appState from '@builder.io/app-context';
import { SmartlingApi } from './smartling';

/**
 * Development version of SmartlingApi that points to local v2 API
 * This allows testing against the new API in builder-internal
 */
export class SmartlingApiDev extends SmartlingApi {
  // Override the base URL to point to local development server
  getBaseUrl(path: string, search = {}): string {
    // Get project ID from settings instead of private property
    const pluginSettings = appState.user.organization?.value?.settings?.plugins?.get(pkg.name);
    const projectId = pluginSettings?.get('projectId') || '';
    
    const params = new URLSearchParams({
      ...search,
      pluginId: pkg.name,
      apiKey: appState.user.apiKey,
      projectId,
    });

    // Point to local development API
    const baseUrl = new URL(`http://localhost:3000/api/v2/smartling/${path}`);
    baseUrl.search = params.toString();
    return baseUrl.toString();
  }

  // Get jobs using the new v2 API structure
  getJobs(): Promise<{ items: any[] }> {
    return this.request('jobs');
  }

  // If the v2 API has different endpoints, override them here
  getJobDetails(jobUid: string): Promise<{ job: any; content: any[] }> {
    return this.request(`jobs/${jobUid}/details`);
  }

  // Add any new v2 API methods here
  getJobProgress(jobUid: string): Promise<{ progress: any }> {
    return this.request(`jobs/${jobUid}/progress`);
  }
}

// Helper function to determine which API to use based on environment
export function createSmartlingApi(): SmartlingApi {
  // Check if we're in development mode and want to use local API
  let useLocalApi = false;
  
  try {
    useLocalApi = (typeof window !== 'undefined' && window.location.search.includes('smartling-dev=true')) ||
                  (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  } catch (error) {
    // Fallback to production API if there's an error accessing window
    console.warn('Could not determine environment, using production API');
    useLocalApi = false;
  }
  
  if (useLocalApi) {
    console.log('Using local Smartling API for development');
    return new SmartlingApiDev();
  }
  
  return new SmartlingApi();
}