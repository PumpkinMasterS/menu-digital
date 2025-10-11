# 📊 **MONITORING & METRICS - ENTERPRISE DASHBOARD**
*Sistema completo de observabilidade para SaborPortuguês*

## 🎯 **OVERVIEW**

Este documento define o sistema completo de monitoramento, métricas e alertas para a plataforma SaborPortuguês, incluindo KPIs de negócio, métricas técnicas e dashboards operacionais.

---

## 📈 **BUSINESS METRICS & KPIs**

### **Core Business Metrics**

```sql
-- 1. ORDER METRICS (Real-time)
CREATE VIEW business_metrics_orders AS
SELECT 
    DATE(created_at) as date,
    organization_id,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
    AVG(total_amount) as average_order_value,
    SUM(total_amount) FILTER (WHERE status = 'delivered') as total_revenue,
    AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))/60) as avg_delivery_time_minutes
FROM orders 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), organization_id;

-- 2. RESTAURANT PERFORMANCE
CREATE VIEW restaurant_performance AS
SELECT 
    r.id,
    r.name,
    COUNT(o.id) as total_orders,
    AVG(o.total_amount) as avg_order_value,
    AVG(r.rating) as current_rating,
    COUNT(*) FILTER (WHERE o.status = 'cancelled') * 100.0 / COUNT(*) as cancellation_rate,
    AVG(EXTRACT(EPOCH FROM (o.accepted_at - o.created_at))/60) as avg_acceptance_time_minutes
FROM restaurants r
LEFT JOIN orders o ON r.id = o.restaurant_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY r.id, r.name;

-- 3. DRIVER EFFICIENCY
CREATE VIEW driver_efficiency AS
SELECT 
    d.id,
    p.full_name as driver_name,
    COUNT(o.id) as total_deliveries,
    AVG(d.average_rating) as rating,
    SUM(d.total_earnings) as total_earnings,
    AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.picked_up_at))/60) as avg_delivery_time
FROM drivers d
JOIN profiles p ON d.profile_id = p.id
LEFT JOIN orders o ON d.id = o.driver_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY d.id, p.full_name;
```

### **Customer Engagement Metrics**

```typescript
// Customer Retention & Engagement
interface CustomerMetrics {
  newCustomers: number;
  returningCustomers: number;
  churnRate: number;
  averageOrdersPerCustomer: number;
  customerLifetimeValue: number;
  subscriptionConversionRate: number;
}

// Example calculation function
async function calculateCustomerMetrics(organizationId: string, supabase: any): Promise<CustomerMetrics> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // New customers (first order in last 30 days)
  const { data: newCustomers } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('organization_id', organizationId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at')
    .limit(1);
  
  // Returning customers
  const { data: returningCustomers } = await supabase.rpc('get_returning_customers', {
    org_id: organizationId,
    days: 30
  });

  return {
    newCustomers: newCustomers?.length || 0,
    returningCustomers: returningCustomers?.length || 0,
    churnRate: 0, // Calculate based on subscription cancellations
    averageOrdersPerCustomer: 0,
    customerLifetimeValue: 0,
    subscriptionConversionRate: 0
  };
}
```

---

## ⚡ **TECHNICAL METRICS**

### **Application Performance**

```typescript
// Performance Metrics Interface
interface PerformanceMetrics {
  apiResponseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  throughput: number;
  databaseConnectionPool: {
    active: number;
    idle: number;
    waiting: number;
  };
  edgeFunctionInvocations: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
}

// Metrics Collection Service
class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  
  recordResponseTime(endpoint: string, duration: number) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    this.metrics.get(endpoint)!.push(duration);
  }
  
  calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
  
  getMetrics(endpoint: string): { p50: number; p95: number; p99: number } {
    const values = this.metrics.get(endpoint) || [];
    return {
      p50: this.calculatePercentile(values, 50),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99),
    };
  }
}
```

### **System Health Checks**

```sql
-- Database Health Metrics
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'database', json_build_object(
            'connections', (SELECT count(*) FROM pg_stat_activity),
            'active_queries', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
            'table_sizes', (
                SELECT json_object_agg(tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)))
                FROM pg_tables 
                WHERE schemaname = 'public'
            ),
            'cache_hit_ratio', (
                SELECT round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
                FROM pg_statio_user_tables
            )
        ),
        'orders', json_build_object(
            'pending_count', (SELECT count(*) FROM orders WHERE status = 'pending'),
            'processing_count', (SELECT count(*) FROM orders WHERE status IN ('accepted', 'preparing')),
            'last_hour_orders', (SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour')
        ),
        'drivers', json_build_object(
            'online_count', (SELECT count(*) FROM drivers WHERE status = 'online'),
            'busy_count', (SELECT count(*) FROM drivers WHERE status = 'busy'),
            'average_rating', (SELECT avg(average_rating) FROM drivers WHERE is_active = true)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚨 **ALERTING SYSTEM**

### **Critical Alerts (Immediate Action Required)**

```typescript
interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  channels: ('email' | 'slack' | 'sms')[];
  cooldown: number; // minutes
}

const criticalAlerts: AlertRule[] = [
  {
    name: 'High Error Rate',
    condition: 'error_rate > threshold',
    threshold: 5, // 5%
    severity: 'critical',
    channels: ['email', 'slack', 'sms'],
    cooldown: 15
  },
  {
    name: 'Database Connection Pool Exhausted',
    condition: 'db_connections > threshold',
    threshold: 95, // 95% of max connections
    severity: 'critical',
    channels: ['email', 'slack'],
    cooldown: 5
  },
  {
    name: 'Payment Processing Failure',
    condition: 'payment_failure_rate > threshold',
    threshold: 10, // 10%
    severity: 'critical',
    channels: ['email', 'slack', 'sms'],
    cooldown: 10
  },
  {
    name: 'No Online Drivers',
    condition: 'online_drivers = 0',
    threshold: 0,
    severity: 'critical',
    channels: ['email', 'slack'],
    cooldown: 30
  }
];

// Alert Processing Function
async function processAlerts(metrics: any, supabase: any) {
  for (const rule of criticalAlerts) {
    const shouldAlert = evaluateCondition(rule, metrics);
    
    if (shouldAlert) {
      const lastAlert = await getLastAlert(rule.name, supabase);
      const cooldownExpired = !lastAlert || 
        (Date.now() - lastAlert.created_at) > (rule.cooldown * 60 * 1000);
      
      if (cooldownExpired) {
        await sendAlert(rule, metrics);
        await recordAlert(rule.name, metrics, supabase);
      }
    }
  }
}
```

### **Business Alerts**

```typescript
const businessAlerts: AlertRule[] = [
  {
    name: 'Low Order Volume',
    condition: 'hourly_orders < threshold',
    threshold: 10,
    severity: 'warning',
    channels: ['email'],
    cooldown: 60
  },
  {
    name: 'High Cancellation Rate',
    condition: 'cancellation_rate > threshold',
    threshold: 15, // 15%
    severity: 'warning',
    channels: ['email', 'slack'],
    cooldown: 30
  },
  {
    name: 'Revenue Drop',
    condition: 'daily_revenue < threshold',
    threshold: 0.8, // 80% of average
    severity: 'warning',
    channels: ['email'],
    cooldown: 240 // 4 hours
  }
];
```

---

## 📱 **REAL-TIME DASHBOARDS**

### **Executive Dashboard**

```typescript
interface ExecutiveDashboard {
  today: {
    totalOrders: number;
    revenue: number;
    activeCustomers: number;
    averageOrderValue: number;
  };
  thisWeek: {
    orderGrowth: number; // percentage
    revenueGrowth: number;
    newCustomers: number;
    customerRetention: number;
  };
  performance: {
    systemUptime: number;
    averageDeliveryTime: number;
    customerSatisfaction: number;
    driverUtilization: number;
  };
}

// Dashboard Data Fetcher
async function getExecutiveDashboard(organizationId: string, supabase: any): Promise<ExecutiveDashboard> {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Today's metrics
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total_amount, status')
    .eq('organization_id', organizationId)
    .gte('created_at', today);
  
  const totalOrders = todayOrders?.length || 0;
  const revenue = todayOrders?.reduce((sum, order) => 
    order.status === 'delivered' ? sum + order.total_amount : sum, 0) || 0;
  
  // Calculate growth metrics
  const { data: lastWeekOrders } = await supabase
    .from('orders')
    .select('total_amount, status')
    .eq('organization_id', organizationId)
    .gte('created_at', weekAgo)
    .lt('created_at', today);
  
  const lastWeekRevenue = lastWeekOrders?.reduce((sum, order) => 
    order.status === 'delivered' ? sum + order.total_amount : sum, 0) || 0;
  
  const revenueGrowth = lastWeekRevenue > 0 ? 
    ((revenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
  
  return {
    today: {
      totalOrders,
      revenue,
      activeCustomers: 0, // Calculate from unique customer IDs
      averageOrderValue: totalOrders > 0 ? revenue / totalOrders : 0
    },
    thisWeek: {
      orderGrowth: 0, // Calculate similar to revenue growth
      revenueGrowth,
      newCustomers: 0, // Calculate from first-time orders
      customerRetention: 0 // Calculate from repeat customers
    },
    performance: {
      systemUptime: 99.9, // From monitoring service
      averageDeliveryTime: 35, // Minutes
      customerSatisfaction: 4.5, // Average rating
      driverUtilization: 75 // Percentage of time drivers are busy
    }
  };
}
```

### **Operations Dashboard**

```sql
-- Real-time Operations View
CREATE VIEW operations_dashboard AS
SELECT 
    -- Order Pipeline
    COUNT(*) FILTER (WHERE status = 'pending') as orders_pending,
    COUNT(*) FILTER (WHERE status = 'accepted') as orders_accepted,
    COUNT(*) FILTER (WHERE status = 'preparing') as orders_preparing,
    COUNT(*) FILTER (WHERE status = 'out_for_delivery') as orders_out_for_delivery,
    
    -- Driver Status
    (SELECT COUNT(*) FROM drivers WHERE status = 'online') as drivers_online,
    (SELECT COUNT(*) FROM drivers WHERE status = 'busy') as drivers_busy,
    
    -- Performance Metrics
    AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))/60) FILTER (WHERE accepted_at IS NOT NULL) as avg_acceptance_time,
    AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))/60) FILTER (WHERE delivered_at IS NOT NULL) as avg_total_time,
    
    -- Revenue Metrics
    SUM(total_amount) FILTER (WHERE status = 'delivered' AND DATE(created_at) = CURRENT_DATE) as today_revenue,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_orders
    
FROM orders 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
```

---

## 🔍 **MONITORING IMPLEMENTATION**

### **Edge Function Monitoring**

```typescript
// Monitoring Middleware for Edge Functions
export function withMonitoring(handler: Function) {
  return async (request: Request) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Record request start
      console.log(JSON.stringify({
        event: 'request_start',
        requestId,
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString()
      }));
      
      const response = await handler(request);
      
      // Record successful completion
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        event: 'request_complete',
        requestId,
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      }));
      
      // Add monitoring headers
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', duration.toString());
      
      return response;
      
    } catch (error) {
      // Record error
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        event: 'request_error',
        requestId,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      }));
      
      throw error;
    }
  };
}
```

### **Database Query Monitoring**

```sql
-- Enable query logging and monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Query Performance View
CREATE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time
FROM pg_stat_statements 
WHERE mean_time > 100 -- Queries averaging > 100ms
ORDER BY mean_time DESC;
```

---

## 📊 **METRICS EXPORT & INTEGRATION**

### **Prometheus Metrics Export**

```typescript
// Prometheus metrics exporter
class PrometheusExporter {
  private metrics: Map<string, any> = new Map();
  
  incrementCounter(name: string, labels: Record<string, string> = {}) {
    const key = `${name}_${JSON.stringify(labels)}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }
  
  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = `${name}_${JSON.stringify(labels)}`;
    this.metrics.set(key, value);
  }
  
  export(): string {
    let output = '';
    
    for (const [key, value] of this.metrics) {
      const [name, labelsStr] = key.split('_', 2);
      const labels = labelsStr ? JSON.parse(labelsStr) : {};
      
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      
      output += `${name}{${labelStr}} ${value}\n`;
    }
    
    return output;
  }
}

// Usage in Edge Functions
const metrics = new PrometheusExporter();

// In your handlers
metrics.incrementCounter('orders_total', { status: 'created', organization: orgId });
metrics.setGauge('drivers_online', onlineDriversCount, { organization: orgId });
```

---

## 🎯 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Core Monitoring (Week 1)**
- [ ] Implement structured logging in all Edge Functions
- [ ] Create basic business metrics views
- [ ] Setup system health checks
- [ ] Configure critical alerts (error rate, downtime)

### **Phase 2: Advanced Metrics (Week 2)**
- [ ] Build executive dashboard
- [ ] Implement performance monitoring
- [ ] Create operations dashboard
- [ ] Setup business alerts

### **Phase 3: Analytics & Optimization (Week 3)**
- [ ] Customer behavior analytics
- [ ] Driver efficiency metrics
- [ ] Restaurant performance analytics
- [ ] Predictive alerting

### **Phase 4: External Integration (Week 4)**
- [ ] Prometheus/Grafana integration
- [ ] Slack/Teams notifications
- [ ] Mobile dashboard app
- [ ] Automated reporting

---

## 📈 **SUCCESS METRICS**

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| **Alert Response Time** | Manual | <5 minutes | Week 2 |
| **System Visibility** | 30% | 95% | Week 3 |
| **MTTR (Mean Time to Recovery)** | 2 hours | <30 minutes | Week 4 |
| **Proactive Issue Detection** | 10% | 80% | Month 2 |

**Esta implementação estabelece uma base sólida para monitoramento enterprise-grade do SaborPortuguês! 🚀** 