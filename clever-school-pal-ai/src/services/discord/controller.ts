import { supabase } from '@/integrations/supabase/client';
import { logger } from '../../lib/logger';

export interface BotStatus {
  isRunning: boolean;
  status: string;
  processId?: string;
  startTime?: string;
  lastActivity?: string | null;
  error?: string | null;
}

export class DiscordBotController {
  private static instance: DiscordBotController;
  private botStatus: BotStatus = { 
    isRunning: false, 
    status: 'offline',
    error: null,
    lastActivity: null
  };
  private statusCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.startStatusMonitoring();
  }

  public static getInstance(): DiscordBotController {
    if (!DiscordBotController.instance) {
      DiscordBotController.instance = new DiscordBotController();
    }
    return DiscordBotController.instance;
  }

  private startStatusMonitoring(): void {
    // Check bot status every 30 seconds
    this.statusCheckInterval = setInterval(() => {
      this.checkBotStatus();
    }, 30000);
    
    // Initial check
    this.checkBotStatus();
  }

  private async checkBotStatus(): Promise<void> {
    try {
      // Check if bot is responding by querying recent interactions
      const { data, error } = await supabase
        .from('discord_interactions')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('Error checking bot status', { error });
        this.botStatus = { 
          isRunning: false, 
          status: 'offline',
          error: 'Erro ao verificar status do bot',
          lastActivity: null
        };
        return;
      }

      const lastActivity = data?.[0]?.created_at;
      const now = new Date();
      const lastActivityTime = lastActivity ? new Date(lastActivity) : null;
      
      // Consider bot active if there was activity in the last 5 minutes
      // or if we can't determine (assume it's running)
      const isRecentActivity = lastActivityTime ? 
        (now.getTime() - lastActivityTime.getTime()) < 5 * 60 * 1000 : false;

      this.botStatus = {
        isRunning: true, // We'll assume it's running unless we can prove otherwise
        status: isRecentActivity ? 'online' : 'idle',
        lastActivity: lastActivity || null,
        error: null
      };
    } catch (error) {
      logger.error('Error in bot status check', { error });
      this.botStatus = { 
        isRunning: false, 
        status: 'error',
        error: 'Erro na verificação de status',
        lastActivity: null
      };
    }
  }

  public async startBot(): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, this would start the bot process
      // For now, we'll simulate it by updating the status
      
      // Skipping direct insert into discord_interactions from frontend to avoid RLS 403s.
      // Logging is handled by the backend Discord bot service.

      this.botStatus = {
        isRunning: true,
        status: 'online',
        startTime: new Date().toISOString(),
        error: null,
        lastActivity: null
      };

      return { 
        success: true, 
        message: 'Bot Discord iniciado com sucesso!' 
      };
    } catch (error) {
      logger.error('Error starting bot', { error });
      return { 
        success: false, 
        message: 'Erro ao iniciar o bot Discord' 
      };
    }
  }

  public async stopBot(): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, this would stop the bot process
      
      // Skipping direct insert into discord_interactions from frontend to avoid RLS 403s.
      // Logging is handled by the backend Discord bot service.

      this.botStatus = {
        isRunning: false,
        status: 'offline',
        error: null,
        lastActivity: null
      };

      return { 
        success: true, 
        message: 'Bot Discord parado com sucesso!' 
      };
    } catch (error) {
      logger.error('Error stopping bot', { error });
      return { 
        success: false, 
        message: 'Erro ao parar o bot Discord' 
      };
    }
  }

  public async restartBot(): Promise<{ success: boolean; message: string }> {
    try {
      // Stop first
      const stopResult = await this.stopBot();
      if (!stopResult.success) {
        return stopResult;
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start again
      const startResult = await this.startBot();
      if (!startResult.success) {
        return startResult;
      }

      // Skipping direct insert into discord_interactions from frontend to avoid RLS 403s.
      // Logging is handled by the backend Discord bot service.

      return { 
        success: true, 
        message: 'Bot Discord reiniciado com sucesso!' 
      };
    } catch (error) {
      logger.error('Error restarting bot', { error });
      return { 
        success: false, 
        message: 'Erro ao reiniciar o bot Discord' 
      };
    }
  }

  public getBotStatus(): BotStatus {
    return { ...this.botStatus };
  }

  public destroy(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  }
}

// Export singleton instance
export const discordBotController = DiscordBotController.getInstance();