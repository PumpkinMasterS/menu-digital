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
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  LocalOffer as OfferIcon
} from '@mui/icons-material';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api';

interface ModifierOption {
  id: string;
  label: string;
  priceDelta: number;
  isDefault?: boolean;
  isAvailable?: boolean;
}

interface ModifierGroup {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  type: 'extra' | 'variant';
  isActive: boolean;
  selection: {
    type: 'single' | 'multiple';
    required?: boolean;
    min?: number;
    max?: number;
  };
  options: ModifierOption[];
}

export default function ModifierBuilder() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [current, setCurrent] = useState<ModifierGroup | null>(null);
  const [previewGroup, setPreviewGroup] = useState<ModifierGroup | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const data = await apiGet<{ items: ModifierGroup[] }>('/v1/admin/modifiers');
      setGroups(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  function handleOpen(group?: ModifierGroup) {
    if (group) {
      setCurrent(group);
    } else {
      setCurrent({
        name: '',
        description: '',
        type: 'extra',
        isActive: true,
        selection: { type: 'multiple', required: false, min: 0, max: 10 },
        options: []
      });
    }
    setOpenDialog(true);
  }

  async function handleSave() {
    if (!current) return;
    try {
      const id = current.id || current._id;
      if (id) {
        await apiPatch(`/v1/admin/modifiers/${id}`, current);
      } else {
        await apiPost('/v1/admin/modifiers', current);
      }
      await loadGroups();
      setOpenDialog(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este grupo?')) return;
    try {
      await apiDelete(`/v1/admin/modifiers/${id}`);
      await loadGroups();
    } catch (e) {
      console.error(e);
    }
  }

  function addOption() {
    if (!current) return;
    const newOpt: ModifierOption = {
      id: `opt_${Date.now()}`,
      label: '',
      priceDelta: 0,
      isDefault: false,
      isAvailable: true
    };
    setCurrent({ ...current, options: [...current.options, newOpt] });
  }

  function updateOption(index: number, field: keyof ModifierOption, value: any) {
    if (!current) return;
    const opts = [...current.options];
    opts[index] = { ...opts[index], [field]: value };
    setCurrent({ ...current, options: opts });
  }

  function removeOption(index: number) {
    if (!current) return;
    setCurrent({ ...current, options: current.options.filter((_, i) => i !== index) });
  }

  function handlePreview(group: ModifierGroup) {
    setPreviewGroup(group);
    setSelectedOptions([]);
    setOpenPreview(true);
  }

  function togglePreviewOption(optionId: string) {
    if (!previewGroup) return;
    
    if (previewGroup.selection.type === 'single') {
      setSelectedOptions([optionId]);
    } else {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(prev => prev.filter(id => id !== optionId));
      } else {
        setSelectedOptions(prev => [...prev, optionId]);
      }
    }
  }

  const calculatePreviewPrice = () => {
    if (!previewGroup) return 0;
    return previewGroup.options
      .filter(opt => selectedOptions.includes(opt.id))
      .reduce((sum, opt) => sum + opt.priceDelta, 0);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          🎨 Gestor de Modificadores
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: 3,
            px: 3
          }}
        >
          Novo Grupo
        </Button>
      </Box>

      <Grid container spacing={3}>
        {groups.map((group) => {
          const id = group.id || group._id || '';
          return (
            <Grid xs={12} md={6} key={id}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {group.name}
                      </Typography>
                      {group.description && (
                        <Typography variant="body2" color="text.secondary">
                          {group.description}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handlePreview(group)} color="primary">
                        <PreviewIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpen(group)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={group.type === 'extra' ? '➕ Extra' : '🔄 Variante'}
                      size="small"
                      color={group.type === 'extra' ? 'primary' : 'secondary'}
                    />
                    <Chip
                      label={group.selection.type === 'single' ? 'Única escolha' : 'Múltipla'}
                      size="small"
                    />
                    {group.selection.required && (
                      <Chip label="Obrigatório" size="small" color="error" />
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                    {group.options.length} Opções:
                  </Typography>
                  
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {group.options.slice(0, 5).map((opt) => (
                      <Chip
                        key={opt.id}
                        label={`${opt.label} ${opt.priceDelta !== 0 ? `(+€${opt.priceDelta.toFixed(2)})` : ''}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {group.options.length > 5 && (
                      <Chip label={`+${group.options.length - 5} mais`} size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Dialog Criar/Editar */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {(current?.id || current?._id) ? 'Editar Grupo' : 'Novo Grupo'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nome do Grupo"
              value={current?.name || ''}
              onChange={(e) => setCurrent(current ? { ...current, name: e.target.value } : null)}
              fullWidth
            />
            <TextField
              label="Descrição"
              value={current?.description || ''}
              onChange={(e) => setCurrent(current ? { ...current, description: e.target.value } : null)}
              fullWidth
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={current?.type || 'extra'}
                onChange={(e) => setCurrent(current ? { ...current, type: e.target.value as any } : null)}
              >
                <MenuItem value="extra">Extra (adicionais)</MenuItem>
                <MenuItem value="variant">Variante (tamanho/sabor)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Seleção</InputLabel>
              <Select
                value={current?.selection.type || 'multiple'}
                onChange={(e) => setCurrent(current ? {
                  ...current,
                  selection: { ...current.selection, type: e.target.value as any }
                } : null)}
              >
                <MenuItem value="single">Única escolha</MenuItem>
                <MenuItem value="multiple">Múltipla escolha</MenuItem>
              </Select>
            </FormControl>

            {current?.selection.type === 'multiple' && (
              <Box display="flex" gap={2}>
                <TextField
                  type="number"
                  label="Mínimo"
                  value={current?.selection.min ?? 0}
                  onChange={(e) => setCurrent(current ? {
                    ...current,
                    selection: { ...current.selection, min: Number(e.target.value) }
                  } : null)}
                />
                <TextField
                  type="number"
                  label="Máximo"
                  value={current?.selection.max ?? 10}
                  onChange={(e) => setCurrent(current ? {
                    ...current,
                    selection: { ...current.selection, max: Number(e.target.value) }
                  } : null)}
                />
              </Box>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={current?.selection.required || false}
                  onChange={(e) => setCurrent(current ? {
                    ...current,
                    selection: { ...current.selection, required: e.target.checked }
                  } : null)}
                />
              }
              label="Seleção Obrigatória"
            />

            <Divider />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Opções</Typography>
              <Button startIcon={<AddIcon />} onClick={addOption}>
                Adicionar Opção
              </Button>
            </Box>

            {current?.options.map((opt, idx) => (
              <Paper key={idx} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box display="flex" gap={2} alignItems="start">
                  <Avatar sx={{ bgcolor: 'primary.main', mt: 1 }}>
                    <OfferIcon />
                  </Avatar>
                  <Box flex={1} display="flex" flexDirection="column" gap={1}>
                    <TextField
                      label="Nome"
                      value={opt.label}
                      onChange={(e) => updateOption(idx, 'label', e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Preço Delta (€)"
                      type="number"
                      value={opt.priceDelta}
                      onChange={(e) => updateOption(idx, 'priceDelta', Number(e.target.value))}
                      size="small"
                      fullWidth
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={opt.isDefault || false}
                          onChange={(e) => updateOption(idx, 'isDefault', e.target.checked)}
                          size="small"
                        />
                      }
                      label="Padrão"
                    />
                  </Box>
                  <IconButton onClick={() => removeOption(idx)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Preview */}
      <Dialog open={openPreview} onClose={() => setOpenPreview(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon />
            Preview: {previewGroup?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewGroup?.description && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {previewGroup.description}
            </Typography>
          )}

          <List>
            {previewGroup?.options.map((opt) => {
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <ListItem
                  key={opt.id}
                  button
                  onClick={() => togglePreviewOption(opt.id)}
                  sx={{
                    border: 2,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: isSelected ? 'primary.50' : 'transparent'
                  }}
                >
                  <ListItemText
                    primary={opt.label}
                    secondary={opt.priceDelta !== 0 ? `+€${opt.priceDelta.toFixed(2)}` : 'Incluído'}
                  />
                  {isSelected && <Chip label="✓" color="primary" size="small" />}
                </ListItem>
              );
            })}
          </List>

          {selectedOptions.length > 0 && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'success.50' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Total de extras: +€{calculatePreviewPrice().toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedOptions.length} {selectedOptions.length === 1 ? 'opção selecionada' : 'opções selecionadas'}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPreview(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

