-- WhatsApp Integration Tables with PMP (Per-Message Pricing) Support
-- Created for July 2025 WhatsApp Business API changes

-- WhatsApp Configuration Table
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    access_token TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    business_account_id TEXT NOT NULL,
    verify_token TEXT NOT NULL,
    webhook_url TEXT,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_config CHECK (id = 1)
);

-- WhatsApp Message Templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('utility', 'marketing', 'authentication')),
    language TEXT NOT NULL DEFAULT 'pt',
    status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    components JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outgoing WhatsApp Messages (PMP Model)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT UNIQUE, -- WhatsApp message ID
    to_number TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('utility', 'marketing', 'authentication', 'service')),
    template_name TEXT,
    content TEXT,
    pricing_model TEXT DEFAULT 'PMP' CHECK (pricing_model IN ('PMP', 'CBP')),
    pricing_type TEXT CHECK (pricing_type IN ('regular', 'free_customer_service', 'free_entry_point')),
    pricing_category TEXT CHECK (pricing_category IN ('utility', 'marketing', 'authentication', 'service')),
    billable BOOLEAN DEFAULT true,
    cost_estimate DECIMAL(10,4),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    school_id UUID REFERENCES schools(id),
    student_id UUID REFERENCES students(id),
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incoming WhatsApp Messages
CREATE TABLE IF NOT EXISTS whatsapp_incoming_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT UNIQUE NOT NULL,
    from_number TEXT NOT NULL,
    message_type TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    school_id UUID REFERENCES schools(id),
    student_id UUID REFERENCES students(id),
    response_sent BOOLEAN DEFAULT false
);

-- WhatsApp Campaigns (for bulk messaging)
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_name TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('utility', 'marketing', 'authentication')),
    target_audience JSONB, -- Criteria for targeting
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'cancelled')),
    total_recipients INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    school_id UUID REFERENCES schools(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Contact Management
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    display_name TEXT,
    profile_name TEXT,
    student_id UUID REFERENCES students(id),
    school_id UUID REFERENCES schools(id),
    opt_in_status TEXT DEFAULT 'unknown' CHECK (opt_in_status IN ('opted_in', 'opted_out', 'unknown')),
    opt_in_date TIMESTAMPTZ,
    opt_out_date TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phone_number, school_id)
);

-- WhatsApp Analytics (PMP Tracking)
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    school_id UUID REFERENCES schools(id),
    message_type TEXT NOT NULL,
    pricing_model TEXT DEFAULT 'PMP',
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    average_cost_per_message DECIMAL(6,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, school_id, message_type)
);

-- Insert default templates for educational use
INSERT INTO whatsapp_templates (name, category, language, components) VALUES
('assignment_reminder', 'utility', 'pt', '[
    {
        "type": "HEADER",
        "format": "TEXT",
        "text": "📚 Lembrete de Tarefa"
    },
    {
        "type": "BODY",
        "text": "Olá {{1}}, lembrete de que tem uma tarefa de {{2}} para entregar até {{3}}. Não se esqueça!"
    },
    {
        "type": "FOOTER",
        "text": "Clever School PAL AI"
    }
]'),
('grade_notification', 'utility', 'pt', '[
    {
        "type": "HEADER",
        "format": "TEXT", 
        "text": "📊 Nova Avaliação"
    },
    {
        "type": "BODY",
        "text": "{{1}}, a sua avaliação de {{2}} já está disponível. Nota obtida: {{3}}. Continue o bom trabalho!"
    },
    {
        "type": "FOOTER",
        "text": "Clever School PAL AI"
    }
]'),
('absence_alert', 'utility', 'pt', '[
    {
        "type": "HEADER",
        "format": "TEXT",
        "text": "⚠️ Alerta de Falta"
    },
    {
        "type": "BODY",
        "text": "Detectámos que {{1}} faltou à aula de {{2}} no dia {{3}}. Se foi uma ausência justificada, por favor contacte a escola."
    },
    {
        "type": "FOOTER",
        "text": "Clever School PAL AI"
    }
]'),
('new_course_announcement', 'marketing', 'pt', '[
    {
        "type": "HEADER",
        "format": "TEXT",
        "text": "🎓 Novo Curso Disponível"
    },
    {
        "type": "BODY",
        "text": "Temos o prazer de anunciar o novo curso: {{1}}! Inscrições abertas até {{2}}. Aproveite esta oportunidade de aprendizagem."
    },
    {
        "type": "FOOTER",
        "text": "Clever School PAL AI"
    },
    {
        "type": "BUTTONS",
        "buttons": [
            {
                "type": "URL",
                "text": "Saber Mais",
                "url": "{{3}}"
            }
        ]
    }
]');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_school_id ON whatsapp_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_student_id ON whatsapp_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_pricing_model ON whatsapp_messages(pricing_model);

CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_school_id ON whatsapp_incoming_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_timestamp ON whatsapp_incoming_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_processed ON whatsapp_incoming_messages(processed);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_school_id ON whatsapp_contacts(school_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_student_id ON whatsapp_contacts(student_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_date_school ON whatsapp_analytics(date, school_id);

-- RLS Policies
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_incoming_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_analytics ENABLE ROW LEVEL SECURITY;

-- Super admin can access all WhatsApp data
CREATE POLICY "Super admin full access to whatsapp_config" ON whatsapp_config
    FOR ALL USING (is_super_admin());

CREATE POLICY "Super admin full access to whatsapp_templates" ON whatsapp_templates
    FOR ALL USING (is_super_admin());

CREATE POLICY "Super admin full access to whatsapp_messages" ON whatsapp_messages
    FOR ALL USING (is_super_admin());

CREATE POLICY "Super admin full access to whatsapp_incoming_messages" ON whatsapp_incoming_messages
    FOR ALL USING (is_super_admin());

CREATE POLICY "Super admin full access to whatsapp_campaigns" ON whatsapp_campaigns
    FOR ALL USING (is_super_admin());

CREATE POLICY "Super admin full access to whatsapp_contacts" ON whatsapp_contacts
    FOR ALL USING (is_super_admin());

CREATE POLICY "Super admin full access to whatsapp_analytics" ON whatsapp_analytics
    FOR ALL USING (is_super_admin());

-- School-based access for regular users
CREATE POLICY "School users can view whatsapp_config" ON whatsapp_config
    FOR SELECT USING (NOT is_super_admin());

CREATE POLICY "School users can view whatsapp_templates" ON whatsapp_templates
    FOR SELECT USING (NOT is_super_admin());

CREATE POLICY "School users access their whatsapp_messages" ON whatsapp_messages
    FOR ALL USING (
        NOT is_super_admin() AND 
        school_id = (auth.jwt() ->> 'school_id')::uuid
    );

CREATE POLICY "School users access their whatsapp_incoming_messages" ON whatsapp_incoming_messages
    FOR ALL USING (
        NOT is_super_admin() AND 
        school_id = (auth.jwt() ->> 'school_id')::uuid
    );

CREATE POLICY "School users access their whatsapp_campaigns" ON whatsapp_campaigns
    FOR ALL USING (
        NOT is_super_admin() AND 
        school_id = (auth.jwt() ->> 'school_id')::uuid
    );

CREATE POLICY "School users access their whatsapp_contacts" ON whatsapp_contacts
    FOR ALL USING (
        NOT is_super_admin() AND 
        school_id = (auth.jwt() ->> 'school_id')::uuid
    );

CREATE POLICY "School users access their whatsapp_analytics" ON whatsapp_analytics
    FOR ALL USING (
        NOT is_super_admin() AND 
        school_id = (auth.jwt() ->> 'school_id')::uuid
    );

-- Functions for WhatsApp integration
CREATE OR REPLACE FUNCTION calculate_whatsapp_message_cost(
    message_type TEXT,
    country_code TEXT DEFAULT 'PT'
)
RETURNS DECIMAL(6,4) AS $$
BEGIN
    -- PMP Pricing for Portugal (July 2025)
    CASE message_type
        WHEN 'marketing' THEN RETURN 0.0514;
        WHEN 'utility' THEN RETURN 0.0164;
        WHEN 'authentication' THEN RETURN 0.0164;
        WHEN 'service' THEN RETURN 0.0000; -- Free within customer service window
        ELSE RETURN 0.0164;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to update message costs
CREATE OR REPLACE FUNCTION update_whatsapp_message_costs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.cost_estimate := calculate_whatsapp_message_cost(NEW.message_type);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate costs
CREATE TRIGGER trigger_update_whatsapp_message_costs
    BEFORE INSERT OR UPDATE ON whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_message_costs();

-- Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION aggregate_whatsapp_daily_analytics()
RETURNS VOID AS $$
DECLARE
    target_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    INSERT INTO whatsapp_analytics (
        date, school_id, message_type, pricing_model,
        messages_sent, messages_delivered, messages_read,
        total_cost, average_cost_per_message
    )
    SELECT 
        target_date,
        school_id,
        message_type,
        pricing_model,
        COUNT(*) as messages_sent,
        COUNT(*) FILTER (WHERE status IN ('delivered', 'read')) as messages_delivered,
        COUNT(*) FILTER (WHERE status = 'read') as messages_read,
        SUM(cost_estimate) as total_cost,
        AVG(cost_estimate) as average_cost_per_message
    FROM whatsapp_messages
    WHERE DATE(sent_at) = target_date
    GROUP BY school_id, message_type, pricing_model
    ON CONFLICT (date, school_id, message_type) 
    DO UPDATE SET
        messages_sent = EXCLUDED.messages_sent,
        messages_delivered = EXCLUDED.messages_delivered,
        messages_read = EXCLUDED.messages_read,
        total_cost = EXCLUDED.total_cost,
        average_cost_per_message = EXCLUDED.average_cost_per_message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE whatsapp_config IS 'WhatsApp Business API configuration with PMP support';
COMMENT ON TABLE whatsapp_messages IS 'Outgoing WhatsApp messages with Per-Message Pricing (PMP) tracking';
COMMENT ON TABLE whatsapp_templates IS 'WhatsApp message templates for educational use';
COMMENT ON TABLE whatsapp_analytics IS 'Daily analytics for WhatsApp usage and costs under PMP model';