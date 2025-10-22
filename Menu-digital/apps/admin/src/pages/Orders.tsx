import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Typography, Chip, Grid } from '@mui/material';
import { apiGet, apiPatch } from '../api';

type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

interface OrderItem {
  productId: string;
  name?: string;
  quantity: number;
  notes?: string;
}

interface Order {
  id: string;
  tableId?: string;
  items: OrderItem[];
  status: OrderStatus;
  total?: number;
  createdAt: string;
  nif?: string;
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'warning' as const, next: 'in_progress' as const },
  in_progress: { label: 'Em preparo', color: 'info' as const, next: 'ready' as const },
  ready: { label: 'Pronto', color: 'success' as const, next: 'delivered' as const },
  delivered: { label: 'Entregue', color: 'default' as const, next: null },
  cancelled: { label: 'Cancelado', color: 'error' as const, next: null },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ items: Order[] }>('/v1/admin/orders');
      setOrders(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      await apiPatch(`/v1/admin/orders/${id}`, { status: newStatus });
      await fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const groupedOrders = orders.reduce((acc, order) => {
    const status = order.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(order);
    return acc;
  }, {} as Record<OrderStatus, Order[]>);

  const columns: OrderStatus[] = ['pending', 'in_progress', 'ready', 'delivered'];

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Pedidos</Typography>
        <Button variant="outlined" onClick={fetchOrders} disabled={loading}>
          Atualizar
        </Button>
      </Box>

      <Grid container spacing={2}>
        {columns.map((status) => (
          <Grid xs={12} md={3} key={status}>
            <Box>
              <Typography variant="h6" mb={1}>
                {statusConfig[status].label} ({groupedOrders[status]?.length || 0})
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {(groupedOrders[status] || []).map((order) => (
                  <Card key={order.id} variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight="bold">
                          #{order.id.slice(0, 8)}
                        </Typography>
                        <Chip label={order.tableId || 'S/ mesa'} size="small" />
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {new Date(order.createdAt).toLocaleString('pt-PT')}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" display="block" mb={1}>
                        NIF: {order.nif || '-'}
                      </Typography>
                      
                      <Box mb={1}>
                        {order.items.map((item, idx) => (
                          <Typography key={idx} variant="body2">
                            {item.quantity}× {item.name || item.productId}
                          </Typography>
                        ))}
                      </Box>

                      {order.total && (
                        <Typography variant="body2" fontWeight="bold" mb={1}>
                          Total: {order.total.toFixed(2)}
                        </Typography>
                      )}

                      <Box display="flex" gap={1} flexWrap="wrap">
                        {statusConfig[status].next && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => updateStatus(order.id, statusConfig[status].next!)}
                          >
                            Avançar
                          </Button>
                        )}
                        {status !== 'cancelled' && status !== 'delivered' && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => updateStatus(order.id, 'cancelled')}
                          >
                            Cancelar
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

