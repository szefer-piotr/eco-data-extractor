// frontend/src/components/categories/CategoryForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Category } from '@api-types/extraction';
import { useExtractionStore } from '@store/extractionStore';

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  editingCategory?: Category | null;
}

const PROMPT_TEMPLATE_HINT = '{text}';
const MAX_CATEGORY_NAME = 50;
const MAX_PROMPT_LENGTH = 2000;

const CategoryForm: React.FC<CategoryFormProps> = ({
  open,
  onClose,
  editingCategory = null,
}) => {
  const { addCategory, updateCategory } = useExtractionStore();
  const [formData, setFormData] = useState<Partial<Category>>({
    id: '',
    name: '',
    prompt: '',
    expectedValues: [],
  });
  const [newValue, setNewValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form with editing category
  useEffect(() => {
    if (editingCategory) {
      setFormData(editingCategory);
    } else {
      setFormData({
        id: `cat_${Date.now()}`,
        name: '',
        prompt: '',
        expectedValues: [],
      });
    }
    setErrors({});
    setTouched({});
    setNewValue('');
  }, [editingCategory, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length > MAX_CATEGORY_NAME) {
      newErrors.name = `Category name must be ${MAX_CATEGORY_NAME} characters or less`;
    }

    if (!formData.prompt?.trim()) {
      newErrors.prompt = 'Prompt is required';
    } else if (!formData.prompt.includes(PROMPT_TEMPLATE_HINT)) {
      newErrors.prompt = `Prompt must include "${PROMPT_TEMPLATE_HINT}" template variable`;
    } else if (formData.prompt.length > MAX_PROMPT_LENGTH) {
      newErrors.prompt = `Prompt must be ${MAX_PROMPT_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleAddValue = () => {
    const trimmedValue = newValue.trim();
    if (!trimmedValue) return;

    if (!formData.expectedValues) {
      formData.expectedValues = [];
    }

    if (formData.expectedValues.includes(trimmedValue)) {
      setErrors((prev) => ({ ...prev, value: 'This value already exists' }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      expectedValues: [...(prev.expectedValues || []), trimmedValue],
    }));
    setNewValue('');
    setErrors((prev) => {
      const { value, ...rest } = prev;
      return rest;
    });
  };

  const handleRemoveValue = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      expectedValues: (prev.expectedValues || []).filter((_, i) => i !== index),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue();
    }
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, formData);
    } else {
      addCategory(formData as Category);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingCategory ? 'Edit Category' : 'Add New Category'}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {/* Category Name */}
          <TextField
            label="Category Name"
            name="name"
            value={formData.name || ''}
            onChange={handleInputChange}
            onBlur={() => handleBlur('name')}
            error={Boolean(errors.name) && touched.name}
            helperText={touched.name && errors.name}
            placeholder="e.g., Sentiment, Location, Topic"
            fullWidth
            disabled={!!editingCategory}
          />

          {/* Prompt */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Prompt Template
              <Typography
                component="span"
                sx={{ color: 'error.main', ml: 0.5 }}
              >
                *
              </Typography>
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
              Use <code>{PROMPT_TEMPLATE_HINT}</code> placeholder for the text content
            </Typography>
            <TextField
              name="prompt"
              value={formData.prompt || ''}
              onChange={handleInputChange}
              onBlur={() => handleBlur('prompt')}
              error={Boolean(errors.prompt) && touched.prompt}
              helperText={
                touched.prompt && errors.prompt
                  ? errors.prompt
                  : `${formData.prompt?.length || 0}/${MAX_PROMPT_LENGTH}`
              }
              multiline
              rows={4}
              placeholder={`Analyze the following text and extract the ${formData.name || 'category'}:\n\nText: ${PROMPT_TEMPLATE_HINT}\n\nProvide your analysis...`}
              fullWidth
            />
          </Box>

          {/* Expected Values */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Expected Values (Optional)
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
              Add possible values this category might return
            </Typography>

            {/* Add Value Input */}
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a value"
                fullWidth
                error={Boolean(errors.value)}
                helperText={errors.value}
              />
              <Button
                variant="outlined"
                onClick={handleAddValue}
                startIcon={<AddIcon />}
                disabled={!newValue.trim()}
              >
                Add
              </Button>
            </Stack>

            {/* Expected Values Display */}
            {formData.expectedValues && formData.expectedValues.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {formData.expectedValues.map((value, index) => (
                  <Chip
                    key={index}
                    label={value}
                    onDelete={() => handleRemoveValue(index)}
                    deleteIcon={<DeleteIcon />}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ pt: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.name?.trim()}
        >
          {editingCategory ? 'Update' : 'Add'} Category
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryForm;