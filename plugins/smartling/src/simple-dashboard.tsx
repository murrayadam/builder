/** @jsx jsx */
import { jsx } from '@emotion/core';
import React, { useState, useEffect } from 'react';
import { SmartlingApi } from './smartling';

interface JobSummary {
  translationJobUid: string;
  jobName: string;
  jobStatus: string;
  targetLocaleIds: string[];
  description?: string;
  createdDate?: number;
  contentCount: number;
  completedCount: number;
  progressPercentage: number;
}

interface Props {
  api: SmartlingApi;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return '#4caf50';
    case 'in_progress':
    case 'inprogress':
      return '#ff9800';
    case 'pending':
      return '#757575';
    case 'cancelled':
    case 'canceled':
      return '#f44336';
    default:
      return '#757575';
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SimpleDashboard: React.FC<Props> = ({ api }) => {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try the v2 API method first, fallback to v1 if not available
      let response;
      try {
        response = await (api as any).getJobs();
        setJobs(response.items || []);
      } catch (v2Error) {
        // Fallback to v1 API
        console.log('v2 API not available, falling back to v1');
        response = await api.getAllJobs();
        setJobs(response.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load Smartling jobs:', err);
      setError('Failed to load translation jobs. Please check your Smartling configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  if (loading) {
    return (
      <div css={{
        padding: '40px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div css={{
          display: 'inline-block',
          width: '20px',
          height: '20px',
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p css={{ marginTop: '16px', color: '#666' }}>Loading translation jobs...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div css={{
        padding: '40px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div css={{
          color: '#f44336',
          marginBottom: '16px',
          fontSize: '18px',
        }}>⚠️ Error</div>
        <p css={{ color: '#666', marginBottom: '20px' }}>{error}</p>
        <button
          onClick={loadJobs}
          css={{
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div css={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div css={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '16px',
      }}>
        <h1 css={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '500',
          color: '#333',
        }}>
          Smartling Translation Jobs
        </h1>
        <button
          onClick={loadJobs}
          css={{
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div css={{
          textAlign: 'center',
          padding: '40px',
          color: '#666',
        }}>
          <div css={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <p>No translation jobs found</p>
        </div>
      ) : (
        <div css={{
          display: 'grid',
          gap: '16px',
        }}>
          {jobs.map((job) => (
            <div
              key={job.translationJobUid}
              css={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                },
              }}
            >
              <div css={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}>
                <div>
                  <h3 css={{
                    margin: '0 0 4px 0',
                    fontSize: '18px',
                    fontWeight: '500',
                    color: '#333',
                  }}>
                    {job.jobName}
                  </h3>
                  {job.description && (
                    <p css={{
                      margin: '0 0 8px 0',
                      color: '#666',
                      fontSize: '14px',
                    }}>
                      {job.description}
                    </p>
                  )}
                </div>
                <div css={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: getStatusColor(job.jobStatus),
                  textTransform: 'capitalize',
                }}>
                  {job.jobStatus.replace('_', ' ')}
                </div>
              </div>

              <div css={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                fontSize: '14px',
                color: '#666',
              }}>
                <div>
                  <strong>Content:</strong> {job.contentCount} items
                </div>
                <div>
                  <strong>Completed:</strong> {job.completedCount}/{job.contentCount}
                </div>
                <div>
                  <strong>Progress:</strong> {job.progressPercentage}%
                </div>
                <div>
                  <strong>Locales:</strong> {job.targetLocaleIds.join(', ')}
                </div>
                {job.createdDate && (
                  <div>
                    <strong>Created:</strong> {formatDate(job.createdDate)}
                  </div>
                )}
              </div>

              {job.progressPercentage > 0 && (
                <div css={{
                  marginTop: '12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  height: '6px',
                  overflow: 'hidden',
                }}>
                  <div css={{
                    backgroundColor: getStatusColor(job.jobStatus),
                    height: '100%',
                    width: `${job.progressPercentage}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};