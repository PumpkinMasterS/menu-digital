import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { 
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, 
  TextField, Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import { ProductsAPI, uploadImage, apiGet, apiPut } from '../api';

interface Product {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity?: number;
  imageUrl?: string;
  categoryId?: string;
  isActive?: boolean;
  composition?: {
    pricingStrategy?: string;
    modifierGroupIds?: string[];
    variantGroupIds?: string[];
  };
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [modifierGroups, setModifierGroups] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      const data = await ProductsAPI.list();
      const items = Array.isArray(data) ? data : (data as any).items;
      setProducts(items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    apiGet<any[]>('/v1/admin/categories').then((data) => setCategories(data || [])).catch(console.error);
    apiGet<{ items: any[] }>('/v1/admin/modifiers').then((data) => setModifierGroups(data.items || [])).catch(console.error);
  }, []);

  const handleOpen = (prod?: Product) => {
    setCurrent(
      prod || {
        name: '',
        description: '',
        price: 0,
        stockQuantity: 0,
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

  const handleChange = (field: keyof Product, value: any) => {
    setCurrent((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!current) return;
    try {
      const payload: any = {
        name: current.name,
        description: current.description,
        price: current.price,
        stockQuantity: current.stockQuantity,
        imageUrl: current.imageUrl,
        categoryId: current.categoryId,
        isActive: current.isActive,
      };
      const id = current.id || current._id;
      if (id) {
        await ProductsAPI.update(id, payload);
        if (current.composition) {
          await apiPut(`/v1/admin/products/${id}/modifiers`, {
            groupIds: current.composition.modifierGroupIds || [],
          });
        }
      } else {
        const created = await ProductsAPI.create(payload);
        if (current.composition && created.id) {
          await apiPut(`/v1/admin/products/${created.id}/modifiers`, {
            groupIds: current.composition.modifierGroupIds || [],
          });
        }
      }
      await fetchProducts();
      handleClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageFile = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      try {
        const { imageUrl } = await uploadImage(base64);
        handleChange('imageUrl', imageUrl);
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsDataURL(file);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', flex: 1 },
    { field: 'description', headerName: 'Descrição', flex: 1 },
    { field: 'price', headerName: 'Preço', width: 120 },
    { field: 'stockQuantity', headerName: 'Stock', width: 120 },
    { field: 'imageUrl', headerName: 'Imagem', flex: 1 },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 180,
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
        <h2>Produtos</h2>
        <Button variant="contained" onClick={() => handleOpen()}>Novo Produto</Button>
      </Box>
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={products.map((p) => ({ id: p.id || p._id || p.name, ...p }))}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
        />
      </div>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{(current?.id || current?._id) ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nome" value={current?.name || ''} onChange={(e) => handleChange('name', e.target.value)} />
            <TextField label="Descrição" value={current?.description || ''} onChange={(e) => handleChange('description', e.target.value)} />
            <TextField type="number" label="Preço" value={current?.price ?? 0} onChange={(e) => handleChange('price', Number(e.target.value))} />
            <TextField type="number" label="Stock" value={current?.stockQuantity ?? 0} onChange={(e) => handleChange('stockQuantity', Number(e.target.value))} />
            
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={current?.categoryId || ''}
                onChange={(e) => handleChange('categoryId', e.target.value)}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id || cat._id} value={cat.id || cat._id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Grupos de Modificadores</InputLabel>
              <Select
                multiple
                value={current?.composition?.modifierGroupIds || []}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? [e.target.value] : e.target.value;
                  setCurrent(current ? {
                    ...current,
                    composition: { ...current.composition, modifierGroupIds: value }
                  } : null);
                }}
                renderValue={(selected) => (
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {selected.map((id: string) => {
                      const group = modifierGroups.find((g) => (g.id || g._id) === id);
                      return <Chip key={id} label={group?.name || id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {modifierGroups.map((group) => (
                  <MenuItem key={group.id || group._id} value={group.id || group._id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField label="URL da Imagem" value={current?.imageUrl || ''} onChange={(e) => handleChange('imageUrl', e.target.value)} />
            <input type="file" accept="image/*" onChange={(e) => e.target.files && handleImageFile(e.target.files[0])} />
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