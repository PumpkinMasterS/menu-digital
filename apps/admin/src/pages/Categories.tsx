import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { CategoriesAPI } from '../api';

interface Category {
  _id?: string;
  name: string;
  description?: string;
  order?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Category | null>(null);

  const fetchCategories = async () => {
    try {
      const data = await CategoriesAPI.list();
      const items = Array.isArray(data) ? data : (data as any).items;
      setCategories(items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpen = (cat?: Category) => {
    setCurrent(
      cat || {
        name: '',
        description: '',
        order: 0,
        imageUrl: '',
        isActive: true,
      }
    );
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrent(null);
  };

  const handleChange = (field: keyof Category, value: any) => {
    setCurrent((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!current) return;
    try {
      if (current._id) {
        await CategoriesAPI.update(current._id, {
          name: current.name,
          description: current.description,
          order: current.order,
          imageUrl: current.imageUrl,
          isActive: current.isActive,
        });
      } else {
        await CategoriesAPI.create({
          name: current.name,
          description: current.description,
          order: current.order,
          imageUrl: current.imageUrl,
          isActive: current.isActive,
        });
      }
      await fetchCategories();
      handleClose();
    } catch (e) {
      console.error(e);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', flex: 1 },
    { field: 'description', headerName: 'Descrição', flex: 1 },
    { field: 'order', headerName: 'Ordem', width: 120 },
    { field: 'imageUrl', headerName: 'Imagem', flex: 1 },
    { field: 'isActive', headerName: 'Ativo', width: 120, valueGetter: (params) => (params.row.isActive ? 'Sim' : 'Não') },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 160,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined" onClick={() => handleOpen(params.row)}>Editar</Button>
        </Box>
      ),
    },
  ];

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <h2>Categorias</h2>
        <Button variant="contained" onClick={() => handleOpen()}>Nova Categoria</Button>
      </Box>
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={categories.map((c) => ({ id: c._id || c.name, ...c }))}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
        />
      </div>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{current?._id ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nome" value={current?.name || ''} onChange={(e) => handleChange('name', e.target.value)} />
            <TextField label="Descrição" value={current?.description || ''} onChange={(e) => handleChange('description', e.target.value)} />
            <TextField type="number" label="Ordem" value={current?.order ?? 0} onChange={(e) => handleChange('order', Number(e.target.value))} />
            <TextField label="URL da Imagem" value={current?.imageUrl || ''} onChange={(e) => handleChange('imageUrl', e.target.value)} />
            <FormControlLabel control={<Checkbox checked={!!current?.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} />} label="Ativo" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}