import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppMessage {
  to: string;
  message_type: 'utility' | 'marketing' | 'authentication' | 'service';
  template_name?: string;
  parameters?: Array<{ type: string; text: string }>;
  content?: string;
}

interface WhatsAppSendResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

interface WhatsAppStats {
  messages_sent: number;
  messages_delivered: number;
  cost_today: number;
  cost_month: number;
}

export function useWhatsApp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: WhatsAppMessage): Promise<WhatsAppSendResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('whatsapp-integration/send-message', {
        body: message
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao enviar mensagem');
      }

      return {
        success: true,
        message_id: data.message_id
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendAssignmentReminder = useCallback(async (
    phoneNumber: string,
    studentName: string,
    subject: string,
    dueDate: string
  ): Promise<WhatsAppSendResult> => {
    return sendMessage({
      to: phoneNumber,
      message_type: 'utility',
      template_name: 'assignment_reminder',
      parameters: [
        { type: 'text', text: studentName },
        { type: 'text', text: subject },
        { type: 'text', text: dueDate }
      ]
    });
  }, [sendMessage]);

  const sendGradeNotification = useCallback(async (
    phoneNumber: string,
    studentName: string,
    subject: string,
    grade: string
  ): Promise<WhatsAppSendResult> => {
    return sendMessage({
      to: phoneNumber,
      message_type: 'utility',
      template_name: 'grade_notification',
      parameters: [
        { type: 'text', text: studentName },
        { type: 'text', text: subject },
        { type: 'text', text: grade }
      ]
    });
  }, [sendMessage]);

  const sendAbsenceAlert = useCallback(async (
    phoneNumber: string,
    studentName: string,
    subject: string,
    date: string
  ): Promise<WhatsAppSendResult> => {
    return sendMessage({
      to: phoneNumber,
      message_type: 'utility',
      template_name: 'absence_alert',
      parameters: [
        { type: 'text', text: studentName },
        { type: 'text', text: subject },
        { type: 'text', text: date }
      ]
    });
  }, [sendMessage]);

  const sendCourseAnnouncement = useCallback(async (
    phoneNumber: string,
    courseName: string,
    enrollmentDeadline: string,
    moreInfoUrl: string
  ): Promise<WhatsAppSendResult> => {
    return sendMessage({
      to: phoneNumber,
      message_type: 'marketing',
      template_name: 'new_course_announcement',
      parameters: [
        { type: 'text', text: courseName },
        { type: 'text', text: enrollmentDeadline },
        { type: 'text', text: moreInfoUrl }
      ]
    });
  }, [sendMessage]);

  const sendServiceMessage = useCallback(async (
    phoneNumber: string,
    content: string
  ): Promise<WhatsAppSendResult> => {
    return sendMessage({
      to: phoneNumber,
      message_type: 'service',
      content: content
    });
  }, [sendMessage]);

  const sendBulkMessages = useCallback(async (
    recipients: Array<{ phone: string; studentName: string }>,
    messageType: 'assignment_reminder' | 'grade_notification' | 'absence_alert' | 'course_announcement',
    templateData: Record<string, string>
  ): Promise<{ sent: number; failed: number; errors: string[] }> => {
    setIsLoading(true);
    setError(null);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        let result: WhatsAppSendResult;

        switch (messageType) {
          case 'assignment_reminder':
            result = await sendAssignmentReminder(
              recipient.phone,
              recipient.studentName,
              templateData.subject,
              templateData.dueDate
            );
            break;
          case 'grade_notification':
            result = await sendGradeNotification(
              recipient.phone,
              recipient.studentName,
              templateData.subject,
              templateData.grade
            );
            break;
          case 'absence_alert':
            result = await sendAbsenceAlert(
              recipient.phone,
              recipient.studentName,
              templateData.subject,
              templateData.date
            );
            break;
          case 'course_announcement':
            result = await sendCourseAnnouncement(
              recipient.phone,
              templateData.courseName,
              templateData.enrollmentDeadline,
              templateData.moreInfoUrl
            );
            break;
          default:
            throw new Error('Tipo de mensagem não suportado');
        }

        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push(`${recipient.phone}: ${result.error}`);
        }

        // Delay between messages to avoid rate limiting
        if (recipients.indexOf(recipient) < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        failed++;
        errors.push(`${recipient.phone}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
    }

    setIsLoading(false);

    if (sent > 0) {
      toast.success(`✅ ${sent} mensagens enviadas com sucesso!`);
    }
    if (failed > 0) {
      toast.error(`❌ ${failed} mensagens falharam`);
    }

    return { sent, failed, errors };
  }, [sendAssignmentReminder, sendGradeNotification, sendAbsenceAlert, sendCourseAnnouncement]);

  const getStats = useCallback(async (): Promise<WhatsAppStats | null> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Get today's stats
      const { data: todayStats } = await supabase
        .from('whatsapp_analytics')
        .select('messages_sent, messages_delivered, total_cost')
        .eq('date', today)
        .single();

      // Get month stats
      const { data: monthStats } = await supabase
        .from('whatsapp_analytics')
        .select('total_cost')
        .gte('date', monthStart);

      const monthTotal = monthStats?.reduce((sum, day) => sum + (day.total_cost || 0), 0) || 0;

      return {
        messages_sent: todayStats?.messages_sent || 0,
        messages_delivered: todayStats?.messages_delivered || 0,
        cost_today: todayStats?.total_cost || 0,
        cost_month: monthTotal
      };
    } catch (err) {
      console.error('Erro ao obter estatísticas WhatsApp:', err);
      return null;
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('whatsapp-integration/test-connection');

      if (error) {
        throw new Error(error.message);
      }

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no teste de conexão';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateMessageCost = useCallback((messageType: 'utility' | 'marketing' | 'authentication' | 'service'): number => {
    // PMP Pricing for Portugal (July 2025)
    switch (messageType) {
      case 'marketing':
        return 0.0514;
      case 'utility':
      case 'authentication':
        return 0.0164;
      case 'service':
        return 0.0000; // Free within customer service window
      default:
        return 0.0164;
    }
  }, []);

  return {
    // State
    isLoading,
    error,

    // Core functions
    sendMessage,
    sendBulkMessages,
    getStats,
    testConnection,

    // Convenience functions for common educational messages
    sendAssignmentReminder,
    sendGradeNotification,
    sendAbsenceAlert,
    sendCourseAnnouncement,
    sendServiceMessage,

    // Utility functions
    calculateMessageCost
  };
} 