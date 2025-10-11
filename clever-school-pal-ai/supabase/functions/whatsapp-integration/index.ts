/// <reference types="https://deno.land/x/types/deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  to: string;
  message_type: 'utility' | 'marketing' | 'authentication' | 'service';
  template_name: string;
  parameters?: Array<{ type: string; text: string }>;
  content?: string;
}

interface WhatsAppConfig {
  access_token: string;
  phone_number_id: string;
  business_account_id: string;
  verify_token: string;
}

interface WhatsAppMessageData {
  messaging_product: string;
  to: string;
  type: string;
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }>;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'send-message':
        return await handleSendMessage(req, supabaseClient);
      
      case 'webhook':
        return await handleWebhook(req, supabaseClient);
      
      case 'setup-config':
        return await handleSetupConfig(req, supabaseClient);
      
      case 'test-connection':
        return await handleTestConnection(req, supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('WhatsApp Integration Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleSendMessage(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const { to, message_type, template_name, parameters, content }: WhatsAppMessage = await req.json();
  
  // Get WhatsApp config from database
  const { data: config, error: configError } = await supabase
    .from('whatsapp_config')
    .select('*')
    .single();

  if (configError || !config) {
    return new Response(
      JSON.stringify({ error: 'WhatsApp not configured. Please setup configuration first.' }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Prepare message data based on new PMP model (July 2025)
  const messageData: WhatsAppMessageData = {
    messaging_product: "whatsapp",
    to: to,
    type: content ? "text" : "template"
  };

  if (content) {
    // Service message (free within customer service window)
    messageData.text = { body: content };
  } else {
    // Template message (charged per message in PMP model)
    messageData.template = {
      name: template_name,
      language: { code: "pt" },
      components: parameters ? [
        {
          type: "body",
          parameters: parameters
        }
      ] : []
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API Error: ${JSON.stringify(result)}`);
    }

    // Log message for analytics (PMP tracking)
    await supabase.from('whatsapp_messages').insert({
      message_id: result.id,
      to_number: to,
      message_type: message_type,
      template_name: template_name,
      pricing_model: 'PMP', // New Per-Message Pricing
      sent_at: new Date().toISOString(),
      status: 'sent'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: result.id,
        pricing_model: 'PMP',
        message_type: message_type
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send message', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleWebhook(req: Request, supabase: any) {
  if (req.method === 'GET') {
    // Webhook verification
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('verify_token')
      .single();

    if (mode === 'subscribe' && token === config?.verify_token) {
      console.log('Webhook verified successfully');
      return new Response(challenge);
    }
    
    return new Response('Unauthorized', { status: 403 });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    
    // Process webhook events with new PMP model
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          await processWebhookMessage(change.value, supabase);
        }
      }
    }

    return new Response('OK');
  }

  return new Response('Method not allowed', { status: 405 });
}

async function processWebhookMessage(messageData: any, supabase: any) {
  try {
    // Handle incoming messages
    if (messageData.messages) {
      for (const message of messageData.messages) {
        await supabase.from('whatsapp_incoming_messages').insert({
          message_id: message.id,
          from_number: message.from,
          message_type: message.type,
          content: message.text?.body || message.type,
          timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
          received_at: new Date().toISOString()
        });
      }
    }

    // Handle message status updates (PMP model)
    if (messageData.statuses) {
      for (const status of messageData.statuses) {
        // New PMP pricing information
        const pricingInfo = status.pricing || {};
        
        await supabase.from('whatsapp_messages')
          .update({
            status: status.status,
            pricing_model: pricingInfo.pricing_model || 'PMP',
            pricing_type: pricingInfo.type,
            pricing_category: pricingInfo.category,
            billable: pricingInfo.billable,
            updated_at: new Date().toISOString()
          })
          .eq('message_id', status.id);
      }
    }
  } catch (error) {
    console.error('Process webhook error:', error);
  }
}

async function handleSetupConfig(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const config: WhatsAppConfig = await req.json();

  try {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .upsert({
        id: 1,
        access_token: config.access_token,
        phone_number_id: config.phone_number_id,
        business_account_id: config.business_account_id,
        verify_token: config.verify_token,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'WhatsApp configuration saved' }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to save configuration', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleTestConnection(req: Request, supabase: any) {
  try {
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'No configuration found' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test API connection
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${config.phone_number_id}`,
      {
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
        },
      }
    );

    const result = await response.json();

    return new Response(
      JSON.stringify({ 
        success: response.ok, 
        data: result,
        message: response.ok ? 'Connection successful' : 'Connection failed'
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Test failed', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
} 