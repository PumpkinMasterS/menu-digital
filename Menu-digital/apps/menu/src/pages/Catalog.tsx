import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Container,
  Button,
  Badge,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  ShoppingCart as CartIcon,
  Restaurant as RestaurantIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useCart } from '../cartContext';
import { getProductComposition, type SelectedOption, getPublicBranding, type PublicBranding, listCategories, listProducts, listModifierGroups, listVariantGroups } from '../api';
import { resolveTableCode } from '../utils/table';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  categoryId?: string;
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchParams] = useSearchParams();
  const tableCode = resolveTableCode(searchParams, window.location.hostname);
  const navigate = useNavigate();
  const { items, addItem } = useCart();
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  
  const dialogPaperRef = useRef<HTMLDivElement | null>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [modifiers, setModifiers] = useState<SelectedOption[]>([]);
  const [variants, setVariants] = useState<SelectedOption[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadBranding();
  }, []);

  async function loadCategories() {
    try {
      const data = await listCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Falha ao carregar categorias:', e);
      setCategories([]);
    }
  }

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const data = await listProducts();
      setProducts(data.items || []);
    } catch (e) {
      console.error('Falha ao carregar produtos:', e);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadBranding() {
    try {
      const b = await getPublicBranding();
      setBranding(b);
    } catch (e) {
      console.error(e);
    }
  }

  // Definir categoria ativa inicial quando dados carregarem
  useEffect(() => {
    const firstWithProducts = categories.find((c) => getProductsByCategory(c.id).length > 0);
    if (firstWithProducts) setActiveCategoryId((prev) => prev ?? firstWithProducts.id);
  }, [categories, products]);

  // Realce automático do chip ativo via IntersectionObserver
  useEffect(() => {
    const ids = categories
      .filter((c) => getProductsByCategory(c.id).length > 0)
      .map((c) => c.id);
    if (ids.length === 0) return;

    const sections: HTMLElement[] = ids
      .map((id) => document.getElementById(`cat-${id}`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        // Escolher a seção com maior área visível
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.id.replace('cat-', '');
          setActiveCategoryId(id);
        } else {
          // Fallback: usar seção mais próxima do topo
          const topEntry = entries
            .slice()
            .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
          if (topEntry) {
            const id = topEntry.target.id.replace('cat-', '');
            setActiveCategoryId(id);
          }
        }
      },
      {
        root: null,
        // Ajuste para header fixo (altura dinâmica) e comportamento desejado
        rootMargin: `-${headerHeight}px 0px -70% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories, products]);

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.categoryId === categoryId);
  };

  const productsWithoutCategory = products.filter(p => !p.categoryId);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleProductClick = async (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setModifiers([]);
    setVariants([]);
    setProductData(null);
    setModalOpen(true);
    try {
      const data = await getProductComposition(product.id);
      let finalData = data;
      // Fallback: se composição vier sem grupos, carregar públicos para evitar modal vazio
      if (!(data?.modifierGroups?.length > 0)) {
        try {
          const mods = await listModifierGroups();
          finalData = { ...finalData, modifierGroups: mods };
        } catch {}
      }
      if (!(data?.variantGroups?.length > 0)) {
        try {
          const vars = await listVariantGroups();
          finalData = { ...finalData, variantGroups: vars };
        } catch {}
      }
      setProductData(finalData);
    } catch (error) {
      console.error('Error loading product composition:', error);
      // Fallback de emergência: tentar carregar grupos públicos mesmo em erro
      try {
        const [modsRes, varsRes] = await Promise.allSettled([listModifierGroups(), listVariantGroups()]);
        const mods = modsRes.status === 'fulfilled' ? modsRes.value : [];
        const vars = varsRes.status === 'fulfilled' ? varsRes.value : [];
        setProductData({ product, modifierGroups: mods, variantGroups: vars });
      } catch {}
    }
  };

  const handleModifierChange = (option: any, checked: boolean) => {
    if (checked) {
      setModifiers([...modifiers, { groupId: option.groupId, optionId: option._id }]);
    } else {
      setModifiers(modifiers.filter(m => m.optionId !== option._id));
    }
  };

  const handleVariantChange = (optionId: string) => {
    // Encontrar a opção selecionada em todos os grupos de variantes
    let selectedOption = null;
    let groupId = '';
    
    if (productData?.variants) {
      for (const group of productData.variants) {
        const option = group.options.find((opt: any) => opt._id === optionId);
        if (option) {
          selectedOption = option;
          groupId = group._id;
          break;
        }
      }
    }
    
    if (selectedOption) {
      setVariants([{ groupId, optionId }]);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
    setProductData(null);
    setQuantity(1);
    setModifiers([]);
    setVariants([]);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const modifierNames = (productData?.modifierGroups ?? []).flatMap((g: any) => {
      const gid = g.id || g._id;
      return (g.options || [])
        .filter((opt: any) => modifiers.some((m) => m.groupId === gid && m.optionId === (opt.id || opt._id || opt.name)))
        .map((opt: any) => opt.label || opt.name);
    });
    const variantNames = (productData?.variantGroups ?? [])
      .map((g: any) => {
        const gid = g.id || g._id;
        const sel = variants.find((v) => v.groupId === gid);
        const opt = (g.options || []).find((o: any) => (o.id || o._id || o.name) === sel?.optionId);
        return opt?.label || opt?.name;
      })
      .filter(Boolean) as string[];
    addItem({ 
      productId: selectedProduct.id, 
      quantity, 
      modifiers, 
      variants,
      name: selectedProduct.name,
      modifierNames,
      variantNames
    });
    handleCloseModal();
  };

  const toggleModifier = (groupId: string, optionId: string) => {
    const exists = modifiers.some(m => m.groupId === groupId && m.optionId === optionId);
    if (exists) {
      setModifiers(modifiers.filter(m => !(m.groupId === groupId && m.optionId === optionId)));
    } else {
      setModifiers([...modifiers, { groupId, optionId }]);
    }
  };

  const selectVariant = (groupId: string, optionId: string) => {
    setVariants([{ groupId, optionId }]);
  };

  // Helpers para seleção conforme regras do backend
  const isModifierSelected = (groupId: string, optionId: string) =>
    modifiers.some(m => m.groupId === groupId && m.optionId === optionId);

  const isVariantSelected = (groupId: string, optionId: string) =>
    variants.some(v => v.groupId === groupId && v.optionId === optionId);

  const selectedCountInGroup = (groupId: string) =>
    modifiers.filter(m => m.groupId === groupId).length;

  const toggleModifierWithLimit = (groupId: string, optionId: string, maxSelections?: number) => {
    const selectedInGroup = modifiers.filter(m => m.groupId === groupId);
    const exists = selectedInGroup.some(m => m.optionId === optionId);
    if (exists) {
      setModifiers(modifiers.filter(m => !(m.groupId === groupId && m.optionId === optionId)));
      return;
    }
    const limit = typeof maxSelections === 'number' ? maxSelections : 0;
    if (limit > 0 && selectedInGroup.length >= limit) {
      // Não ultrapassar o limite; ignorar clique quando já atingido
      return;
    }
    setModifiers([...modifiers, { groupId, optionId }]);
  };

  const selectVariantForGroup = (groupId: string, optionId: string) => {
    setVariants((prev) => {
      const others = prev.filter(v => v.groupId !== groupId);
      return [...others, { groupId, optionId }];
    });
  };

  // Helpers para labels e reordenar selecionados
  const getGroupName = (groupId: string) => {
    const g = (productData?.modifierGroups ?? []).find((gg: any) => (gg.id || gg._id) === groupId);
    return g?.name || '';
  };

  const getOptionLabel = (groupId: string, optionId: string) => {
    const g = (productData?.modifierGroups ?? []).find((gg: any) => (gg.id || gg._id) === groupId);
    const opt = g?.options?.find((o: any) => (o.id || o._id || o.name) === optionId);
    return opt?.label || opt?.name || String(optionId);
  };

  const reorderModifiers = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= modifiers.length || to >= modifiers.length) return;
    const next = [...modifiers];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setModifiers(next);
  };

  // Pré-selecionar variantes com isDefault quando disponíveis
  useEffect(() => {
    const groups = productData?.variantGroups ?? [];
    if (!groups || groups.length === 0) return;
    setVariants((prev) => {
      const next = [...prev];
      for (const g of groups) {
        const groupId = g.id || g._id;
        const already = next.some(v => v.groupId === groupId);
        if (already) continue;
        const def = (g.options ?? []).find((o: any) => !!o.isDefault);
        if (def) {
          const optId = def.id || def._id || def.name;
          next.push({ groupId, optionId: optId });
        }
      }
      return next;
    });
  }, [productData]);

  const calculateTotal = () => {
    if (!selectedProduct || !productData) return 0;
    let total = (selectedProduct.price || 0) * quantity;
    
    productData.modifierGroups?.forEach((g: any) => {
      g.options?.forEach((opt: any) => {
        if (modifiers.some(m => m.optionId === (opt.id || opt._id))) {
          total += (opt.priceDelta || 0) * quantity;
        }
      });
    });
    
    productData.variantGroups?.forEach((g: any) => {
      g.options?.forEach((opt: any) => {
        if (variants.some(v => v.optionId === (opt.id || opt._id))) {
          total += (opt.priceDelta || 0) * quantity;
        }
      });
    });
    
    return total;
  };

  // Desabilitar botão quando grupos obrigatórios não estão satisfeitos
  const canAddToCart = (() => {
    if (!selectedProduct) return false;
    const requiredGroups = (productData?.modifierGroups ?? []).filter((g: any) => !!g.isRequired);
    const ok = requiredGroups.every((g: any) => modifiers.some(m => m.groupId === (g.id || g._id)));
    return ok && quantity > 0;
  })();

  const headerHeight = isSmDown ? 160 : 200;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff' }}>
      {/* Header no topo com cover, logo e nome (scrolla com o conteúdo) */}
      <Box sx={{ position: 'relative', px: 2, pt: 2, pb: 1 }}>
        <Container maxWidth="md" sx={{ px: 0 }}>
          <Box sx={{ position: 'relative', height: headerHeight, borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            {/* Cover image or solid color */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: branding?.coverImageUrl
                  ? `url(${branding.coverImageUrl})`
                  : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: branding?.coverImageUrl ? 'none' : 'none',
              }}
            />
            {/* Dark overlay for readability */}
            {branding?.coverImageUrl && (
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))' }} />
            )}

            {/* Cart button */}
            <IconButton
              onClick={() => navigate('/cart')}
              sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'rgba(255,255,255,1)' } }}
            >
              <Badge badgeContent={cartItemCount} color="error">
                <CartIcon sx={{ color: '#111' }} />
              </Badge>
            </IconButton>

            {/* Table code chip removido conforme requisito do cliente */}
            
            {/* Logo card */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: (isSmDown || branding?.mobileCenterLogo) ? '50%' : 24,
                transform: (isSmDown || branding?.mobileCenterLogo) ? 'translate(-50%, -55%)' : 'translate(0, -55%)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Card sx={{ width: isSmDown ? 72 : 88, height: isSmDown ? 72 : 88, borderRadius: 3, boxShadow: '0 6px 16px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                {branding?.logoImageUrl ? (
                  <CardMedia component="img" src={branding.logoImageUrl} alt="Logo" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', bgcolor: '#fff' }}>
                    <RestaurantIcon sx={{ fontSize: isSmDown ? 40 : 48, color: theme.palette.primary.main }} />
                  </Box>
                )}
              </Card>

              {/* Display name */}
              <Box sx={{ textAlign: (isSmDown || branding?.mobileCenterLogo) ? 'center' : 'left' }}>
                <Typography
                  variant={isSmDown ? 'h6' : 'h5'}
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: branding?.coverImageUrl ? '#fff' : '#fff',
                    textShadow: branding?.coverImageUrl ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                    fontFamily: theme.typography.fontFamily,
                  }}
                >
                  {branding?.displayName || 'Menu Digital'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Navegação de Categorias - Chips estilo OlaClick (scrolla com o conteúdo) */}
      <Box sx={{
        position: 'relative',
        bgcolor: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.08)'
      }}>
        <Container maxWidth="md" sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1.5, pb: 0.5 }}>
            {categories
              .filter(c => getProductsByCategory(c.id).length > 0)
              .map(c => (
                <Chip
                  key={c.id}
                  label={c.name}
                  onClick={() => {
                    setActiveCategoryId(c.id);
                    const el = document.getElementById(`cat-${c.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  sx={{
                    borderRadius: '999px',
                    fontWeight: 600,
                    bgcolor: activeCategoryId === c.id ? 'primary.main' : '#ffffff',
                    color: activeCategoryId === c.id ? '#ffffff' : '#000000',
                    border: '1px solid',
                    borderColor: activeCategoryId === c.id ? 'primary.main' : 'rgba(0,0,0,0.12)',
                    boxShadow: (theme) => activeCategoryId === c.id ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}` : 'none'
                  }}
                />
              ))}
          </Box>
        </Container>
      </Box>

      {/* Products by Category - Estilo OlaClick */}
      <Container maxWidth="md" sx={{ px: 2, py: 3 }}>
        {/* Categorias como títulos - Estilo OlaClick */}
        {categories.map(category => {
          const categoryProducts = getProductsByCategory(category.id);
          if (categoryProducts.length === 0) return null;
          
          return (
            <Box key={category.id} id={`cat-${category.id}`} sx={{ mb: 6 }}>
              {/* Título da categoria com borda inferior vermelha */}
              <Typography 
                variant="h4" 
                component="h2"
                sx={{ 
                  fontWeight: 700,
                  color: '#000000',
                  mb: 3,
                  pb: 1,
                  borderBottom: `3px solid ${theme.palette.primary.main}`,
                  display: 'inline-block'
                }}
              >
                {category.name}
              </Typography>
              
              {/* Grid de produtos - 2 colunas em desktop, 1 em mobile */}
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr', md: '1fr 1fr' },
                gap: 3
              }}>
                {categoryProducts.map(product => (
                  <Card
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      borderRadius: 3,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                      }
                    }}
                  >
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '96px 1fr', sm: '120px 1fr', md: '140px 1fr' }, p: 0 }}>
                      {/* Imagem do produto */}
                      <Box sx={{ 
                        width: '100%',
                        height: { xs: '96px', sm: '120px', md: '140px' },
                        flexShrink: 0,
                        bgcolor: theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        {product.imageUrl ? (
                          <CardMedia
                            component="img"
                            image={product.imageUrl}
                            alt={product.name}
                            sx={{ 
                              width: '100%', 
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <RestaurantIcon sx={{ fontSize: 48, color: 'white' }} />
                        )}
                      </Box>
                      
                      {/* Conteúdo do produto */}
                      <Box sx={{ 
                        flex: 1, 
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box>
                          <Typography 
                            variant="h6" 
                            component="h3"
                            sx={{ 
                              fontWeight: 700,
                              color: '#000000',
                              mb: 0.5,
                              fontSize: { xs: '1.1rem', sm: '1rem' },
                              lineHeight: 1.2
                            }}
                          >
                            {product.name}
                          </Typography>
                          
                          {product.description && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{
                                fontSize: { xs: '0.9rem', sm: '0.875rem' },
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: { xs: 3, sm: 2 } as any,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                color: '#666666'
                              }}
                            >
                              {product.description}
                            </Typography>
                          )}
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mt: 1.5
                        }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700,
                              color: theme.palette.primary.main,
                              fontSize: '1.25rem'
                            }}
                          >
                            €{product.price?.toFixed(2)}
                          </Typography>
                          
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(product);
                            }}
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              color: 'white',
                              fontWeight: 600,
                              borderRadius: 2,
                              px: 2,
                              py: 0.8,
                              textTransform: 'none',
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                                boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
                              }
                            }}
                          >
                            Adicionar
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        })}
        
        {/* Produtos sem categoria */}
        {productsWithoutCategory.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography 
              variant="h4" 
              component="h2"
              sx={{ 
                fontWeight: 700,
                color: '#000000',
                mb: 3,
                pb: 1,
                borderBottom: `3px solid ${theme.palette.primary.main}`,
                display: 'inline-block'
              }}
            >
              Outros
            </Typography>
            
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr', md: '1fr 1fr' },
              gap: 3
            }}>
              {productsWithoutCategory.map(product => (
                <Card
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }
                  }}
                >
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '96px 1fr', sm: '120px 1fr', md: '140px 1fr' }, p: 0 }}>
                    {/* Imagem do produto */}
                    <Box sx={{ 
                      width: '100%',
                      height: { xs: '96px', sm: '120px', md: '140px' },
                      flexShrink: 0,
                      bgcolor: theme.palette.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {product.imageUrl ? (
                        <CardMedia
                          component="img"
                          image={product.imageUrl}
                          alt={product.name}
                          sx={{ 
                            width: '100%', 
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <RestaurantIcon sx={{ fontSize: 48, color: 'white' }} />
                      )}
                    </Box>
                    
                    {/* Conteúdo do produto */}
                    <Box sx={{ 
                      flex: 1, 
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <Box>
                        <Typography 
                          variant="h6" 
                          component="h3"
                          sx={{ 
                            fontWeight: 700,
                            color: '#000000',
                            mb: 0.5,
                            fontSize: { xs: '1.1rem', sm: '1rem' },
                            lineHeight: 1.2
                          }}
                        >
                          {product.name}
                        </Typography>
                        
                      {product.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: '0.9rem', sm: '0.875rem' },
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: { xs: 3, sm: 2 } as any,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            color: '#666666'
                          }}
                        >
                          {product.description}
                        </Typography>
                      )}
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mt: 1.5
                      }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700,
                            color: theme.palette.primary.main,
                            fontSize: '1.25rem'
                          }}
                        >
                          €{product.price?.toFixed(2)}
                        </Typography>
                        
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(product);
                          }}
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            color: 'white',
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 2,
                            py: 0.8,
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                              bgcolor: theme.palette.primary.dark,
                              boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
                            }
                          }}
                        >
                          Adicionar
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
        )}
        
        {/* Mensagem se não houver produtos (exibir somente após carregar) */}
        {!loadingProducts && products.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              Nenhum produto disponível no momento.
            </Typography>
          </Box>
        )}
      </Container>

      {/* Modal de Produto - Estilo OlaClick */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        fullScreen={isSmDown}
        scroll="paper"
        aria-labelledby="product-dialog-title"
        aria-describedby="product-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: isSmDown ? 0 : 3,
            maxHeight: isSmDown ? '100vh' : '90vh',
            height: isSmDown ? '100vh' : 'auto',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          },
          ref: dialogPaperRef,
          tabIndex: -1,
        }}
        TransitionProps={{
          onEntered: () => {
            dialogPaperRef.current?.focus();
          },
        }}
      >
        {selectedProduct ? (
          <>
            {/* Header com imagem do produto */}
            <Box sx={{ position: 'relative' }}>
              <Box sx={{
                height: 200,
                bgcolor: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {selectedProduct.imageUrl ? (
                  <CardMedia
                    component="img"
                    image={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    sx={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <RestaurantIcon sx={{ fontSize: 80, color: 'white' }} />
                )}
              </Box>
              
              <IconButton
                onClick={handleCloseModal}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  bgcolor: 'white',
                  color: '#333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            
            <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
              {/* Nome do produto */}
              <Typography 
                variant="h5" 
                component="h2"
                id="product-dialog-title"
                sx={{ 
                  fontWeight: 700,
                  color: '#000000',
                  mb: 1,
                  fontFamily: theme.typography.fontFamily
                }}
              >
                {selectedProduct.name}
              </Typography>
              
              {/* Descrição */}
              {selectedProduct.description && (
                <Typography 
                  variant="body1" 
                  sx={{ 
                    mb: 2,
                    color: '#666666',
                    lineHeight: 1.5
                  }}
                >
                  {selectedProduct.description}
                </Typography>
              )}
              
              {/* Preço */}
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  mb: 3,
                  fontFamily: theme.typography.fontFamily
                }}
              >
                €{selectedProduct.price?.toFixed(2)}
              </Typography>

              {!productData && (
                <Typography variant="body2" sx={{ color: '#777', mb: 2 }}>
                  A carregar opções…
                </Typography>
              )}
              
              {/* Modificadores (via backend: modifierGroups) */}
              {productData?.modifierGroups && productData.modifierGroups.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#000000',
                      mb: 2,
                      fontFamily: theme.typography.fontFamily
                    }}
                  >
                    Modificadores
                  </Typography>
                  {productData.modifierGroups.map((group: any) => {
                    const groupId = group.id || group._id;
                    const maxSel: number = typeof group.maxSelections === 'number' ? group.maxSelections : 0;
                    const current = selectedCountInGroup(groupId);
                    const reached = maxSel > 0 && current >= maxSel;
                    return (
                      <Box key={groupId} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              mb: 1,
                              color: '#333333'
                            }}
                          >
                            {group.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#777' }}>
                            {group.isRequired ? 'Obrigatório' : 'Opcional'}{maxSel > 0 ? ` • até ${maxSel}` : ''}
                          </Typography>
                        </Box>
                        {group.options?.map((option: any) => {
                          const optId = option.id || option._id || option.name;
                          const selected = isModifierSelected(groupId, optId);
                          const disabled = (!option.isAvailable && option.isAvailable !== undefined) || (!selected && reached);
                          const delta = Number(option.priceDelta || 0);
                          const priceLabel = delta !== 0 ? `${delta > 0 ? '+€' : '−€'}${Math.abs(delta).toFixed(2)}` : undefined;
                          return (
                            <FormControlLabel
                              key={optId}
                              control={
                                <Checkbox
                                  checked={selected}
                                  onChange={() => toggleModifierWithLimit(groupId, optId, maxSel)}
                                  disabled={disabled}
                                  sx={{
                                    color: theme.palette.primary.main,
                                    '&.Mui-checked': { color: theme.palette.primary.main }
                                  }}
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                  <Typography variant="body2">{option.label || option.name}</Typography>
                                  {priceLabel && (
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {priceLabel}
                                    </Typography>
                                  )}
                                </Box>
                              }
                              sx={{
                                my: 0.5,
                                px: 1,
                                py: 0.75,
                                borderRadius: 2,
                                border: (theme) => selected ? `2px solid ${theme.palette.primary.main}` : '1px solid #e5e5e5',
                                backgroundColor: (theme) => selected ? alpha(theme.palette.primary.main, 0.06) : '#fff',
                                opacity: disabled ? 0.6 : 1
                              }}
                            />
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              )}
              
              {/* Variantes (via backend: variantGroups) */}
              {productData?.variantGroups && productData.variantGroups.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#000000',
                      mb: 2,
                      fontFamily: theme.typography.fontFamily
                    }}
                  >
                    Opções
                  </Typography>
                  {productData.variantGroups.map((group: any) => {
                    const groupId = group.id || group._id;
                    const selectedOptId = variants.find(v => v.groupId === groupId)?.optionId || '';
                    return (
                      <Box key={groupId} sx={{ mb: 2 }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 500,
                            mb: 1,
                            color: '#333333'
                          }}
                        >
                          {group.name}
                        </Typography>
                        <RadioGroup
                          value={selectedOptId}
                          onChange={(e) => selectVariantForGroup(groupId, e.target.value)}
                        >
                          {group.options?.map((option: any) => {
                            const optId = option.id || option._id || option.name;
                            const delta = Number(option.priceDelta || 0);
                            const priceLabel = delta !== 0 ? `${delta > 0 ? '+€' : '−€'}${Math.abs(delta).toFixed(2)}` : undefined;
                            return (
                              <FormControlLabel
                                key={optId}
                                value={optId}
                                control={<Radio sx={{ color: theme.palette.primary.main, '&.Mui-checked': { color: theme.palette.primary.main } }} />}
                                label={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <Typography variant="body2">{option.label || option.name}</Typography>
                                    {priceLabel && (
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {priceLabel}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            );
                          })}
                        </RadioGroup>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Selecionados (arraste para ordenar) */}
              {modifiers.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#000000',
                      mb: 1.5,
                      fontFamily: theme.typography.fontFamily
                    }}
                  >
                    Selecionados
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {modifiers.map((m, i) => {
                      const label = getOptionLabel(m.groupId, m.optionId);
                      const groupName = getGroupName(m.groupId);
                      const key = `${m.groupId}:${m.optionId}:${i}`;
                      return (
                        <Box
                          key={key}
                          draggable
                          onDragStart={() => setDragIndex(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragIndex !== null) reorderModifiers(dragIndex, i);
                            setDragIndex(null);
                          }}
                        >
                          <Chip 
                            label={`${groupName}: ${label}`}
                            onDelete={() => setModifiers(modifiers.filter((_, idx) => idx !== i))}
                            sx={{ 
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                              color: '#333',
                              border: (theme) => `1px solid ${theme.palette.primary.main}`
                            }} 
                          />
                        </Box>
                      );
                    })}
                  </Box>
                  <Typography variant="caption" sx={{ color: '#777', mt: 1, display: 'block' }}>
                    Dica: arraste um chip para mudar a ordem
                  </Typography>
                </Box>
              )}
              
              {/* Contador de quantidade e botão de adicionar */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 3,
                  pt: 2,
                  borderTop: '1px solid #f0f0f0',
                  position: isSmDown ? 'sticky' : 'static',
                  bottom: 0,
                  bgcolor: 'background.paper',
                  zIndex: 1,
                }}
                id="product-dialog-description"
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    sx={{
                      bgcolor: '#f5f5f5',
                      color: '#333',
                      '&:hover': { bgcolor: '#e0e0e0' }
                    }}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mx: 2,
                      minWidth: 30,
                      textAlign: 'center',
                      fontWeight: 600
                    }}
                  >
                    {quantity}
                  </Typography>
                  <IconButton
                    onClick={() => setQuantity(quantity + 1)}
                    sx={{
                      bgcolor: '#f5f5f5',
                      color: '#333',
                      '&:hover': { bgcolor: '#e0e0e0' }
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
                
                <Button
                  variant="contained"
                  size={isSmDown ? 'medium' : 'large'}
                  onClick={handleAddToCart}
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: isSmDown ? 2.5 : 3,
                    py: isSmDown ? 1 : 1.2,
                    textTransform: 'none',
                    boxShadow: 'none',
                    fontFamily: theme.typography.fontFamily,
                    fontSize: isSmDown ? '0.95rem' : '1rem',
                    '&:hover': {
                      bgcolor: theme.palette.primary.dark,
                      boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
                    }
                  }}
                  disabled={!canAddToCart}
                >
                  Adicionar €{calculateTotal().toFixed(2)}
                </Button>
              </Box>
            </DialogContent>
          </>
        ) : null}
      </Dialog>

      {/* Floating Cart Button (Mobile) */}
      {cartItemCount > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { xs: 'block', md: 'none' },
            zIndex: 1000
          }}
        >
          <IconButton
            onClick={() => navigate(`/cart?table=${tableCode}`)}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: 'white',
              width: 64,
              height: 64,
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
              '&:hover': { bgcolor: theme.palette.primary.dark }
            }}
          >
            <Badge badgeContent={cartItemCount} color="error">
              <CartIcon sx={{ fontSize: 32 }} />
            </Badge>
          </IconButton>
        </Box>
      )}
    </Box>
  );
}