import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { TablesAPI } from '../api';

interface Table {
  _id?: string;
  code: string;
  location?: string;
  seats?: number;
  isActive?: boolean;
}

export default function Tables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Table | null>(null);

  const fetchTables = async () => {
    try {
      const data = await TablesAPI.list();
      const items = Array.isArray(data) ? data : (data as any).items;
      setTables(items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleOpen = (t?: Table) => {
    setCurrent(
      t || {
        code: '',
        location: '',
        seats: 2,
        isActive: true,
      }
    );
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrent(null);
  };

  const handleChange = (field: keyof Table, value: any) => {
    setCurrent((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!current) return;
    try {
      const payload: any = {
        code: current.code,
        location: current.location,
        seats: current.seats,
        isActive: current.isActive,
      };
      if (current._id) {
        await TablesAPI.update(current._id, payload);
      } else {
        await TablesAPI.create(payload);
      }
      await fetchTables();
      handleClose();
    } catch (e) {
      console.error(e);
    }
  };

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'Código', width: 140 },
    { field: 'location', headerName: 'Localização', flex: 1 },
    { field: 'seats', headerName: 'Lugares', width: 120 },
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
        <h2>Mesas</h2>
        <Button variant="contained" onClick={() => handleOpen()}>Nova Mesa</Button>
      </Box>
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={tables.map((t) => ({ id: t._id || t.code, ...t }))}
          columns={columns}
          pageSizeOptions={[5, 10, 25, 100]}
        />
      </div>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{current?._id ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Código" value={current?.code || ''} onChange={(e) => handleChange('code', e.target.value)} />
            <TextField label="Localização" value={current?.location || ''} onChange={(e) => handleChange('location', e.target.value)} />
            <TextField type="number" label="Lugares" value={current?.seats ?? 2} onChange={(e) => handleChange('seats', Number(e.target.value))} />
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