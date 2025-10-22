import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { TablesAPI } from '../api';

interface Table {
  id?: string;
  name?: string;
  code: string;
  location?: string;
  seats?: number;
  isActive?: boolean;
}

export default function Tables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Table | null>(null);
  const [qrSvgs, setQrSvgs] = useState<Record<string, string>>({});
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchStart, setBatchStart] = useState(1);
  const [batchQty, setBatchQty] = useState(10);
  const [batchPrefix, setBatchPrefix] = useState('T');
  const [batchPad, setBatchPad] = useState(2);

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
        name: '',
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
      const computedName = (current.name && current.name.trim().length > 0) ? current.name : `Mesa ${current.code}`;
      const payload: any = {
        name: computedName,
        code: current.code,
        location: current.location,
        seats: current.seats,
        isActive: current.isActive,
      };
      if (current.id) {
        await TablesAPI.update(current.id, payload);
      } else {
        const created = await TablesAPI.create(payload);
        const newId = (created?.id || created?._id) as string | undefined;
        // Removido prompt de copiar link do QR ao criar
        // Ações de QR ficam disponíveis nos botões da lista (Download/Copiar Link)
      }
      await fetchTables();
      handleClose();
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || '';
      if (typeof msg === 'string' && /: 409\b/.test(msg)) {
        alert('Já existe uma mesa com o mesmo nome ou código. Por favor, escolha outro.');
      } else {
        alert('Ocorreu um erro ao guardar a mesa.');
      }
    }
  };

  const handleDelete = async (t: Table) => {
    try {
      if (!t.id) return;
      await TablesAPI.remove(t.id);
      await fetchTables();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateQR = async (t: Table) => {
    try {
      const id = t.id || '';
      if (!id) return;
      const svg = await TablesAPI.qrcode(id);
      setQrSvgs((prev) => ({ ...prev, [id]: svg }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadQR = async (t: Table) => {
    try {
      const id = t.id || '';
      if (!id) return;
      const svg = qrSvgs[id] || (await TablesAPI.qrcode(id));
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t.code || id}-qr.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLink = async (t: Table) => {
    try {
      const id = t.id || '';
      if (!id) return;
      const { url } = await TablesAPI.qrcodeUrl(id);
      await navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência');
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenBatch = () => setBatchOpen(true);
  const handleCloseBatch = () => setBatchOpen(false);
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  const handleCreateBatch = async () => {
    try {
      const tasks = [] as Promise<any>[];
      for (let i = 0; i < batchQty; i++) {
        const num = batchStart + i;
        const code = `${batchPrefix}${pad(num, batchPad)}`;
        tasks.push(
          TablesAPI.create({ name: `Mesa ${code}`, code, seats: 2, isActive: true })
        );
      }
      await Promise.all(tasks);
      await fetchTables();
      handleCloseBatch();
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || '';
      if (typeof msg === 'string' && /: 409\b/.test(msg)) {
        alert('Conflito ao criar em lote: já existe uma mesa com algum destes códigos.');
      } else {
        alert('Ocorreu um erro ao criar as mesas.');
      }
    }
  };

  useEffect(() => {
    const loadMissingQRs = async () => {
      try {
        const ids = tables.map((t) => t.id).filter(Boolean) as string[];
        const missing = ids.filter((id) => !qrSvgs[id]);
        if (missing.length === 0) return;
        const svgs = await Promise.all(missing.map((id) => TablesAPI.qrcode(id)));
        setQrSvgs((prev) => {
          const next = { ...prev };
          missing.forEach((id, idx) => {
            next[id] = svgs[idx];
          });
          return next;
        });
      } catch (e) {
        console.error(e);
      }
    };
    loadMissingQRs();
  }, [tables]);

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'Código', width: 140 },
    { field: 'name', headerName: 'Nome', width: 180 },
    { field: 'location', headerName: 'Localização', flex: 1 },
    { field: 'seats', headerName: 'Lugares', width: 120 },
    { field: 'qr', headerName: 'QR', width: 140, sortable: false, renderCell: (params) => {
        const id = (params.row.id || '') as string;
        const svg = qrSvgs[id];
        if (!svg) return <span>QR…</span>;
        const src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        return <img src={src} alt={`QR ${params.row.code}`} style={{ width: 100, height: 100 }} />;
      }},
    {
      field: 'actions',
      headerName: 'Ações',
      width: 360,
      renderCell: (params) => (
        <Box display="flex" gap={1} flexWrap="wrap" sx={{ '& > *': { mb: 0.5 } }}>
          <Button size="small" variant="outlined" onClick={() => handleOpen(params.row)}>Editar</Button>
          <Button size="small" color="error" onClick={() => handleDelete(params.row)}>Apagar</Button>
          <Button size="small" onClick={() => handleGenerateQR(params.row)}>Gerar QR</Button>
          <Button size="small" onClick={() => handleDownloadQR(params.row)}>Download QR</Button>
          <Button size="small" onClick={() => handleCopyLink(params.row)}>Copiar Link</Button>
        </Box>
      ),
    },
  ];

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <h2>Mesas</h2>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={handleOpenBatch}>Criar mesas numeradas</Button>
          <Button variant="contained" onClick={() => handleOpen()}>Nova Mesa</Button>
        </Box>
      </Box>
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={tables.map((t) => ({ id: t.id || t.code, ...t }))}
          columns={columns}
          pageSizeOptions={[5, 10, 25, 100]}
          rowHeight={120}
        />
      </div>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{current?.id ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nome" value={current?.name || ''} onChange={(e) => handleChange('name', e.target.value)} />
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

      <Dialog open={batchOpen} onClose={handleCloseBatch} fullWidth maxWidth="sm">
        <DialogTitle>Criar mesas numeradas</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1}>
            <TextField type="number" label="Início" value={batchStart} onChange={(e) => setBatchStart(Number(e.target.value))} />
            <TextField type="number" label="Quantidade" value={batchQty} onChange={(e) => setBatchQty(Number(e.target.value))} />
            <TextField label="Prefixo" value={batchPrefix} onChange={(e) => setBatchPrefix(e.target.value)} />
            <TextField type="number" label="Zeros à esquerda" value={batchPad} onChange={(e) => setBatchPad(Number(e.target.value))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBatch}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateBatch}>Criar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}