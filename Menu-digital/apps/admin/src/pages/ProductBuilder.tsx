import React, { useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

// Componente SortableItem para produtos arrastáveis
function SortableItem({ id, children }: { id: string; children: React.ReactElement }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {React.cloneElement(children, { 
        dragHandleProps: listeners,
        dragAttributes: attributes,
        isDragging
      })}
    </div>
  );
}

// Componente SortableCategoryChip para categorias arrastáveis (chips)
function SortableCategoryChip({ id, children }: { id: string; children: React.ReactElement }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// Componente ProductCard para encapsular a lógica do card de produto
function ProductCard({ product, index, modifierGroups, handleOpenDialog, dragHandleProps, isDragging }: { 
  product: Product; 
  index: number; 
  modifierGroups: ModifierGroup[]; 
  handleOpenDialog: (product?: Product) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}) {
  const productId = product.id || `product-${index}`;
  
  return (
    <Box
      sx={{ 
        // Reduzir tamanho para caber aproximadamente o dobro de cartões
        width: { xs: '100%', sm: 'calc(33.333% - 12px)', md: 'calc(25% - 12px)', lg: 'calc(20% - 12px)' },
        minWidth: { xs: '100%', sm: '160px', md: '160px', lg: '160px' },
        mb: 3
      }}
    >
      <Card 
        sx={{ 
          borderRadius: 3,
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDragging ? '0 16px 32px rgba(0,0,0,0.2)' : '0 6px 16px rgba(0,0,0,0.12)',
          transition: isDragging ? 'none' : 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          overflow: 'hidden',
          transform: isDragging ? 'scale(1.05)' : 'none',
          '&:hover': {
            transform: isDragging ? 'scale(1.05)' : 'translateY(-6px)',
            boxShadow: isDragging ? '0 16px 32px rgba(0,0,0,0.2)' : '0 12px 28px rgba(0,0,0,0.16)'
          }
        }}
      >
        <Box sx={{ position: 'absolute', top: 12, left: 12, cursor: 'grab', zIndex: 1, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '50%', p: 0.5, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} {...dragHandleProps}>
          <DragIcon sx={{ color: 'grey.700', fontSize: 22 }} />
        </Box>

        {product.imageUrl ? (
          <Box
            sx={{
              height: 120,
              backgroundImage: `url(${product.imageUrl.startsWith('http') ? product.imageUrl : `http://localhost:3000${product.imageUrl}`})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              borderBottom: '1px solid rgba(0,0,0,0.08)'
            }}
            onError={(e) => {
              // Se a imagem não carregar, substitui pelo gradiente
              e.currentTarget.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }}
          >
            {!product.isActive && (
              <Chip 
                label="Inativo" 
                size="small" 
                color="error" 
                sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 'bold' }} 
              />
            )}
          </Box>
        ) : (
          <Box
            sx={{
              height: 120,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.08)'
            }}
          >
            {!product.isActive && (
              <Chip 
                label="Inativo" 
                size="small" 
                color="error" 
                sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 'bold' }} 
              />
            )}
          </Box>
        )}

        <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1rem', lineHeight: 1.25 }}>
            {product.name}
          </Typography>
          {product.description && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', mb: 1.5, lineHeight: 1.4, flexGrow: 1 }}>
              {product.description.length > 80 ? product.description.substring(0, 80) + '...' : product.description}
            </Typography>
          )}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Typography variant="h6" color="primary" fontWeight="bold" sx={{ fontSize: '1.2rem' }}>
              €{product.price?.toFixed(2) || '0.00'}
            </Typography>
            <IconButton 
              size="large" 
              onClick={() => handleOpenDialog(product)} 
              color="primary"
              sx={{ 
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                width: 40,
                height: 40,
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.2)'
                }
              }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          {/* Chips de modificadores removidos para evitar variação de altura e espaços visuais */}
        </CardContent>
      </Card>
    </Box>
  );
}

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
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { apiGet, apiPost, apiPatch, uploadImage, CategoriesAPI } from '../api';

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
  const [imagePreview, setImagePreview] = useState('');
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [prodRes, catRes, modRes] = await Promise.all([
        apiGet<any>('/v1/admin/products'),
        apiGet<any>('/v1/admin/categories'),
        apiGet<any>('/v1/admin/modifiers')
      ]);
      const productsRaw = Array.isArray(prodRes) ? prodRes : (prodRes?.items || []);
      const productsData = productsRaw.map((product: any, index: number) => ({
        ...product,
        id: product.id || product._id || `product-${index}`
      }));
      setProducts(productsData);

      const categoriesRaw = Array.isArray(catRes) ? catRes : (catRes?.items || []);
      const mappedCategories = categoriesRaw
        .map((c: any) => ({ id: c.id || c._id, name: c.name, order: Number(c.order ?? 0), isActive: c.isActive ?? true }))
        .sort((a: Category, b: Category) => (a.order || 0) - (b.order || 0));
      setCategories(mappedCategories);

      const modifiersRaw = Array.isArray(modRes) ? modRes : (modRes?.items || []);
      const mappedModifiers: ModifierGroup[] = modifiersRaw.map((g: any, idx: number) => ({
        id: g.id || g._id || `mod-${idx}`,
        name: g.name,
        type: g.type || 'extra',
        options: (g.options || []).map((opt: any, i: number) => ({
          id: opt.id || `opt-${i}`,
          label: opt.label ?? opt.name ?? '',
          priceDelta: Number(opt.priceDelta ?? 0),
        }))
      }));
      setModifierGroups(mappedModifiers);
    } catch (e) {
      console.error(e);
    }
  }

  // Sensores para detectar arrastar com mouse e toque
  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  // Função para lidar com o fim do arrastar (reordena dentro da mesma categoria)
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeProduct = products.find(p => p.id === active.id);
    const overProduct = products.find(p => p.id === over.id);
    if (!activeProduct || !overProduct) return;

    // Apenas reordenar se ambos forem da mesma categoria
    if ((activeProduct.categoryId || '') !== (overProduct.categoryId || '')) return;

    const categoryId = activeProduct.categoryId || '';
    const categoryProducts = products
      .filter(p => (p.categoryId || '') === categoryId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const oldIndex = categoryProducts.findIndex(item => item.id === active.id);
    const newIndex = categoryProducts.findIndex(item => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(categoryProducts, oldIndex, newIndex)
      .map((item, idx) => ({ ...item, order: idx }));

    setProducts(prev => {
      const otherProducts = prev.filter(p => (p.categoryId || '') !== categoryId);
      return [...otherProducts, ...reordered];
    });
  }

  // Reordenar categorias (drag-and-drop dos chips) e persistir ordem
  async function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === String(active.id));
    const newIndex = categories.findIndex((c) => c.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(categories, oldIndex, newIndex).map((c, idx) => ({ ...c, order: idx + 1 }));
    setCategories(reordered);

    // Persistir nova ordem no backend para refletir no menu digital
    try {
      for (const cat of reordered) {
        await CategoriesAPI.update(cat.id, { order: cat.order });
      }
    } catch (e) {
      console.error('Falha ao salvar ordem das categorias:', e);
    }
  }

  function handleOpenDialog(product?: Product) {
    if (product) {
      setCurrentProduct(product);
      setSelectedModifiers(product.composition?.modifierGroupIds || []);
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
          pricingStrategy: 'base_plus_modifiers',
          modifierGroupIds: selectedModifiers
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
        // Garantir que a URL da imagem seja relativa para funcionar com o proxy
        const relativeImageUrl = imageUrl.startsWith('http') ? imageUrl : imageUrl;
        setImagePreview(relativeImageUrl);
        setCurrentProduct(prev => prev ? { ...prev, imageUrl: relativeImageUrl } : null);
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveCategory() {
    if (!currentCategory) return;

    try {
      if (currentCategory.id) {
        await CategoriesAPI.update(currentCategory.id, currentCategory);
      } else {
        await CategoriesAPI.create(currentCategory);
      }
      
      // Recarregar categorias
      const updatedCategories = await apiGet<Category[]>('/v1/admin/categories');
      setCategories(updatedCategories || []);
      
      setOpenCategoryDialog(false);
      setCurrentCategory(null);
    } catch (e) {
      console.error(e);
    }
  }

  function handleOpenCategoryDialog(category?: Category) {
    if (category) {
      setCurrentCategory(category);
    } else {
      setCurrentCategory({
        id: '',
        name: '',
        isActive: true
      });
    }
    setOpenCategoryDialog(true);
  }

  function handleCloseCategoryDialog() {
    setOpenCategoryDialog(false);
    setCurrentCategory(null);
  }

  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.categoryId === selectedCategory)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Agrupar produtos por categoria para exibição visual
  const displayCategories = (selectedCategory === 'all'
    ? [...categories].sort((a, b) => (a.order || 0) - (b.order || 0))
    : categories.filter(c => c.id === selectedCategory))
    .map(c => ({
      ...c,
      products: products.filter(p => (p.categoryId || '') === c.id).sort((a, b) => (a.order || 0) - (b.order || 0))
    }));

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Gestor de Produtos
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

      {/* Seção de Categorias */}
      <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            Categorias
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentCategory({
                id: '',
                name: '',
                isActive: true
              });
              setOpenCategoryDialog(true);
            }}
            sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 2
            }}
          >
            Nova Categoria
          </Button>
        </Box>
        <DndContext sensors={sensors} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {categories.map((cat) => (
                <SortableCategoryChip key={cat.id} id={cat.id}>
                  <Chip
                    label={cat.name}
                    color={selectedCategory === cat.id ? 'primary' : 'default'}
                    onClick={() => setSelectedCategory(cat.id)}
                    sx={{ mb: 1, cursor: 'grab' }}
                  />
                </SortableCategoryChip>
              ))}
              <Chip
                label="Todos"
                color={selectedCategory === 'all' ? 'primary' : 'default'}
                onClick={() => setSelectedCategory('all')}
                sx={{ mb: 1 }}
              />
            </Box>
          </SortableContext>
        </DndContext>
      </Paper>

      {/* Seção de Produtos agrupados por categoria */}
      <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Produtos por Categoria
        </Typography>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {displayCategories.map((cat) => (
            <Box key={cat.id} sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">{cat.name}</Typography>
                <Divider sx={{ flexGrow: 1, ml: 2 }} />
              </Box>
              <SortableContext items={cat.products.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <Box display="flex" flexWrap="wrap" gap={2} sx={{ p: 2 }}>
                  {cat.products.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Sem produtos nesta categoria</Typography>
                  ) : (
                    cat.products.map((product, index) => {
                      const productId = product.id || `product-${index}`;
                      return (
                        <SortableItem key={productId} id={productId}>
                          <ProductCard 
                            product={product} 
                            index={index} 
                            modifierGroups={modifierGroups} 
                            handleOpenDialog={handleOpenDialog} 
                          />
                        </SortableItem>
                      );
                    })
                  )}
                </Box>
              </SortableContext>
            </Box>
          ))}
        </DndContext>
      </Paper>

      {/* Seção de Modificadores removida visualmente conforme solicitado */}

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
            {currentProduct?.id ? 'Editar Produto' : 'Novo Produto'}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
          >
            <Tab label="Detalhes" value={0} />
            <Tab label="Modificadores" value={1} />
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
                        width: 150,
                        height: 150,
                        border: '2px dashed #ddd',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backgroundImage: imagePreview ? `url(${imagePreview.startsWith('http') ? imagePreview : `http://localhost:3000${imagePreview}`})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                    >
                      {/* Ícone removido para manter visual sóbrio */}
                    </Box>
                  </label>
                </Box>
                <Box flex={2} display="flex" flexDirection="column" gap={1.5}>
                  <TextField
                    label="Nome do Produto"
                    fullWidth
                    size="small"
                    value={currentProduct?.name || ''}
                    onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                  <TextField
                    label="Descrição"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={currentProduct?.description || ''}
                    onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                  <TextField
                    label="Preço (€)"
                    type="number"
                    fullWidth
                    size="small"
                    value={currentProduct?.price || 0}
                    onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, price: Number(e.target.value) } : null)}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentProduct?.isActive || false}
                        onChange={(e) => setCurrentProduct(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                        size="small"
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
              <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
                Modificadores disponíveis:
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Selecione os modificadores para este produto
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {modifierGroups.map(group => (
                  <ListItem
                    key={group.id}
                    component="div"
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
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: selectedModifiers.includes(group.id) ? 'primary.50' : 'transparent',
                      py: 0.5
                    }}
                  >
                    <ListItemText
                      primary={group.name}
                      secondary={`${group.options.length} opções`}
                      primaryTypographyProps={{ fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ fontSize: '0.8rem' }}
                    />
                    <ListItemSecondaryAction>
                      {selectedModifiers.includes(group.id) && <Chip label="✓" color="primary" size="small" sx={{ fontSize: '0.7rem', height: 18 }} />}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} size="small">
            Cancelar
                          </Button>
          <Button variant="contained" onClick={handleSave} size="small">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para criar/editar categorias */}
      <Dialog 
        open={openCategoryDialog} 
        onClose={handleCloseCategoryDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          {currentCategory?.id ? 'Editar Categoria' : 'Nova Categoria'}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nome da Categoria"
              fullWidth
              value={currentCategory?.name || ''}
              onChange={(e) => setCurrentCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={currentCategory?.isActive || false}
                  onChange={(e) => setCurrentCategory(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                  size="small"
                />
              }
              label="Categoria Ativa"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseCategoryDialog} size="small">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveCategory} size="small">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

