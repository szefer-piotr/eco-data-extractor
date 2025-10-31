// frontend/src/components/results/ResultsViewer.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ErrorIcon from '@mui/icons-material/Error';
import DownloadIcon from '@mui/icons-material/Download';
import { ExtractionResult } from '@api-types/api';
import { extractionApi } from '@services/extractionApi';
import { useExtractionStore } from '@store/extractionStore';
import { useUIStore } from '@store/uiStore';
import ResultsTable from './ResultsTable';
import ResultsExport from './ResultsExport';
import ErrorDisplay from './ErrorDisplay';

interface ResultsViewerProps {
  jobId?: string;
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
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ jobId: propJobId }) => {
  const [results, setResults] = useState<ExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const { jobId: storeJobId, categories } = useExtractionStore();
  const { addNotification } = useUIStore();

  const effectiveJobId = propJobId || storeJobId;

  useEffect(() => {
    const fetchResults = async () => {
      if (!effectiveJobId) {
        setError('No job ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await extractionApi.getResults(effectiveJobId);
        setResults(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch results';
        setError(errorMessage);
        addNotification({
          type: 'error',
          message: `Failed to load results: ${errorMessage}`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [effectiveJobId, addNotification]);

  const categoryNames = categories.map((cat) => cat.name);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Loading results...</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (error || !results) {
    return (
      <Alert severity="error">
        {error || 'Failed to load results. Please try again.'}
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader
        avatar={<ViewWeekIcon />}
        title="Extraction Results"
        subheader={`Job ID: ${effectiveJobId}`}
        action={
          <ResultsExport
            data={results}
            categoryNames={categoryNames}
            fileName={`extraction-${effectiveJobId}`}
          />
        }
      />

      <CardContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab
              label="Results"
              icon={<ViewWeekIcon sx={{ mr: 1 }} />}
              iconPosition="start"
              id="results-tab-0"
              aria-controls="results-tabpanel-0"
            />
            {results.errors && results.errors.length > 0 && (
              <Tab
                label={`Errors (${results.errors.length})`}
                icon={<ErrorIcon sx={{ mr: 1 }} />}
                iconPosition="start"
                id="results-tab-1"
                aria-controls="results-tabpanel-1"
              />
            )}
          </Tabs>
        </Box>

        {/* Results Tab */}
        <TabPanel value={tabValue} index={0}>
          <ResultsTable
            data={results}
            categoryNames={categoryNames}
          />
        </TabPanel>

        {/* Errors Tab */}
        {results.errors && results.errors.length > 0 && (
          <TabPanel value={tabValue} index={1}>
            <ErrorDisplay
              data={results}
              showRetryOption={false}
            />
          </TabPanel>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsViewer;