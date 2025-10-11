import React, { useEffect, useState } from 'react';
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
import {
  ShoppingCart as CartIcon,
  Restaurant as RestaurantIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useCart } from '../cartContext';
import { getProductComposition, type SelectedOption } from '../api';

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
  const tableCode = searchParams.get('table');
  const navigate = useNavigate();
  const { items, addItem } = useCart();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [modifiers, setModifiers] = useState<SelectedOption[]>([]);
  const [variants, setVariants] = useState<SelectedOption[]>([]);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch('/v1/public/categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : data.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch('/v1/public/products');
      const data = await res.json();
      setProducts(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }

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
    
    try {
      const data = await getProductComposition(product.id);
      setProductData(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error loading product composition:', error);
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
    addItem({ 
      productId: selectedProduct.id, 
      quantity, 
      modifiers, 
      variants 
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff' }}>
      {/* Header fixo no topo - Estilo OlaClick */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        bgcolor: '#F51414',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        px: 2,
        py: 1.5
      }}>
        <Container maxWidth="md" sx={{ px: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="h5" 
                component="h1"
                sx={{ 
                  fontWeight: 700,
                  color: '#ffffff',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                🍔 Menu Digital
              </Typography>
              {tableCode && (
                <Typography 
                  variant="body1"
                  sx={{ 
                    ml: 2,
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.9rem'
                  }}
                >
                  Mesa {tableCode}
                </Typography>
              )}
            </Box>
            
            <IconButton
              color="inherit"
              onClick={() => navigate('/cart')}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
              }}
            >
              <Badge badgeContent={cartItemCount} color="error">
                <CartIcon sx={{ color: '#ffffff' }} />
              </Badge>
            </IconButton>
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
            <Box key={category.id} sx={{ mb: 6 }}>
              {/* Título da categoria com borda inferior vermelha */}
              <Typography 
                variant="h4" 
                component="h2"
                sx={{ 
                  fontWeight: 700,
                  color: '#000000',
                  mb: 3,
                  pb: 1,
                  borderBottom: '3px solid #F51414',
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
                        border: '1px solid rgba(245,20,20,0.2)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', p: 0 }}>
                      {/* Imagem do produto */}
                      <Box sx={{ 
                        width: { xs: '100%', sm: '120px', md: '140px' },
                        height: { xs: '180px', sm: '120px', md: '140px' },
                        flexShrink: 0,
                        bgcolor: '#F51414',
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
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
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
                              color: '#F51414',
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
                              bgcolor: '#F51414',
                              color: 'white',
                              fontWeight: 600,
                              borderRadius: 2,
                              px: 2,
                              py: 0.8,
                              textTransform: 'none',
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: '#E01212',
                                boxShadow: '0 2px 8px rgba(245,20,20,0.3)'
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
                borderBottom: '3px solid #F51414',
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
                      border: '1px solid rgba(245,20,20,0.2)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', p: 0 }}>
                    {/* Imagem do produto */}
                    <Box sx={{ 
                      width: { xs: '100%', sm: '120px', md: '140px' },
                      height: { xs: '180px', sm: '120px', md: '140px' },
                      flexShrink: 0,
                      bgcolor: '#F51414',
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
                              fontSize: '0.875rem',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
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
                            color: '#F51414',
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
                            bgcolor: '#F51414',
                            color: 'white',
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 2,
                            py: 0.8,
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                              bgcolor: '#E01212',
                              boxShadow: '0 2px 8px rgba(245,20,20,0.3)'
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
        
        {/* Mensagem se não houver produtos */}
        {products.length === 0 && (
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
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        {selectedProduct && productData && (
          <>
            {/* Header com imagem do produto */}
            <Box sx={{ position: 'relative' }}>
              <Box sx={{
                height: 200,
                bgcolor: '#F51414',
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
            
            <DialogContent sx={{ p: 3 }}>
              {/* Nome do produto */}
              <Typography 
                variant="h5" 
                component="h2"
                sx={{ 
                  fontWeight: 700,
                  color: '#000000',
                  mb: 1,
                  fontFamily: 'Poppins, sans-serif'
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
                  color: '#F51414',
                  mb: 3,
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                €{selectedProduct.price?.toFixed(2)}
              </Typography>
              
              {/* Modificadores */}
              {productData.modifiers && productData.modifiers.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#000000',
                      mb: 2,
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Modificadores
                  </Typography>
                  {productData.modifiers.map((group: any) => (
                    <Box key={group.id} sx={{ mb: 2 }}>
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
                      {group.options.map((option: any) => (
                        <FormControlLabel
                          key={option._id}
                          control={
                            <Checkbox
                              checked={modifiers.some(m => m.optionId === option._id)}
                              onChange={(e) => handleModifierChange(option, e.target.checked)}
                              sx={{
                                color: '#F51414',
                                '&.Mui-checked': {
                                  color: '#F51414',
                                }
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <Typography variant="body2">{option.name}</Typography>
                              {option.price && (
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  +€{option.price.toFixed(2)}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      ))}
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Variantes */}
              {productData.variants && productData.variants.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#000000',
                      mb: 2,
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Opções
                  </Typography>
                  <RadioGroup
                    value={variants.length > 0 ? variants[0].optionId : ''}
                    onChange={(e) => handleVariantChange(e.target.value)}
                  >
                    {productData.variants.map((group: any) => (
                      <Box key={group._id} sx={{ mb: 2 }}>
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
                        {group.options.map((option: any) => (
                          <FormControlLabel
                            key={option._id}
                            value={option._id}
                            control={
                              <Radio
                                sx={{
                                  color: '#F51414',
                                  '&.Mui-checked': {
                                    color: '#F51414',
                                  }
                                }}
                              />
                            }
                            label={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <Typography variant="body2">{option.name}</Typography>
                                {option.price && (
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    +€{option.price.toFixed(2)}
                                </Typography>
                              )}
                              </Box>
                            }
                          />
                        ))}
                      </Box>
                    ))}
                  </RadioGroup>
                </Box>
              )}
              
              {/* Contador de quantidade e botão de adicionar */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 3,
                pt: 2,
                borderTop: '1px solid #f0f0f0'
              }}>
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
                  size="large"
                  onClick={handleAddToCart}
                  sx={{
                    bgcolor: '#F51414',
                    color: 'white',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1.2,
                    textTransform: 'none',
                    boxShadow: 'none',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '1rem',
                    '&:hover': {
                      bgcolor: '#E01212',
                      boxShadow: '0 2px 8px rgba(245,20,20,0.3)'
                    }
                  }}
                >
                  Adicionar €{calculateTotal().toFixed(2)}
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
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
              bgcolor: '#F51414',
              color: 'white',
              width: 64,
              height: 64,
              boxShadow: '0 4px 12px rgba(245, 20, 20, 0.4)',
              '&:hover': { bgcolor: '#C10F0F' }
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