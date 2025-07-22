/** @jsx jsx */
import { jsx } from '@emotion/core';
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Box,
  Chip,
} from '@material-ui/core';
import { SmartlingApi } from './smartling';

interface SmartlingJob {
  translationJobUid: string;
  jobName: string;
  jobStatus: string;
  targetLocaleIds: string[];
  description?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (result: { type: 'new' | 'existing'; jobUid?: string; name?: string; description?: string }) => void;
  api: SmartlingApi;
  contentCount: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`job-tabpanel-${index}`}
      aria-labelledby={`job-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

export const SmartlingJobSelector: React.FC<Props> = ({
  open,
  onClose,
  onSelect,
  api,
  contentCount,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<SmartlingJob[]>([]);
  const [selectedJobUid, setSelectedJobUid] = useState('');
  const [newJobName, setNewJobName] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');

  useEffect(() => {
    if (open) {
      loadJobs();
    }
  }, [open]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const response = await api.getSmartlingJobs();
      setJobs(response.jobs || []);
    } catch (error) {
      console.error('Failed to load Smartling jobs:', error);
      setJobs([]);
    }
    setLoading(false);
  };

  const handleCreateNew = () => {
    if (!newJobName.trim()) return;
    onSelect({
      type: 'new',
      name: newJobName.trim(),
      description: newJobDescription.trim() || undefined,
    });
    onClose();
  };

  const handleSelectExisting = () => {
    if (!selectedJobUid) return;
    onSelect({
      type: 'existing',
      jobUid: selectedJobUid,
    });
    onClose();
  };

  const selectedJob = jobs.find(job => job.translationJobUid === selectedJobUid);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Send {contentCount} {contentCount === 1 ? 'item' : 'items'} for Translation
      </DialogTitle>
      <DialogContent>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} aria-label="job selection tabs">
          <Tab label="Create New Job" />
          <Tab label="Add to Existing Job" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <div css={{ marginTop: 16 }}>
            <TextField
              fullWidth
              label="Job Name"
              value={newJobName}
              onChange={(e) => setNewJobName(e.target.value)}
              placeholder="Enter a name for your translation job"
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              value={newJobDescription}
              onChange={(e) => setNewJobDescription(e.target.value)}
              placeholder="Add a description for this job"
              margin="normal"
              multiline
              rows={3}
            />
            <Typography variant="body2" color="textSecondary" css={{ marginTop: 16 }}>
              A new Smartling job will be created with the selected content.
            </Typography>
          </div>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <div css={{ textAlign: 'center', padding: 32 }}>
              <CircularProgress size={24} />
              <Typography css={{ marginTop: 8 }}>Loading jobs...</Typography>
            </div>
          ) : jobs.length === 0 ? (
            <div css={{ textAlign: 'center', padding: 32 }}>
              <Typography color="textSecondary">
                No active Smartling jobs found for this project.
              </Typography>
              <Typography variant="body2" color="textSecondary" css={{ marginTop: 8 }}>
                Create a new job instead.
              </Typography>
            </div>
          ) : (
            <div css={{ marginTop: 16 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Select Existing Job</InputLabel>
                <Select
                  value={selectedJobUid}
                  onChange={(e) => setSelectedJobUid(e.target.value as string)}
                >
                  {jobs.map((job) => (
                    <MenuItem key={job.translationJobUid} value={job.translationJobUid}>
                      <div>
                        <Typography variant="body1">{job.jobName}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {job.jobStatus} • {job.targetLocaleIds.length} locales
                        </Typography>
                      </div>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedJob && (
                <div css={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  <Typography variant="h6">{selectedJob.jobName}</Typography>
                  <Typography variant="body2" color="textSecondary" css={{ marginBottom: 8 }}>
                    Status: {selectedJob.jobStatus}
                  </Typography>
                  {selectedJob.description && (
                    <Typography variant="body2" css={{ marginBottom: 8 }}>
                      {selectedJob.description}
                    </Typography>
                  )}
                  <div>
                    <Typography variant="body2" css={{ marginBottom: 4 }}>Target Locales:</Typography>
                    {selectedJob.targetLocaleIds.map((locale) => (
                      <Chip key={locale} label={locale} size="small" css={{ marginRight: 4, marginBottom: 4 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {tabValue === 0 ? (
          <Button
            onClick={handleCreateNew}
            color="primary"
            variant="contained"
            disabled={!newJobName.trim()}
          >
            Create Job & Send for Translation
          </Button>
        ) : (
          <Button
            onClick={handleSelectExisting}
            color="primary"
            variant="contained"
            disabled={!selectedJobUid}
          >
            Add to Job & Send for Translation
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};