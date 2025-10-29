import React, { useState } from 'react';
import { Box, Typography, Container, Tabs, Tab } from '@mui/material';
import FileUploadWorkflow from '@components/upload/FileUploadWorkflow';
import ExtractionCategoryPanel from '@components/categories/ExtractionCategoryPanel';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const ExtractionPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Data Extraction Workflow
        </Typography>

        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} sx={{ mb: 2 }}>
          <Tab label="Step 1: Upload File" />
          <Tab label="Step 3: Categories" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <FileUploadWorkflow onComplete={() => setTabValue(1)} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ExtractionCategoryPanel />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default ExtractionPage;