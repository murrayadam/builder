import pkg from '../package.json';
import appState from '@builder.io/app-context';
import { getTranslationModel } from './model-template';
import { action } from 'mobx';

export type Project = {
  targetLocales: Array<{ enabled: boolean; localeId: string; description: string }>;
  sourceLocaleId: string;
  sourceLocaleDescription: string;
  projectId: string;
  projectName: string;
};

export class SmartlingApi {
         private privateKey?: string;
         private projectId?: string;
         loaded?: Promise<void>;
         resolveLoaded?: () => void;
         // TODO: basic cache
         getBaseUrl(path: string, search = {}) {
           const params = new URLSearchParams({
             ...search,
             pluginId: pkg.name,
             apiKey: appState.user.apiKey,
             projectId: this.projectId || '',
           });

           const baseUrl = new URL(`${appState.config.apiRoot()}/api/v2/smartling/${path}`);
           baseUrl.search = params.toString();
           return baseUrl.toString();
         }
         constructor() {
           this.loaded = new Promise(resolve => (this.resolveLoaded = resolve));
           this.init();
           appState.globalState.orgSwitched?.subscribe(
            action(async () => {
              await this.init();
            })
          );
         }

         async init() {
           this.privateKey = await appState.globalState.getPluginPrivateKey(pkg.name);
           const pluginSettings = appState.user.organization?.value?.settings?.plugins?.get(pkg.name);
           this.projectId = pluginSettings?.get('projectId');
           if (this.privateKey && this.projectId) {
             this.resolveLoaded!();
           }
         }

         isPluginPrivateKeySame(pluginPrivateKey: string) {
           return Boolean(this.privateKey) && this.privateKey === pluginPrivateKey;
         }

         async request(path: string, config?: RequestInit, search = {}) {
           await this.loaded;
           return fetch(`${this.getBaseUrl(path, search)}`, {
             ...config,
             headers: {
               Authorization: `Bearer ${this.privateKey}`,
               'Content-Type': 'application/json',
             },
           }).then(res => res.json());
         }
         // Get current project details
         getProject(): Promise<{ project: Project }> {
           return this.request('project/details');
         }

         getJob(id: string): Promise<{ job: any }> {
           return this.request('job', { method: 'GET' }, { id });
         }

         // Get all active Smartling jobs for the configured project
         getSmartlingJobs(): Promise<{ jobs: any[] }> {
           return this.request('jobs/status/all', { method: 'GET' }, { includeCompleted: false });
         }

         // Get all jobs (including completed) for job management dashboard
         getAllJobs(includeCompleted: boolean = true): Promise<{ jobs: any[]; summary: any }> {
           return this.request('jobs/status/all', { method: 'GET' }, { includeCompleted });
         }

         // Get detailed status for a specific job
         getJobDetails(jobUid: string): Promise<{ job: any; content: any[] }> {
           return this.request(`jobs/${jobUid}/status/detailed`, { method: 'GET' });
         }

         // Get job activity and timeline
         getJobActivity(jobUid: string): Promise<{ job: any; activityLog: any[] }> {
           return this.request(`jobs/${jobUid}/activity`, { method: 'GET' });
         }

         // Refresh job status manually
         refreshJobStatus(jobUids: string[]): Promise<{ updates: any[] }> {
           return this.request('jobs/status/refresh', {
             method: 'POST',
             body: JSON.stringify({ jobUids }),
           });
         }

         // Create a new Smartling job directly
         createSmartlingJob(options: {
           name: string;
           description?: string;
           contentEntries: any[];
           targetLocales: string[];
         }): Promise<{ jobId: string; job: any }> {
           return this.request('batch/create', {
             method: 'POST',
             body: JSON.stringify(options),
           });
         }

         // Add content to existing Smartling job
         addToSmartlingJob(options: {
           jobUid: string;
           contentEntries: any[];
         }): Promise<{ success: boolean }> {
           return this.request('jobs/add-content', {
             method: 'POST',
             body: JSON.stringify(options),
           });
         }


         // Apply translations from a Smartling job
         applyTranslation(jobUid: string) {
           return this.request(`jobs/${jobUid}/apply-translations`, {
             method: 'POST',
           });
         }

         removeContentFromTranslationJob({
           contentId,
           contentModel,
           translationJobId,
           translationModel,
         }: {
           contentId: string;
           contentModel: string;
           translationJobId: string;
           translationModel: string;
         }) {
           return this.request('jobs/remove-content', {
             method: 'POST',
             body: JSON.stringify({
               contentId,
               contentModel,
               translationJobId,
               translationModel,
             }),
           });
         }

         updateTranslationFile(options: {
           translationJobId: string;
           translationModel: string;
           preview: string;
           contentId: string;
           contentModel: string;
         }) {
           return this.request('jobs/update-file', {
             method: 'POST',
             body: JSON.stringify(options),
           });
         }
       }

function getContentReference(content: any) {
  return {
    content: {
      '@type': '@builder.io/core:Reference',
      id: content.id,
      model: content.modelName,
    },
    preview:
      content.previewUrl || content.meta?.get?.('lastPreviewUrl') || content.meta?.lastPreviewUrl,
  };
}
