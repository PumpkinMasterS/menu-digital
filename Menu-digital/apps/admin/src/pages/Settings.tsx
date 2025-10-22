import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, TextField, Typography, Button, MenuItem, Select, FormControl, InputLabel, Stack, Chip } from '@mui/material';
import { apiGet, apiPatch, uploadImage } from '../api';

type Appearance = {
  mode?: 'light' | 'dark';
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  shapeRadius?: number;
};

type SettingsDoc = {
  busyMode?: boolean;
  delayMinutes?: number;
  appearance?: Appearance;
  branding?: Branding;
};

type Branding = {
  displayName?: string;
  logoImageUrl?: string;
  coverImageUrl?: string;
  mobileCenterLogo?: boolean;
};

// Presets rápidos (paleta + fonte)
const PRESETS: { key: string; name: string; appearance: Required<Appearance> }[] = [
  {
    key: 'poppins-red',
    name: 'Poppins + Vermelho',
    appearance: {
      mode: 'light',
      primaryColor: '#F51414',
      secondaryColor: '#111111',
      fontFamily:
        "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
      shapeRadius: 12,
    },
  },
  {
    key: 'inter-blue',
    name: 'Inter + Azul',
    appearance: {
      mode: 'light',
      primaryColor: '#1976D2',
      secondaryColor: '#26A69A',
      fontFamily:
        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
      shapeRadius: 10,
    },
  },
  {
    key: 'nunito-green',
    name: 'Nunito + Verde',
    appearance: {
      mode: 'light',
      primaryColor: '#2E7D32',
      secondaryColor: '#6D4C41',
      fontFamily:
        "Nunito Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
      shapeRadius: 14,
    },
  },
];

// Paleta recomendada de cores para seleção rápida
const COLOR_SWATCHES = [
  '#F51414', '#1976D2', '#26A69A', '#2E7D32', '#6D4C41',
  '#9C27B0', '#FF9800', '#E91E63', '#00BCD4', '#607D8B',
  '#111111', '#000000'
];
export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>({
    mode: 'light',
    primaryColor: '#F51414',
    secondaryColor: '#111111',
    fontFamily: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    shapeRadius: 12,
  });
  const [branding, setBranding] = useState<Branding>({
    displayName: 'Menu Digital',
    logoImageUrl: '',
    coverImageUrl: '',
    mobileCenterLogo: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<SettingsDoc>('/v1/admin/settings');
        const ap = data?.appearance ?? {};
        setAppearance((prev) => ({ ...prev, ...ap }));
        const br = data?.branding ?? {};
        setBranding((prev) => ({ ...prev, ...br }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: SettingsDoc = { appearance, branding };
      await apiPatch('/v1/admin/settings', payload);
      alert('Configurações guardadas');
    } catch (e: any) {
      alert(e.message || 'Falha ao guardar configurações');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (presetKey: string) => {
    const p = PRESETS.find((x) => x.key === presetKey);
    if (!p) return;
    setAppearance({ ...p.appearance });
  };

  const handleCoverFile = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1] || '';
        const { imageUrl } = await uploadImage(base64);
        setBranding((prev) => ({ ...prev, coverImageUrl: imageUrl }));
      } catch (e) {
        console.error(e);
        alert('Falha ao subir imagem de capa');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFile = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1] || '';
        const { imageUrl } = await uploadImage(base64);
        setBranding((prev) => ({ ...prev, logoImageUrl: imageUrl }));
      } catch (e) {
        console.error(e);
        alert('Falha ao subir logo');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Configurações de Aparência
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Defina cores, fonte e modo claro/escuro do Menu. O Menu lê estas definições em tempo real.
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
            <FormControl fullWidth>
              <InputLabel id="mode-label">Modo</InputLabel>
              <Select
                labelId="mode-label"
                value={appearance.mode || 'light'}
                label="Modo"
                onChange={(e) => setAppearance({ ...appearance, mode: e.target.value as 'light' | 'dark' })}
              >
                <MenuItem value="light">Claro</MenuItem>
                <MenuItem value="dark">Escuro</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Cor Primária"
              value={appearance.primaryColor || ''}
              onChange={(e) => setAppearance({ ...appearance, primaryColor: e.target.value })}
              helperText="Ex.: #F51414"
              fullWidth
            />

            <TextField
              label="Cor Secundária"
              value={appearance.secondaryColor || ''}
              onChange={(e) => setAppearance({ ...appearance, secondaryColor: e.target.value })}
              helperText="Ex.: #111111"
              fullWidth
            />

            <TextField
              label="Fonte"
              value={appearance.fontFamily || ''}
              onChange={(e) => setAppearance({ ...appearance, fontFamily: e.target.value })}
              helperText="Ex.: Poppins, Roboto, Inter (mantenha fallback)"
              fullWidth
            />

            <TextField
              type="number"
              label="Raio das Bordas"
              value={appearance.shapeRadius ?? 12}
              onChange={(e) => setAppearance({ ...appearance, shapeRadius: Number(e.target.value) })}
              helperText="px"
              fullWidth
            />
          </Box>

          {/* Presets rápidos */}
          <Box mt={3}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Presets rápidos (paleta + fonte)
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  variant="outlined"
                  size="small"
                  onClick={() => applyPreset(p.key)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 600,
                    bgcolor: '#fff',
                  }}
                >
                  {p.name}
                </Button>
              ))}
              <Chip
                label="Repor (defaults)"
                onClick={() => applyPreset('poppins-red')}
                clickable
                sx={{ borderRadius: 2, fontWeight: 600 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Dica: clique num preset e depois em "Guardar" para aplicar no Menu.
            </Typography>
          </Box>

          {/* Paleta de cores simples */}
          <Box mt={3}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Paleta de cores (rápido)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              Clique numa cor para definir Primária ou Secundária. Também pode escolher livremente.
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ minWidth: 90 }}>Primária</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {COLOR_SWATCHES.map((c) => (
                  <Box
                    key={`prim-${c}`}
                    onClick={() => setAppearance({ ...appearance, primaryColor: c })}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: c,
                      border: '2px solid #fff',
                      boxShadow: appearance.primaryColor === c ? '0 0 0 2px #000' : '0 0 0 1px rgba(0,0,0,0.15)',
                      cursor: 'pointer'
                    }}
                    title={c}
                  />
                ))}
                <TextField
                  type="color"
                  value={appearance.primaryColor || '#F51414'}
                  onChange={(e) => setAppearance({ ...appearance, primaryColor: e.target.value })}
                  sx={{ width: 48, minWidth: 48, p: 0 }}
                  InputProps={{ sx: { p: 0 } }}
                />
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 90 }}>Secundária</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {COLOR_SWATCHES.map((c) => (
                  <Box
                    key={`sec-${c}`}
                    onClick={() => setAppearance({ ...appearance, secondaryColor: c })}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: c,
                      border: '2px solid #fff',
                      boxShadow: appearance.secondaryColor === c ? '0 0 0 2px #000' : '0 0 0 1px rgba(0,0,0,0.15)',
                      cursor: 'pointer'
                    }}
                    title={c}
                  />
                ))}
                <TextField
                  type="color"
                  value={appearance.secondaryColor || '#111111'}
                  onChange={(e) => setAppearance({ ...appearance, secondaryColor: e.target.value })}
                  sx={{ width: 48, minWidth: 48, p: 0 }}
                  InputProps={{ sx: { p: 0 } }}
                />
              </Stack>
            </Stack>
          </Box>

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button
              variant="contained"
              disabled={saving || loading}
              onClick={handleSave}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mt: 4 }}>
        Branding do Menu
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Defina imagem de capa, logo e nome exibidos no topo do Menu.
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
            <TextField
              label="Nome/Marca"
              value={branding.displayName || ''}
              onChange={(e) => setBranding({ ...branding, displayName: e.target.value })}
              helperText="Ex.: Burger Ranch"
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Imagem de Capa</Typography>
              {branding.coverImageUrl ? (
                <img src={branding.coverImageUrl} alt="Capa" style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }} />
              ) : (
                <Box sx={{ width: '100%', height: 120, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }} />
              )}
              <Button variant="outlined" sx={{ mt: 1 }} component="label">
                Subir imagem
                <input hidden type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCoverFile(f);
                }} />
              </Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Logo</Typography>
              {branding.logoImageUrl ? (
                <img src={branding.logoImageUrl} alt="Logo" style={{ width: 96, height: 96, borderRadius: 12, objectFit: 'cover' }} />
              ) : (
                <Box sx={{ width: 96, height: 96, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }} />
              )}
              <Button variant="outlined" sx={{ mt: 1 }} component="label">
                Subir logo
                <input hidden type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                }} />
              </Button>
            </Box>
          </Box>

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button
              variant="contained"
              disabled={saving || loading}
              onClick={handleSave}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}