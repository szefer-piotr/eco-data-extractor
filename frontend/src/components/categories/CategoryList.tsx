// frontend/src/components/categories/CategoryList.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Paper,
  Alert,
  Grid,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Category } from '@api-types/extraction';
import { useExtractionStore } from '@store/extractionStore';
import CategoryForm from './CategoryForm';

interface CategoryListProps {
  categories: Category[];
  onCategoryAdd?: () => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onCategoryAdd,
}) => {
  const { deleteCategory } = useExtractionStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingCategory(null);
    if (onCategoryAdd) {
      onCategoryAdd();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6">Extraction Categories</Typography>
          <Typography variant="body2" color="textSecondary">
            Define {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} for data
            extraction
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add Category
        </Button>
      </Box>

      {/* Empty State */}
      {categories.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="h6" gutterBottom color="textSecondary">
            No categories yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Add at least one category to define what data you want to extract
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
          >
            Create First Category
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {/* Category Cards */}
          {categories.map((category, index) => (
            <Grid item xs={12} sm={6} key={category.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
              >
                {/* Drag Handle */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    bgcolor: 'action.hover',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Tooltip title="Drag to reorder (coming soon)">
                    <DragIndicatorIcon
                      sx={{
                        color: 'action.disabled',
                        mr: 1,
                        cursor: 'grab',
                      }}
                    />
                  </Tooltip>
                  <Typography variant="caption" color="textSecondary">
                    Category {index + 1}
                  </Typography>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Category Name */}
                  <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                    {category.name}
                  </Typography>

                  {/* Prompt Preview */}
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      display="block"
                      color="textSecondary"
                      sx={{ mb: 0.5 }}
                    >
                      Prompt:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        p: 1,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        maxHeight: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {category.prompt}
                    </Typography>
                  </Box>

                  {/* Expected Values */}
                  {category.expectedValues && category.expectedValues.length > 0 && (
                    <Box>
                      <Typography
                        variant="caption"
                        display="block"
                        color="textSecondary"
                        sx={{ mb: 0.5 }}
                      >
                        Expected Values:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {category.expectedValues.map((value, idx) => (
                          <Chip
                            key={idx}
                            label={value}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>

                {/* Actions */}
                <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                  <Tooltip title="Edit category">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(category)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete category">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(category)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Category Form Dialog */}
      <CategoryForm
        open={formOpen}
        onClose={handleFormClose}
        editingCategory={editingCategory}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Category?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category "
            <strong>{categoryToDelete?.name}</strong>"? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryList;