import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Box } from '@mui/material';
import { Select, MenuItem, FormControl, InputLabel, Chip, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
  stockQuantity: number;
  isActive: boolean;
  modifierGroupIds?: string[];
}

interface ModifierOption {
  name: string;
  price?: number; // usado no formulário
  priceDelta?: number; // usado pelo backend
  isAvailable?: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
  isRequired?: boolean;
  isActive?: boolean;
}

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [modifierOpen, setModifierOpen] = useState(false);
  const [modifierFormData, setModifierFormData] = useState<Partial<ModifierGroup>>({ options: [] });
  const [optionName, setOptionName] = useState('');
  const [optionPrice, setOptionPrice] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchModifierGroups();
  }, []);

  const fetchProducts = async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/v1/admin/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = await response.json();
      // Backend returns { items, page, limit, total } for admin list
      const items = Array.isArray(data) ? data : data.items;
      setProducts(items || []);
    }
  };

  const fetchModifierGroups = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/v1/admin/modifiers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setModifierGroups(data);
      }
    } catch (error) {
      console.error('Error fetching modifier groups:', error);
    }
  };

  const handleOpen = (product?: Product) => {
    setEditingProduct(product || null);
    setFormData(product || {});
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    const token = localStorage.getItem('authToken');
    const url = editingProduct ? `/v1/admin/products/${editingProduct.id}` : '/v1/admin/products';
    const method = editingProduct ? 'PATCH' : 'POST';
    const saveResp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData),
    });
    // If creating, get the id from response
    let productId = editingProduct?.id;
    if (!editingProduct && saveResp.ok) {
      const created = await saveResp.json();
      productId = created.id || created._id;
    }
    // Attach modifier groups to product composition if present
    const groupIds = (formData.modifierGroupIds || []) as string[];
    if (productId && groupIds.length > 0) {
      await fetch(`/v1/admin/products/${productId}/modifiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ groupIds }),
      });
    }
    handleClose();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('authToken');
    await fetch(`/v1/admin/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchProducts();
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', width: 150 },
    { field: 'description', headerName: 'Descrição', width: 200 },
    { field: 'price', headerName: 'Preço', width: 100 },
    { field: 'stockQuantity', headerName: 'Estoque', width: 100 },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 200,
      renderCell: (params) => (
        <>
          <Button onClick={() => handleOpen(params.row as Product)}>Editar</Button>
          <Button onClick={() => handleDelete(params.row.id)}>Excluir</Button>
        </>
      ),
    },
  ];

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async () => {
      const imageBase64 = reader.result as string;
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch('/v1/admin/upload/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ imageBase64 }),
        });
        if (response.ok) {
          const { imageUrl } = await response.json();
          setFormData((prev) => ({ ...prev, imageUrl }));
        }
      } catch (err) {
        console.error('Upload failed', err);
      }
    };
    reader.readAsDataURL(file);
  }
};

const handleModifierOpen = () => {
  setModifierFormData({ name: '', minSelections: 0, maxSelections: 1, options: [] });
  setModifierOpen(true);
};

const handleModifierClose = () => setModifierOpen(false);

const handleModifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setModifierFormData((prev) => ({ ...prev, [name]: name === 'name' ? value : parseInt(value) || 0 }));
};

const handleAddOption = () => {
  if (optionName && optionPrice >= 0) {
    setModifierFormData((prev) => ({
      ...prev,
      options: [...(prev.options || []), { name: optionName, price: optionPrice }]
    }));
    setOptionName('');
    setOptionPrice(0);
  }
};

const handleDeleteOption = (index: number) => {
  setModifierFormData((prev) => ({
    ...prev,
    options: prev.options?.filter((_, i) => i !== index) || []
  }));
};

const handleModifierSave = async () => {
  const token = localStorage.getItem('authToken');
  try {
    const payload = {
      name: modifierFormData.name || '',
      description: (modifierFormData as any).description,
      order: (modifierFormData as any).order,
      options: (modifierFormData.options || []).map((opt) => ({
        name: opt.name,
        priceDelta: opt.price ?? 0,
        isAvailable: true,
      })),
      maxSelections: modifierFormData.maxSelections ?? 1,
      isRequired: (modifierFormData as any).isRequired ?? false,
      isActive: true,
    };
    const response = await fetch('/v1/admin/modifiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const newGroup = await response.json();
      setModifierGroups((prev) => [...prev, newGroup]);
      setFormData((prev) => ({ ...prev, modifierGroupIds: [...(prev.modifierGroupIds || []), newGroup.id] }));
      handleModifierClose();
    }
  } catch (error) {
    console.error('Error saving modifier group:', error);
  }
};

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <Button variant="contained" onClick={() => handleOpen()}>Novo Produto</Button>
      <DataGrid rows={products} columns={columns} />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        <DialogContent>
          <TextField label="Nome" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} fullWidth />
          <TextField label="Descrição" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} fullWidth />
          <TextField label="Preço" type="number" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} fullWidth />
          <TextField label="Categoria ID" value={formData.categoryId || ''} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} fullWidth />
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" style={{ maxWidth: '100%', marginTop: '10px' }} />}
          <TextField label="URL da Imagem" value={formData.imageUrl || ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} fullWidth />
          <TextField label="Estoque" type="number" value={formData.stockQuantity || -1} onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Grupos de Modificadores</InputLabel>
            <Select
              multiple
              value={formData.modifierGroupIds || []}
              onChange={(e) => setFormData((prev) => ({ ...prev, modifierGroupIds: e.target.value as string[] }))}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={modifierGroups.find(g => g.id === value)?.name || ''} />
                  ))}
                </Box>
              )}
            >
              {modifierGroups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button onClick={handleModifierOpen}>Criar Novo Grupo de Modificadores</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={modifierOpen} onClose={handleModifierClose}>
        <DialogTitle>Criar Grupo de Modificadores</DialogTitle>
        <DialogContent>
          <TextField label="Nome" name="name" value={modifierFormData.name || ''} onChange={handleModifierChange} fullWidth />
          <TextField label="Mínimo de Seleções" name="minSelections" type="number" value={modifierFormData.minSelections || 0} onChange={handleModifierChange} fullWidth />
          <TextField label="Máximo de Seleções" name="maxSelections" type="number" value={modifierFormData.maxSelections || 1} onChange={handleModifierChange} fullWidth />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField label="Nome da Opção" value={optionName} onChange={(e) => setOptionName(e.target.value)} />
            <TextField label="Preço" type="number" value={optionPrice} onChange={(e) => setOptionPrice(parseFloat(e.target.value))} />
            <IconButton onClick={handleAddOption}><AddIcon /></IconButton>
          </Box>
          <List>
            {modifierFormData.options?.map((option, index) => (
              <ListItem key={index}>
                <ListItemText primary={`${option.name} - R$${option.price.toFixed(2)}`} />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => handleDeleteOption(index)}><DeleteIcon /></IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModifierClose}>Cancelar</Button>
          <Button onClick={handleModifierSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductManagement;