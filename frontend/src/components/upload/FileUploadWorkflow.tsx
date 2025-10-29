// frontend/src/components/upload/FileUploadWorkflow.tsx
import React, { useState } from 'react';
import { Box, Step, Stepper, StepLabel, Button, Stack } from '@mui/material';
import FileUploader from './FileUploader';
import FilePreview from './FilePreview';
import ColumnSelector from './ColumnSelector';
import { UploadedFile } from '@api-types/extraction';
import { fileApi, CSVParseResult } from '@services/fileApi';
import useExtractionStore from '@store/extractionStore';

type UploadStep = 'upload' | 'preview' | 'configure';

interface FileUploadWorkflowProps {
  onComplete?: () => void;
}

const FileUploadWorkflow: React.FC<FileUploadWorkflowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<UploadStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const { setFile, idColumn, textColumn, setIdColumn, setTextColumn } =
    useExtractionStore();

  const handleFileSelect = async (file: File, fileType: 'csv' | 'pdf') => {
    setIsLoading(true);
    setError(null);

    try {
      let preview;
      if (fileType === 'csv') {
        const csvResult = await fileApi.parseCSV(file);
        preview = {
          columns: csvResult.columns,
          sampleRows: csvResult.sampleRows,
        };
      } else {
        const pdfResult = await fileApi.parsePDF(file);
        preview = {
          pageCount: pdfResult.pageCount,
        };
      }

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: fileType,
        preview,
      };

      setUploadedFile(uploadedFile);
      setFile(uploadedFile);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFile(null);
    setStep('upload');
    setIdColumn(null);
    setTextColumn(null);
  };

  const handleNext = () => {
    if (step === 'preview') {
      if (uploadedFile?.type === 'csv') {
        setStep('configure');
      } else {
        onComplete?.();
      }
    } else if (step === 'configure') {
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (step === 'configure') {
      setStep('preview');
    } else if (step === 'preview') {
      setStep('upload');
    }
  };

  const isConfigureDisabled = 
    uploadedFile?.type === 'csv' && (!idColumn || !textColumn || idColumn === textColumn);

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={step === 'upload' ? 0 : step === 'preview' ? 1 : 2} sx={{ mb: 4 }}>
        <Step>
          <StepLabel>Upload File</StepLabel>
        </Step>
        <Step>
          <StepLabel>Preview</StepLabel>
        </Step>
        <Step>
          <StepLabel>Configure Columns</StepLabel>
        </Step>
      </Stepper>

      <Box sx={{ minHeight: 400 }}>
        {step === 'upload' && (
          <FileUploader
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
            error={error}
            onErrorClear={() => setError(null)}
          />
        )}

        {step === 'preview' && uploadedFile && (
          <FilePreview file={uploadedFile} onRemove={handleRemoveFile} />
        )}

        {step === 'configure' && uploadedFile && (
          <ColumnSelector
            file={uploadedFile}
            idColumn={idColumn}
            textColumn={textColumn}
            onIdColumnChange={setIdColumn}
            onTextColumnChange={setTextColumn}
          />
        )}
      </Box>

      <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'flex-end' }}>
        <Button onClick={handleBack} disabled={step === 'upload'}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          variant="contained"
          disabled={
            isLoading ||
            (step === 'configure' && isConfigureDisabled)
          }
        >
          {step === 'configure' ? 'Continue to Categories' : 'Next'}
        </Button>
      </Stack>
    </Box>
  );
};

export default FileUploadWorkflow;