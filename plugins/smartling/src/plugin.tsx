import { Builder } from '@builder.io/react';
import pkg from '../package.json';
import appState from '@builder.io/app-context';
import uniq from 'lodash/uniq';
import isEqual from 'lodash/isEqual';
import { SmartlingJobSelector } from './smartling-job-selector';
import { JobManagementDashboard } from './job-management-dashboard';
import { SimpleDashboard } from './simple-dashboard';
import {
  registerBulkAction,
  registerContentAction,
  registerContextMenuAction,
  CustomReactEditorProps,
  fastClone,
  registerEditorOnLoad,
} from './plugin-helpers';
import { SmartlingConfigurationEditor } from './smartling-configuration-editor';
import { SmartlingApi, Project } from './smartling';
import { createSmartlingApi } from './smartling-dev';
import { showJobNotification, showOutdatedNotifications } from './snackbar-utils';
import React from 'react';
import { getTranslateableFields } from '@builder.io/utils';
import hash from 'object-hash';
import stringify from 'fast-json-stable-stringify';
// translation status that indicate the content is being queued for translations
const enabledTranslationStatuses = ['pending', 'local'];


Builder.register('plugin', {
  name: 'Smartling (v2)',
  id: pkg.name,
  settings: [
    {
      name: 'projectId',
      friendlyName: 'Smartling Project ID',
      type: 'string',
      required: true,
      helperText: 'The ID of your Smartling project',
    },
    {
      name: 'userId',
      friendlyName: 'User ID',
      type: 'string',
      required: true,
      helperText: 'Your Smartling user ID for API access',
    },
    {
      name: 'tokenSecret',
      friendlyName: 'User Secret',
      type: 'string',
      required: true,
      helperText: 'Your Smartling user secret for API access',
      isSecret: true,
    },
    {
      name: 'enableJobAutoAuthorization',
      friendlyName: 'Authorize Smartling Jobs through Builder',
      type: 'boolean',
      defaultValue: false,
      helperText: 'Allows users to authorize Smartling jobs directly from Builder',
      requiredPermissions: ['admin'],
    },
    {
      name: 'copySmartlingLocales',
      friendlyName: 'Copy Locales from Smartling to Builder',
      type: 'boolean',
      defaultValue: true,
      helperText: 'This will copy locales from Smartling to Builder',
      requiredPermissions: ['admin'],
    },
  ],
  ctaText: `Connect your Smartling account`,
  noPreviewTypes: true,
});

Builder.register('app.onLoad', async () => {
  const pluginSettings = appState.user.organization?.value?.settings?.plugins?.get(pkg.name);
  if (!pluginSettings) return;

  const settings = {
    get: (key: string) => pluginSettings.get(key)
  };

  await initializeSmartlingPlugin(settings);
});

async function initializeSmartlingPlugin(settings: any) {
    const copySmartlingLocales= settings.get('copySmartlingLocales');
    const api = createSmartlingApi();
    registerEditorOnLoad(({ safeReaction }) => {
      safeReaction(
        () => {
          return String(appState.designerState.editingContentModel?.lastUpdated || '');
        },
        async shouldCheck => {
          if (!shouldCheck) {
            return;
          }

          const translationStatus = appState.designerState.editingContentModel.meta.get(
            'translationStatus'
          );
          const translationRequested = appState.designerState.editingContentModel.meta.get(
            'translationRequested'
          );

          // check if there's pending translation
          const isFresh =
            appState.designerState.editingContentModel.lastUpdated > new Date(translationRequested);
          if (!isFresh) {
            return;
          }
          const content = fastClone(appState.designerState.editingContentModel);
          const isPending = translationStatus === 'pending';
          const smartlingJobUid = content.meta?.smartlingJobUid;
          
          if (isPending && smartlingJobUid && content.published === 'published') {
            const lastPublishedContent = await fetch(
              `https://cdn.builder.io/api/v3/content/${appState.designerState.editingModel.name}/${content.id}?apiKey=${appState.user.apiKey}&cachebust=true`
            ).then(res => res.json());
            const res = await api.getProject();
            const sourceLocale = res.project?.sourceLocaleId;
            const translatableFields = getTranslateableFields(
              lastPublishedContent,
              sourceLocale,
              ''
            );
            const currentRevision = hash(stringify(translatableFields), {
              encoding: 'base64',
            });
            appState.designerState.editingContentModel.meta.set(
              'translationRevisionLatest',
              currentRevision
            );
            if (currentRevision !== content.meta.translationRevision) {
              showOutdatedNotifications(async () => {
                appState.globalState.showGlobalBlockingLoading('Contacting Smartling ....');
                await api.updateTranslationFile({
                  translationJobId: smartlingJobUid,
                  translationModel: appState.designerState.editingModel.name,
                  contentId: lastPublishedContent.id,
                  contentModel: appState.designerState.editingModel.name,
                  preview: lastPublishedContent.meta.lastPreviewUrl,
                });
                appState.globalState.hideGlobalBlockingLoading();
              });
            }
          }
        },
        {
          fireImmediately: true,
        }
      );
    });

    // assign locales to custom targeting attributes
    Builder.nextTick(async () => {
      if (copySmartlingLocales) {
        try {
          const projectResponse = await api.getProject();
          const project = projectResponse.project;
          
          const smartlingLocales = project.targetLocales
            .filter(locale => locale.enabled)
            .map(locale => locale.localeId)
            .concat(project.sourceLocaleId);
            
          const currentLocales = appState.user.organization.value.customTargetingAttributes
            ?.get('locale')
            ?.toJSON();

          let combinedLocales = [...new Set([...smartlingLocales, ...currentLocales?.enum || []])];
          
          // Merge builder locales with smartling locales (all unique locales)
          if (!isEqual(currentLocales?.enum, combinedLocales)) {
            appState.user.organization.value.customTargetingAttributes?.get('locale').set('enum', combinedLocales);
          }
        } catch (error) {
          console.error('Failed to load project locales:', error);
        }
      }
    });
    // create a new action on content to add to job
    registerBulkAction({
      label: 'Send for Translation',
      showIf(selectedContentIds, content, model) {
        const hasDraftOrTranslationPending = selectedContentIds.find(id => {
          const fullContent = content.find(entry => entry.id === id);
          return (
            fullContent.published !== 'published' ||
            enabledTranslationStatuses.includes(fullContent.meta?.get('translationStatus'))
          );
        });
        return appState.user.can('publish') && !hasDraftOrTranslationPending;
      },
      async onClick(actions, selectedContentIds, contentEntries) {
        const selectedContent = selectedContentIds.map(id =>
          contentEntries.find(entry => entry.id === id)
        );

        // Show job selector dialog
        let jobSelectorOpen = true;
        const jobSelectorPromise = new Promise((resolve) => {
          const jobSelector = Builder.registerEditor({
            name: 'SmartlingJobSelectorTemp',
            component: (props: any) => (
              <SmartlingJobSelector
                open={jobSelectorOpen}
                onClose={() => {
                  jobSelectorOpen = false;
                  resolve(null);
                }}
                onSelect={resolve}
                api={api}
                contentCount={selectedContent.length}
              />
            ),
          });
        });

        const result = await jobSelectorPromise;
        if (!result) return;

        appState.globalState.showGlobalBlockingLoading('Sending content for translation...');

        try {
          let jobUid: string;
          
          if (result.type === 'new') {
            const createResult = await api.createSmartlingJob({
              name: result.name!,
              description: result.description,
              contentEntries: selectedContent,
              targetLocales: [], // Will be selected in the API based on project settings
            });
            jobUid = createResult.jobId;
          } else {
            await api.addToSmartlingJob({
              jobUid: result.jobUid!,
              contentEntries: selectedContent,
            });
            jobUid = result.jobUid!;
          }

          // Update content metadata
          await Promise.all(
            selectedContent.map(entry =>
              appState.updateLatestDraft({
                id: entry.id,
                modelId: entry.modelId,
                meta: {
                  ...fastClone(entry.meta),
                  translationStatus: 'pending',
                  smartlingJobUid: jobUid,
                  translationRequested: Date.now(),
                },
              })
            )
          );

          actions.refreshList();
          appState.snackBar.show('Content sent for translation successfully!');
        } catch (error) {
          console.error('Translation request failed:', error);
          appState.snackBar.show('Failed to send content for translation');
        }

        appState.globalState.hideGlobalBlockingLoading();
      },
    });
    const transcludedMetaKey = 'excludeFromTranslation';
    registerContextMenuAction({
      label: 'Toggle translation exclusion',
      showIf(selectedElements) {
        if (selectedElements.length !== 1) {
          return false;
        }
        const element = selectedElements[0];
        return element.component?.name === 'Text';
      },
      onClick(elements) {
        const element = elements[0];
        const isExcluded = element.meta?.get(transcludedMetaKey) === true;
        elements.forEach(el => el.meta.set(transcludedMetaKey, !isExcluded));
      },
    });

    registerContentAction({
      label: 'Send for Translation',
      showIf(content, model) {
        return (
          content.published === 'published' &&
          !enabledTranslationStatuses.includes(content.meta?.get('translationStatus'))
        );
      },
      async onClick(content) {
        // Show job selector dialog
        let jobSelectorOpen = true;
        const jobSelectorPromise = new Promise((resolve) => {
          const jobSelector = Builder.registerEditor({
            name: 'SmartlingJobSelectorTemp',
            component: (props: any) => (
              <SmartlingJobSelector
                open={jobSelectorOpen}
                onClose={() => {
                  jobSelectorOpen = false;
                  resolve(null);
                }}
                onSelect={resolve}
                api={api}
                contentCount={1}
              />
            ),
          });
        });

        const result = await jobSelectorPromise;
        if (!result) return;

        appState.globalState.showGlobalBlockingLoading('Sending content for translation...');

        try {
          let jobUid: string;
          
          if (result.type === 'new') {
            const createResult = await api.createSmartlingJob({
              name: result.name!,
              description: result.description,
              contentEntries: [content],
              targetLocales: [], // Will be selected in the API based on project settings
            });
            jobUid = createResult.jobId;
          } else {
            await api.addToSmartlingJob({
              jobUid: result.jobUid!,
              contentEntries: [content],
            });
            jobUid = result.jobUid!;
          }

          await appState.updateLatestDraft({
            id: content.id,
            modelId: content.modelId,
            meta: {
              ...fastClone(content.meta),
              translationStatus: 'pending',
              smartlingJobUid: jobUid,
              translationRequested: Date.now(),
              translationBy: pkg.name,
            },
          });
          
          appState.snackBar.show('Content sent for translation successfully!');
        } catch (error) {
          console.error('Translation request failed:', error);
          appState.snackBar.show('Failed to send content for translation');
        }

        appState.globalState.hideGlobalBlockingLoading();
      },
      isDisabled() {
        return appState.designerState.hasUnsavedChanges();
      },
      disabledTooltip: 'Please publish your changes to send for translation',
    });
    registerContentAction({
      label: 'Request an updated translation',
      showIf(content, model) {
        return (
          content.published === 'published' &&
          content.meta?.get('translationStatus') === 'pending' &&
          content.meta?.get('smartlingJobUid') &&
          content.meta.get('translationRevisionLatest') &&
          content.meta.get('translationRevision') !== content.meta.get('translationRevisionLatest')
        );
      },
      async onClick(content) {
        appState.globalState.showGlobalBlockingLoading('Contacting Smartling ....');
        const lastPublishedContent = await fetch(
          `https://cdn.builder.io/api/v3/content/${appState.designerState.editingModel.name}/${content.id}?apiKey=${appState.user.apiKey}&cachebust=true`
        ).then(res => res.json());
        await api.updateTranslationFile({
          translationJobId: lastPublishedContent.meta.smartlingJobUid,
          translationModel: appState.designerState.editingModel.name,
          contentId: lastPublishedContent.id,
          contentModel: appState.designerState.editingModel.name,
          preview: lastPublishedContent.meta.lastPreviewUrl,
        });
        appState.globalState.hideGlobalBlockingLoading();
      },
    });
    registerContentAction({
      label: 'Apply Translation',
      showIf(content, model) {
        return (
          content.published === 'published' &&
          content.meta?.get('translationStatus') === 'pending' &&
          content.meta?.get('smartlingJobUid')
        );
      },
      async onClick(content) {
        appState.globalState.showGlobalBlockingLoading();
        const smartlingJobUid = content.meta.get('smartlingJobUid');
        
        try {
          await api.applyTranslation(smartlingJobUid);
          appState.snackBar.show('Translation applied successfully!');
        } catch (error) {
          console.error('Failed to apply translation:', error);
          appState.snackBar.show('Failed to apply translation');
        }
        
        appState.globalState.hideGlobalBlockingLoading();
      },
    });

    registerContentAction({
      label: 'View translation strings in Smartling',
      showIf(content, model) {
        return (
          content.published === 'published' &&
          content.meta?.get('translationStatus') === 'pending' &&
          content.meta?.get('smartlingJobUid')
        );
      },
      async onClick(content) {
        const smartlingJobUid = content.meta.get('smartlingJobUid');
        const pluginSettings = appState.user.organization?.value?.settings?.plugins?.get(pkg.name);
        const projectId = pluginSettings?.get('projectId');
        
        if (projectId && smartlingJobUid) {
          // https://dashboard.smartling.com/app/projects/0e6193784/strings/jobs/schqxtpcnxix
          const smartlingFile = `https://dashboard.smartling.com/app/projects/${projectId}/strings/jobs/${smartlingJobUid}`;
          window.open(smartlingFile, '_blank', 'noreferrer,noopener');
        } else {
          appState.snackBar.show('Unable to open Smartling: missing project or job information');
        }
      },
    });

    registerContentAction({
      label: 'Remove from translation job',
      showIf(content, model) {
        return Boolean(
          content.meta.get('smartlingJobUid') || content.meta.get('translationJobId')
        );
      },
      async onClick(content) {
        appState.globalState.showGlobalBlockingLoading();

        try {
          const smartlingJobUid = content.meta.get('smartlingJobUid');
          
          if (smartlingJobUid) {
            await api.removeContentFromTranslationJob({
              contentId: content.id,
              contentModel: appState.designerState.editingModel.name,
              translationJobId: smartlingJobUid,
              translationModel: appState.designerState.editingModel.name,
            });
          }

          // Clear translation metadata
          await appState.updateLatestDraft({
            id: content.id,
            modelId: content.modelId,
            meta: {
              ...fastClone(content.meta),
              translationStatus: undefined,
              smartlingJobUid: undefined,
              translationJobId: undefined,
              translationBatch: undefined,
              translationRequested: undefined,
            },
          });

          appState.snackBar.show('Removed from translation job.');
        } catch (error) {
          console.error('Failed to remove from translation job:', error);
          appState.snackBar.show('Failed to remove from translation job');
        }

        appState.globalState.hideGlobalBlockingLoading();
      },
    });

    // Register Smartling tab in main navigation
    Builder.register('appTab', {
      name: 'Smartling',
      path: 'smartling',
      icon: 'language',
      priority: -1,
      component: () => (
        <SimpleDashboard api={api} />
      ),
    });

    Builder.registerEditor({
      name: 'SmartlingConfiguration',
      component: (props: CustomReactEditorProps) => (
        <SmartlingConfigurationEditor {...props} api={api} />
      ),
    });

    Builder.registerEditor({
      name: 'SmartlingJobManagement',
      component: (props: CustomReactEditorProps) => (
        <JobManagementDashboard api={api} />
      ),
    });
}


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
