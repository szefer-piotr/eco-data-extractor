// frontend/src/components/categories/ExtractionCategoryPanel.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { useExtractionStore } from '@store/extractionStore';
import CategoryList from './CategoryList';
import PromptPreview from './PromptPreview';

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
      id={`category-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const ExtractionCategoryPanel: React.FC = () => {
  const categories = useExtractionStore((state) => state.categories);
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Step 3: Configure Extraction Categories
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Define what data you want to extract and how the LLM should process it
        </Typography>
      </Box>

      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="category management tabs"
        >
          <Tab label={`Categories (${categories.length})`} />
          <Tab label="Prompt Preview" disabled={categories.length === 0} />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <CategoryList categories={categories} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <PromptPreview categories={categories} />
      </TabPanel>
    </Box>
  );
};

export default ExtractionCategoryPanel;