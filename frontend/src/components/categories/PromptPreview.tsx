// frontend/src/components/categories/PromptPreview.tsx
import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Alert,
  Divider,
  Stack,
  Paper,
  Chip,
} from '@mui/material';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Category } from '@api-types/extraction';

interface PromptPreviewProps {
  categories: Category[];
  sampleText?: string;
  isLoading?: boolean;
}

interface JSONOutputStructure {
  [key: string]: string | number | null;
}

const DEFAULT_SAMPLE_TEXT = 'This is a sample text for preview purposes.';

const PromptPreview: React.FC<PromptPreviewProps> = ({
  categories,
  sampleText = DEFAULT_SAMPLE_TEXT,
  isLoading = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Construct full prompt
  const fullPrompt = useMemo(() => {
    if (categories.length === 0) {
      return null;
    }

    const categoryInstructions = categories
      .map((cat, idx) => `${idx + 1}. ${cat.name}: Extract and return a single value representing the ${cat.name.toLowerCase()}`)
      .join('\n');

    const expectedValuesInfo = categories
      .filter((cat) => cat.expectedValues && cat.expectedValues.length > 0)
      .map((cat) => `- ${cat.name}: Expected values are: ${cat.expectedValues?.join(', ')}`)
      .join('\n');

    const systemPrompt = `You are a data extraction assistant. Your task is to extract specific information from provided text according to the following instructions.

Instructions:
${categoryInstructions}

${expectedValuesInfo ? `Valid Value Sets:\n${expectedValuesInfo}\n` : ''}
Response Format:
Return ONLY a JSON object with keys matching the category names and values as the extracted information. Do not include any explanation or additional text.`;

    const userPrompt = `Extract the following information from the text below:\n\nText: "${sampleText}"`;

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }, [categories, sampleText]);

  // Construct expected JSON output structure
  const expectedOutput = useMemo((): JSONOutputStructure => {
    const output: JSONOutputStructure = {};
    categories.forEach((cat) => {
      output[cat.name] = null;
    });
    return output;
  }, [categories]);

  const handleCopyPrompt = () => {
    if (!fullPrompt) return;

    const combinedPrompt = `System:\n${fullPrompt.system}\n\nUser:\n${fullPrompt.user}`;
    navigator.clipboard.writeText(combinedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (categories.length === 0) {
    return (
      <Alert severity="info">
        Add at least one category to see the prompt preview
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary">Loading preview...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!fullPrompt) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* System Prompt */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title="System Prompt"
          subheader={`Instructions for ${categories.length} extraction categor${categories.length !== 1 ? 'ies' : 'y'}`}
          avatar={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            />
          }
        />
        <Divider />
        <CardContent>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '300px',
              overflow: 'auto',
              lineHeight: 1.6,
            }}
          >
            {fullPrompt.system}
          </Paper>
        </CardContent>
      </Card>

      {/* User Prompt */}
      <Card sx={{ mb: 2 }}>
        <CardHeader title="User Prompt (Sample)" />
        <Divider />
        <CardContent>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '200px',
              overflow: 'auto',
              lineHeight: 1.6,
            }}
          >
            {fullPrompt.user}
          </Paper>
        </CardContent>
      </Card>

      {/* Expected JSON Output */}
      <Card sx={{ mb: 2 }}>
        <CardHeader title="Expected JSON Response Structure" />
        <Divider />
        <CardContent>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {categories.map((cat) => (
              <Box key={cat.id} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'action.hover',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    flex: 1,
                  }}
                >
                  "{cat.name}":
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    fontFamily: 'monospace',
                  }}
                >
                  string | null
                </Typography>
              </Box>
            ))}
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: '#f5f5f5',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              overflow: 'auto',
              lineHeight: 1.6,
            }}
          >
            {JSON.stringify(expectedOutput, null, 2)}
          </Paper>
        </CardContent>
      </Card>

      {/* Categories Summary */}
      <Card sx={{ mb: 2 }}>
        <CardHeader title="Categories Summary" />
        <Divider />
        <CardContent>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                icon={<CheckCircleIcon />}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Copy Button */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={copied ? <CheckCircleIcon /> : <FileCopyIcon />}
          onClick={handleCopyPrompt}
          sx={{
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? 'Copied!' : 'Copy Full Prompt'}
        </Button>
      </Box>
    </Box>
  );
};

export default PromptPreview;