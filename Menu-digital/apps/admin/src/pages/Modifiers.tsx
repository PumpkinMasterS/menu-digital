import React, { useEffect, useState } from 'react';
import { 
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, 
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Card, CardContent, Typography, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api';

interface ModifierOption {
  id: string;
  label: string;
  priceDelta: number;
  isDefault?: boolean;
  isAvailable?: boolean;
}

interface ModifierGroup {
  id: string;
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

export default function Modifiers() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ModifierGroup | null>(null);

  const fetchGroups = async () => {
    try {
      const data = await apiGet<{ items: ModifierGroup[] }>('/v1/admin/modifiers');
      setGroups(data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleOpen = (group?: ModifierGroup) => {
    setCurrent(
      group || {
        id: '',
        name: '',
        description: '',
        type: 'extra',
        isActive: true,
        selection: { type: 'multiple', required: false, min: 0, max: 10 },
        options: [],
      }
    );
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrent(null);
  };

  const handleSave = async () => {
    if (!current) return;
    try {
      const id = current.id || current._id;
      if (id) {
        await apiPatch(`/v1/admin/modifiers/${id}`, current);
      } else {
        await apiPost('/v1/admin/modifiers', current);
      }
      await fetchGroups();
      handleClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este grupo?')) return;
    try {
      await apiDelete(`/v1/admin/modifiers/${id}`);
      await fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const addOption = () => {
    if (!current) return;
    setCurrent({
      ...current,
      options: [
        ...current.options,
        { id: '', label: '', priceDelta: 0, isDefault: false, isAvailable: true },
      ],
    });
  };

  const updateOption = (index: number, field: keyof ModifierOption, value: any) => {
    if (!current) return;
    const newOptions = [...current.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setCurrent({ ...current, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (!current) return;
    setCurrent({ ...current, options: current.options.filter((_, i) => i !== index) });
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Modificadores e Variantes</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>
          Novo Grupo
        </Button>
      </Box>

      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={2}>
        {groups.map((group) => (
          <Card key={group.id || group._id} variant="outlined">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                <Typography variant="h6">{group.name}</Typography>
                <Box>
                  <IconButton size="small" onClick={() => handleOpen(group)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(group.id || group._id!)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Chip 
                label={group.type === 'extra' ? 'Extra' : 'Variante'} 
                size="small" 
                color={group.type === 'extra' ? 'primary' : 'secondary'}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip 
                label={group.selection.type === 'single' ? 'Seleção única' : 'Múltipla escolha'} 
                size="small"
                sx={{ mb: 1 }}
              />
              
              {group.description && (
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {group.description}
                </Typography>
              )}
              
              <Typography variant="body2" mb={1}>
                Opções: {group.options.length}
              </Typography>
              
              <Box>
                {group.options.slice(0, 3).map((opt) => (
                  <Typography key={opt.id} variant="caption" display="block">
                    • {opt.label} {opt.priceDelta !== 0 && `(+${opt.priceDelta.toFixed(2)})`}
                  </Typography>
                ))}
                {group.options.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    ... e mais {group.options.length - 3}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>
          {(current?.id || current?._id) ? 'Editar Grupo' : 'Novo Grupo'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nome"
              value={current?.name || ''}
              onChange={(e) => setCurrent(current ? { ...current, name: e.target.value } : null)}
            />
            <TextField
              label="Descrição"
              value={current?.description || ''}
              onChange={(e) => setCurrent(current ? { ...current, description: e.target.value } : null)}
            />
            
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={current?.type || 'extra'}
                onChange={(e) => setCurrent(current ? { ...current, type: e.target.value as any } : null)}
              >
                <MenuItem value="extra">Extra (adicional)</MenuItem>
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

            <Typography variant="h6" mt={2}>Opções</Typography>
            {current?.options.map((opt, idx) => (
              <Box key={idx} display="flex" gap={1} alignItems="center">
                <TextField
                  label="Nome"
                  value={opt.label}
                  onChange={(e) => updateOption(idx, 'label', e.target.value)}
                  sx={{ flex: 2 }}
                />
                <TextField
                  type="number"
                  label="Preço delta"
                  value={opt.priceDelta}
                  onChange={(e) => updateOption(idx, 'priceDelta', Number(e.target.value))}
                  sx={{ flex: 1 }}
                />
                <IconButton onClick={() => removeOption(idx)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button onClick={addOption}>Adicionar Opção</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

