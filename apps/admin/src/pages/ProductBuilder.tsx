import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Restaurant as RestaurantIcon,
  LocalDrink as DrinkIcon,
  Fastfood as FastfoodIcon,
  Photo as PhotoIcon
} from '@mui/icons-material';
import { apiGet, apiPost, apiPatch, uploadImage } from '../api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  categoryId?: string;
  isActive: boolean;
  order?: number;
  composition?: {
    pricingStrategy: string;
    modifierGroupIds?: string[];
    includedItems?: Array<{ productId: string; quantity: number }>;
  };
}

interface Category {
  id: string;
  name: string;
  order?: number;
  isActive: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  type: string;
  options: Array<{ id: string; label: string; priceDelta: number }>;
}

export default function ProductBuilder() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [includedProducts, setIncludedProducts] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [prodRes, catRes, modRes] = await Promise.all([
        apiGet<{ items: Product[] }>('/v1/admin/products'),
        apiGet<Category[]>('/v1/admin/categories'),
        apiGet<{ items: ModifierGroup[] }>('/v1/admin/modifiers')
      ]);
      setProducts(prodRes.items || []);
      setCategories(catRes || []);
      setModifierGroups(modRes.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  function handleOpenDialog(product?: Product) {
    if (product) {
      setCurrentProduct(product);
      setSelectedModifiers(product.composition?.modifierGroupIds || []);
      setIncludedProducts(product.composition?.includedItems || []);
      setImagePreview(product.imageUrl || '');
    } else {
      setCurrentProduct({
        id: '',
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        categoryId: selectedCategory !== 'all' ? selectedCategory : '',
        isActive: true,
        composition: { pricingStrategy: 'base_plus_modifiers' }
      });
      setSelectedModifiers([]);
      setIncludedProducts([]);
      setImagePreview('');
    }
    setOpenDialog(true);
  }

  async function handleSave() {
    if (!currentProduct) return;

    try {
      const payload = {
        ...currentProduct,
        composition: {
          pricingStrategy: includedProducts.length > 0 ? 'combo_fixed_with_modifiers' : 'base_plus_modifiers',
          modifierGroupIds: selectedModifiers,
          includedItems: includedProducts
        }
      };

      if (currentProduct.id) {
        await apiPatch(`/v1/admin/products/${currentProduct.id}`, payload);
      } else {
        await apiPost('/v1/admin/products', payload);
      }

      await loadData();
      setOpenDialog(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleImageUpload(file: File) {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const { imageUrl } = await uploadImage(base64);
        setImagePreview(imageUrl);
        setCurrentProduct(prev => prev ? { ...prev, imageUrl } : null);
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleDragEnd(result: any) {
    if (!result.destination) return;
    
    const items = Array.from(filteredProducts);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    const reordered_with_order = items.map((item, idx) => ({ ...item, order: idx }));
    setProducts(prev => prev.map(p => {
      const found = reordered_with_order.find(r => r.id === p.id);
      return found || p;
    }));
  }

  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.categoryId === selectedCategory)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          🍔 Gestor de Produtos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            px: 3
          }}
        >
          Novo Produto
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
        <Tabs
          value={selectedCategory}
          onChange={(_, val) => setSelectedCategory(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="📋 Todos" value="all" />
          {categories.map(cat => (
            <Tab key={cat.id} label={cat.name} value={cat.id} />
          ))}
        </Tabs>
      </Paper>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="products">
          {(provided) => (
            <Box display="flex" flexWrap="wrap" gap={2} {...provided.droppableProps} ref={provided.innerRef}>
              {filteredProducts.map((product, index) => (
                <Draggable key={product.id} draggableId={product.id} index={index}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)', lg: 'calc(25% - 12px)' } }}
                    >
                      <Card 
                        sx={{ 
                          borderRadius: 3,
                          position: 'relative',
                          transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                          boxShadow: snapshot.isDragging ? 6 : 2,
                          transition: 'all 0.2s'
                        }}
                      >
                        <Box {...provided.dragHandleProps} sx={{ position: 'absolute', top: 8, left: 8, cursor: 'grab', zIndex: 1 }}>
                          <DragIcon sx={{ color: 'grey.400' }} />
                        </Box>

                        {product.imageUrl ? (
                          <Box
                            sx={{
                              height: 180,
                              backgroundImage: `url(${product.imageUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              position: 'relative'
                            }}
                          >
                            {!product.isActive && (
                              <Chip label="Inativo" size="small" color="error" sx={{ position: 'absolute', top: 8, right: 8 }} />
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ height: 180, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FastfoodIcon sx={{ fontSize: 60, color: 'white', opacity: 0.5 }} />
                          </Box>
                        )}

                        <CardContent>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {product.name}
                          </Typography>
                          {product.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {product.description.length > 60 ? product.description.substring(0, 60) + '...' : product.description}
                            </Typography>
                          )}
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              €{product.price?.toFixed(2) || '0.00'}
                            </Typography>
                            <IconButton size="small" onClick={() => handleOpenDialog(product)} color="primary">
                              <EditIcon />
                            </IconButton>
                          </Box>
                          {product.composition?.modifierGroupIds && product.composition.modifierGroupIds.length > 0 && (
                            <Box mt={1}>
                              {product.composition.modifierGroupIds.map(id => {
                                const mod = modifierGroups.find(m => m.id === id);
                                return mod ? <Chip key={id} label={mod.name} size="small" sx={{ mr: 0.5, mb: 0.5 }} /> : null;
                              })}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <FastfoodIcon />
            {currentProduct?.id ? 'Editar Produto' : 'Novo Produto'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2, mt: 1 }}>
            <Tab label="📝 Básico" />
            <Tab label="🎨 Modificadores" />
            <Tab label="🍽️ Combo" />
          </Tabs>

          {tabValue === 0 && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-upload"
                    type="file"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                  />
                  <label htmlFor="image-upload">
                    <Box
                      sx={{
                        width: 200,
                        height: 200,
                        border: '2px dashed #ddd',
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backgroundImage: imagePreview ? `url(${imagePreview})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                    >
                      {!imagePreview && <PhotoIcon sx={{ fontSize: 60, color: 'grey.400' }} />}
                    </Box>
                  </label>
                </Box>
                <Box flex={2} display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Nome do Produto"
                    fullWidth
                    value={currentProduct?.name || ''}
                    onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                  <TextField
                    label="Descrição"
                    fullWidth
                    multiline
                    rows={3}
                    value={currentProduct?.description || ''}
                    onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                  <TextField
                    label="Preço (€)"
                    type="number"
                    fullWidth
                    value={currentProduct?.price || 0}
                    onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, price: Number(e.target.value) } : null)}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentProduct?.isActive || false}
                        onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                      />
                    }
                    label="Produto Ativo"
                  />
                </Box>
              </Box>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                Selecione os modificadores disponíveis:
              </Typography>
              <List>
                {modifierGroups.map(group => (
                  <ListItem
                    key={group.id}
                    button
                    onClick={() => {
                      if (selectedModifiers.includes(group.id)) {
                        setSelectedModifiers(prev => prev.filter(id => id !== group.id));
                      } else {
                        setSelectedModifiers(prev => [...prev, group.id]);
                      }
                    }}
                    sx={{
                      border: '1px solid',
                      borderColor: selectedModifiers.includes(group.id) ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: selectedModifiers.includes(group.id) ? 'primary.50' : 'transparent'
                    }}
                  >
                    <ListItemText
                      primary={group.name}
                      secondary={`${group.options.length} opções • Tipo: ${group.type === 'extra' ? 'Extra' : 'Variante'}`}
                    />
                    <ListItemSecondaryAction>
                      {selectedModifiers.includes(group.id) && <Chip label="✓" color="primary" size="small" />}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                Incluir produtos no combo:
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Ex: Menu Big Mac = Big Mac + Batatas + Bebida
              </Typography>
              <List>
                {products.filter(p => p.id !== currentProduct?.id).map(product => {
                  const included = includedProducts.find(i => i.productId === product.id);
                  return (
                    <ListItem
                      key={product.id}
                      sx={{
                        border: '1px solid',
                        borderColor: included ? 'success.main' : 'divider',
                        borderRadius: 2,
                        mb: 1,
                        bgcolor: included ? 'success.50' : 'transparent'
                      }}
                    >
                      <Avatar src={product.imageUrl} sx={{ mr: 2 }}>
                        <FastfoodIcon />
                      </Avatar>
                      <ListItemText
                        primary={product.name}
                        secondary={`€${product.price?.toFixed(2)}`}
                      />
                      <Box display="flex" gap={1} alignItems="center">
                        {included ? (
                          <>
                            <TextField
                              type="number"
                              size="small"
                              value={included.quantity}
                              onChange={(e) => {
                                const qty = Number(e.target.value);
                                setIncludedProducts(prev =>
                                  prev.map(i => i.productId === product.id ? { ...i, quantity: qty } : i)
                                );
                              }}
                              sx={{ width: 80 }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setIncludedProducts(prev => prev.filter(i => i.productId !== product.id))}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setIncludedProducts(prev => [...prev, { productId: product.id, quantity: 1 }])}
                          >
                            Adicionar
                          </Button>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

