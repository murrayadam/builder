/** @jsx jsx */
import { jsx } from '@emotion/core';
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Typography,
  CircularProgress,
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@material-ui/core';
import {
  Refresh as RefreshIcon,
  Launch as LaunchIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
} from '@material-ui/icons';
import { SmartlingApi } from './smartling';
import { JobStatusSSE } from './job-status-sse';

interface JobSummary {
  translationJobUid: string;
  jobName: string;
  jobStatus: string;
  targetLocaleIds: string[];
  description?: string;
  createdDate?: number;
  lastUpdated?: number;
  contentCount: number;
  completedCount: number;
  progressPercentage: number;
}

interface JobDetails {
  job: JobSummary;
  content: Array<{
    contentId: string;
    contentModel: string;
    currentStatus: string;
    localeStatuses: Record<string, string>;
  }>;
}

interface JobActivity {
  job: JobSummary;
  activityLog: Array<{
    contentId: string;
    contentModel: string;
    currentStatus: string;
    timeline: Array<{
      event: string;
      timestamp: number;
      message: string;
    }>;
  }>;
}

interface Props {
  api: SmartlingApi;
  onClose?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'primary';
    case 'in_progress':
    case 'inprogress':
      return 'secondary';
    case 'pending':
      return 'default';
    case 'cancelled':
    case 'canceled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <CheckCircleIcon css={{ color: '#4caf50' }} />;
    case 'in_progress':
    case 'inprogress':
      return <ScheduleIcon css={{ color: '#ff9800' }} />;
    case 'pending':
      return <ScheduleIcon css={{ color: '#757575' }} />;
    case 'cancelled':
    case 'canceled':
      return <CancelIcon css={{ color: '#f44336' }} />;
    default:
      return <ErrorIcon css={{ color: '#757575' }} />;
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

export const JobManagementDashboard: React.FC<Props> = ({ api, onClose }) => {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [jobActivity, setJobActivity] = useState<JobActivity | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    loadJobs();
    
    // Set up SSE for real-time updates
    const apiKey = (window as any).appState?.user?.apiKey;
    const baseUrl = (window as any).appState?.config?.apiRoot?.() || '';
    
    if (apiKey && baseUrl) {
      const sse = new JobStatusSSE(apiKey, baseUrl);
      
      const unsubscribe = sse.onUpdate((update) => {
        console.log('Job status update received:', update);
        setSseConnected(true);
        
        // Update jobs list if we receive a status update
        if (update.type === 'job_status_update' || update.type === 'translation_completed') {
          loadJobs();
        }
      });
      
      sse.connect();
      
      return () => {
        unsubscribe();
        sse.disconnect();
      };
    }
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const response = await api.getAllJobs(true);
      setJobs(response.jobs || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
    setLoading(false);
  };

  const refreshJobs = async () => {
    setRefreshing(true);
    try {
      const jobUids = jobs.map(job => job.translationJobUid);
      if (jobUids.length > 0) {
        await api.refreshJobStatus(jobUids);
        await loadJobs();
      }
    } catch (error) {
      console.error('Failed to refresh jobs:', error);
    }
    setRefreshing(false);
  };

  const openJobInSmartling = (jobUid: string) => {
    // Get project ID from API settings
    const pluginSettings = (window as any).appState?.user?.organization?.value?.settings?.plugins?.get?.('@builder.io/plugin-smartling');
    const projectId = pluginSettings?.get?.('projectId');
    
    if (projectId) {
      const smartlingUrl = `https://dashboard.smartling.com/app/projects/${projectId}/strings/jobs/${jobUid}`;
      window.open(smartlingUrl, '_blank', 'noreferrer,noopener');
    }
  };

  const viewJobDetails = async (jobUid: string) => {
    setSelectedJob(jobUid);
    setDetailsLoading(true);
    setShowActivity(false);
    
    try {
      const details = await api.getJobDetails(jobUid);
      setJobDetails(details);
    } catch (error) {
      console.error('Failed to load job details:', error);
    }
    setDetailsLoading(false);
  };

  const viewJobActivity = async (jobUid: string) => {
    setDetailsLoading(true);
    setShowActivity(true);
    
    try {
      const activity = await api.getJobActivity(jobUid);
      setJobActivity(activity);
    } catch (error) {
      console.error('Failed to load job activity:', error);
    }
    setDetailsLoading(false);
  };

  const closeDetails = () => {
    setSelectedJob(null);
    setJobDetails(null);
    setJobActivity(null);
    setShowActivity(false);
  };

  if (loading) {
    return (
      <Box css={{ padding: 32, textAlign: 'center' }}>
        <CircularProgress />
        <Typography css={{ marginTop: 16 }}>Loading translation jobs...</Typography>
      </Box>
    );
  }

  return (
    <div css={{ padding: 24 }}>
      <Box css={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Box>
          <Typography variant="h4">Translation Jobs</Typography>
          {sseConnected && (
            <Box css={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <div css={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#4caf50',
                marginRight: 8,
              }} />
              <Typography variant="caption" color="textSecondary">
                Real-time updates enabled
              </Typography>
            </Box>
          )}
        </Box>
        <Box>
          <Button
            onClick={refreshJobs}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            css={{ marginRight: 8 }}
          >
            Refresh
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outlined">
              Close
            </Button>
          )}
        </Box>
      </Box>

      {jobs.length === 0 ? (
        <Paper css={{ padding: 32, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No translation jobs found
          </Typography>
          <Typography variant="body2" color="textSecondary" css={{ marginTop: 8 }}>
            Translation jobs you create will appear here
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Target Locales</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.translationJobUid}>
                  <TableCell>
                    <Box css={{ display: 'flex', alignItems: 'center' }}>
                      {getStatusIcon(job.jobStatus)}
                      <div css={{ marginLeft: 8 }}>
                        <Typography variant="body2" css={{ fontWeight: 600 }}>
                          {job.jobName}
                        </Typography>
                        {job.description && (
                          <Typography variant="caption" color="textSecondary">
                            {job.description}
                          </Typography>
                        )}
                      </div>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={job.jobStatus}
                      color={getStatusColor(job.jobStatus) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box css={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">
                        {job.completedCount}/{job.contentCount}
                      </Typography>
                      <Box css={{ marginLeft: 8, flex: 1, maxWidth: 100 }}>
                        <div css={{
                          width: '100%',
                          height: 4,
                          backgroundColor: '#e0e0e0',
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}>
                          <div css={{
                            width: `${job.progressPercentage}%`,
                            height: '100%',
                            backgroundColor: job.progressPercentage === 100 ? '#4caf50' : '#2196f3',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </Box>
                      <Typography variant="caption" css={{ marginLeft: 8, minWidth: 35 }}>
                        {Math.round(job.progressPercentage)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box css={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {job.targetLocaleIds.slice(0, 3).map((locale) => (
                        <Chip key={locale} label={locale} size="small" variant="outlined" />
                      ))}
                      {job.targetLocaleIds.length > 3 && (
                        <Chip label={`+${job.targetLocaleIds.length - 3}`} size="small" variant="outlined" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {job.createdDate ? formatDate(job.createdDate) : '-'}
                  </TableCell>
                  <TableCell>
                    {job.lastUpdated ? formatDate(job.lastUpdated) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => viewJobDetails(job.translationJobUid)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open in Smartling">
                      <IconButton size="small" onClick={() => openJobInSmartling(job.translationJobUid)}>
                        <LaunchIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Job Details Dialog */}
      <Dialog open={!!selectedJob} onClose={closeDetails} maxWidth="lg" fullWidth>
        <DialogTitle>
          Job Details: {jobDetails?.job.jobName || selectedJob}
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Box css={{ padding: 32, textAlign: 'center' }}>
              <CircularProgress />
              <Typography css={{ marginTop: 16 }}>Loading job details...</Typography>
            </Box>
          ) : (
            <div>
              {/* Tab-like buttons */}
              <Box css={{ marginBottom: 16 }}>
                <Button
                  variant={!showActivity ? 'contained' : 'outlined'}
                  onClick={() => {
                    setShowActivity(false);
                    if (selectedJob) viewJobDetails(selectedJob);
                  }}
                  css={{ marginRight: 8 }}
                >
                  Content Status
                </Button>
                <Button
                  variant={showActivity ? 'contained' : 'outlined'}
                  onClick={() => {
                    if (selectedJob) viewJobActivity(selectedJob);
                  }}
                >
                  Activity Timeline
                </Button>
              </Box>

              {!showActivity && jobDetails && (
                <div>
                  <Card css={{ marginBottom: 16 }}>
                    <CardContent>
                      <Typography variant="h6">Job Information</Typography>
                      <Box css={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                        <div>
                          <Typography variant="caption" color="textSecondary">Status</Typography>
                          <div css={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                            {getStatusIcon(jobDetails.job.jobStatus)}
                            <Chip
                              label={jobDetails.job.jobStatus}
                              color={getStatusColor(jobDetails.job.jobStatus) as any}
                              size="small"
                              css={{ marginLeft: 8 }}
                            />
                          </div>
                        </div>
                        <div>
                          <Typography variant="caption" color="textSecondary">Progress</Typography>
                          <Typography variant="body2" css={{ marginTop: 4 }}>
                            {jobDetails.job.completedCount}/{jobDetails.job.contentCount} items ({Math.round(jobDetails.job.progressPercentage)}%)
                          </Typography>
                        </div>
                      </Box>
                    </CardContent>
                  </Card>

                  <Typography variant="h6" css={{ marginBottom: 8 }}>Content Items</Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Content ID</TableCell>
                          <TableCell>Model</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Locale Progress</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {jobDetails.content.map((item) => (
                          <TableRow key={item.contentId}>
                            <TableCell>{item.contentId}</TableCell>
                            <TableCell>{item.contentModel}</TableCell>
                            <TableCell>
                              <Chip
                                label={item.currentStatus}
                                color={getStatusColor(item.currentStatus) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box css={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {Object.entries(item.localeStatuses).map(([locale, status]) => (
                                  <Chip
                                    key={locale}
                                    label={`${locale}: ${status}`}
                                    size="small"
                                    variant="outlined"
                                    color={getStatusColor(status) as any}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )}

              {showActivity && jobActivity && (
                <div>
                  <Typography variant="h6" css={{ marginBottom: 16 }}>Activity Timeline</Typography>
                  {jobActivity.activityLog.map((item) => (
                    <Card key={item.contentId} css={{ marginBottom: 16 }}>
                      <CardContent>
                        <Typography variant="subtitle1">
                          {item.contentId} ({item.contentModel})
                        </Typography>
                        <Typography variant="body2" color="textSecondary" css={{ marginBottom: 8 }}>
                          Current Status: {item.currentStatus}
                        </Typography>
                        <List dense>
                          {item.timeline.map((event, index) => (
                            <div key={index}>
                              <ListItem>
                                <ListItemText
                                  primary={event.message}
                                  secondary={formatDate(event.timestamp)}
                                />
                              </ListItem>
                              {index < item.timeline.length - 1 && <Divider />}
                            </div>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {selectedJob && (
            <Button onClick={() => openJobInSmartling(selectedJob)} startIcon={<LaunchIcon />}>
              Open in Smartling
            </Button>
          )}
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};