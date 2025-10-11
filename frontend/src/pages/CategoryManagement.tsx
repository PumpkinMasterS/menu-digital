import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Box, Switch, FormControlLabel } from '@mui/material';

interface Category {
  id: string;
  name: string;
  description?: string;
  order?: number;
  imageUrl?: string;
  isActive: boolean;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/v1/admin/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleOpen = (category: Category | null) => {
    setEditingCategory(category);
    setFormData(category ? { ...category } : {});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCategory(null);
    setFormData({});
  };

  const handleChange = (field: keyof Category) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, isActive: event.target.checked }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const url = editingCategory
        ? `/v1/admin/categories/${editingCategory.id}`
        : '/v1/admin/categories';
      const method = editingCategory ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save category');

      handleClose();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/v1/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete category');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    { field: 'order', headerName: 'Order', width: 100 },
    { field: 'imageUrl', headerName: 'Image URL', width: 200 },
    { field: 'isActive', headerName: 'Active', width: 100, type: 'boolean' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <>
          <Button onClick={() => handleOpen(params.row as Category)}>Edit</Button>
          <Button onClick={() => handleDelete(params.row.id)}>Delete</Button>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <Button variant="contained" onClick={() => handleOpen(null)} sx={{ mb: 2 }}>
        Add Category
      </Button>
      <DataGrid rows={categories} columns={columns} pageSizeOptions={[5, 10, 25]} />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={formData.name || ''}
            onChange={handleChange('name')}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Description"
            value={formData.description || ''}
            onChange={handleChange('description')}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Order"
            type="number"
            value={formData.order || ''}
            onChange={handleChange('order')}
            fullWidth
            margin="dense"
          />
          <TextField
            label="Image URL"
            value={formData.imageUrl || ''}
            onChange={handleChange('imageUrl')}
            fullWidth
            margin="dense"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive ?? true}
                onChange={handleSwitchChange}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagement;