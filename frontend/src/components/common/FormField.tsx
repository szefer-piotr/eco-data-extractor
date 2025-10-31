import React from 'react';
import { TextField, FormHelperText, Box, Typography, FormControl } from '@mui/material';

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  autoFocus?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  type = 'text',
  placeholder,
  helperText,
  disabled = false,
  multiline = false,
  rows,
  autoFocus = false,
}) => {
  return (
    <FormControl fullWidth error={!!error} sx={{ mb: 2 }}>
      <label htmlFor={name} style={{ marginBottom: '8px', display: 'block' }}>
        <Typography variant="subtitle2" component="span" sx={{ fontWeight: 500 }}>
          {label}
          {required && <span style={{ color: '#d32f2f', marginLeft: '4px' }}>*</span>}
        </Typography>
      </label>
      <TextField
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        disabled={disabled}
        type={type}
        placeholder={placeholder}
        multiline={multiline}
        rows={rows}
        autoFocus={autoFocus}
        fullWidth
        size="small"
        aria-label={label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:focus-within': {
              outline: '2px solid #1976d2',
              outlineOffset: '2px',
            },
          },
        }}
      />
      {error && (
        <FormHelperText id={`${name}-error`} sx={{ color: '#d32f2f', mt: 0.5 }}>
          {error}
        </FormHelperText>
      )}
      {helperText && !error && (
        <FormHelperText id={`${name}-helper`} sx={{ mt: 0.5 }}>
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default FormField;
