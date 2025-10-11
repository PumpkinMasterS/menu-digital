import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Box, MenuItem, Select, InputLabel, FormControl, FormControlLabel, Switch } from '@mui/material';

interface Table {
  id: string;
  name: string;
  code: string;
  type: 'table' | 'takeaway';
  isActive: boolean;
}

const TableManagement: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState<Partial<Table>>({});
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/v1/admin/tables', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = await response.json();
      setTables(data.items);
    }
  };

  const handleOpen = (table?: Table) => {
    setEditingTable(table || null);
    setFormData(table || { type: 'table', isActive: true });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    const token = localStorage.getItem('authToken');
    const url = editingTable ? `/v1/admin/tables/${editingTable.id}` : '/v1/admin/tables';
    const method = editingTable ? 'PATCH' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData),
    });
    handleClose();
    fetchTables();
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('authToken');
    await fetch(`/v1/admin/tables/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchTables();
  };

  const handleGenerateQR = async (id: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/v1/admin/tables/${id}/qrcode`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const svg = await response.text();
      setQrCodes((prev) => ({ ...prev, [id]: svg }));
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', width: 150 },
    { field: 'code', headerName: 'Código', width: 150 },
    { field: 'type', headerName: 'Tipo', width: 100 },
    { field: 'isActive', headerName: 'Ativo', width: 100, type: 'boolean' },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 300,
      renderCell: (params) => (
        <>
          <Button onClick={() => handleOpen(params.row as Table)}>Editar</Button>
          <Button onClick={() => handleDelete(params.row.id)}>Excluir</Button>
          <Button onClick={() => handleGenerateQR(params.row.id)}>Gerar QR</Button>
        </>
      ),
    },
    {
      field: 'qr',
      headerName: 'QR Code',
      width: 200,
      renderCell: (params) => (
        qrCodes[params.row.id] ? <div dangerouslySetInnerHTML={{ __html: qrCodes[params.row.id] }} /> : null
      ),
    },
  ];

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <Button variant="contained" onClick={() => handleOpen()}>Nova Mesa</Button>
      <DataGrid rows={tables} columns={columns} />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingTable ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
        <DialogContent>
          <TextField label="Nome" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} fullWidth />
          <TextField label="Código" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select value={formData.type || 'table'} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'table' | 'takeaway' })}>
              <MenuItem value="table">Mesa</MenuItem>
              <MenuItem value="takeaway">Takeaway</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={formData.isActive ?? true} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />}
            label="Ativo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableManagement;