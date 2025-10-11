import { DiscordBot } from './bot';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
config();

interface DiscordServerConfig {
  token: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  openaiApiKey?: string;
  port?: number;
}

export class DiscordServer {
  private bot: DiscordBot;
  private config: DiscordServerConfig;
  private isRunning = false;

  constructor(config: DiscordServerConfig) {
    this.config = config;
    this.bot = new DiscordBot({
      token: config.token,
      supabaseUrl: config.supabaseUrl,
      supabaseServiceKey: config.supabaseServiceKey,
      // Prefer SambaNova API key, fallback to any provided OpenAI-style key
      openaiApiKey: config.openaiApiKey
    });
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Discord Educational Agent Server...');
      
      // Validate configuration
      this.validateConfig();
      
      // Start the Discord bot
      await this.bot.start(this.config.token);
      
      this.isRunning = true;
      console.log('✅ Discord Educational Agent Server started successfully!');
      console.log('📊 Bot Statistics:', this.bot.getStats());
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('❌ Failed to start Discord server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping Discord Educational Agent Server...');
      
      this.isRunning = false;
      await this.bot.stop();
      
      console.log('✅ Discord Educational Agent Server stopped successfully!');
    } catch (error) {
      console.error('❌ Error stopping Discord server:', error);
      throw error;
    }
  }

  private validateConfig(): void {
    const required = ['token', 'supabaseUrl', 'supabaseServiceKey'];
    const missing = required.filter(key => !this.config[key as keyof DiscordServerConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate Discord token format
    if (!this.config.token.match(/^[A-Za-z0-9._-]+$/)) {
      throw new Error('Invalid Discord token format');
    }

    // Validate Supabase URL format
    if (!this.config.supabaseUrl.startsWith('https://')) {
      throw new Error('Invalid Supabase URL format');
    }

    console.log('✅ Configuration validated successfully');
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  public getBot(): DiscordBot {
    return this.bot;
  }

  public isServerRunning(): boolean {
    return this.isRunning && this.bot.isClientReady();
  }

  public getServerStats() {
    return {
      running: this.isRunning,
      botReady: this.bot.isClientReady(),
      ...this.bot.getStats()
    };
  }
}

// Main execution function
export async function startDiscordServer(): Promise<DiscordServer> {
  const config: DiscordServerConfig = {
    token: process.env.DISCORD_BOT_TOKEN || '',
    supabaseUrl: process.env.VITE_SUPABASE_URL || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    // Prefer SambaNova key, fallback to legacy OPENAI_API_KEY for compatibility
    openaiApiKey: process.env.SAMBANOVA_API_KEY || process.env.OPENAI_API_KEY,
    port: parseInt(process.env.DISCORD_SERVER_PORT || '3001')
  };

  const server = new DiscordServer(config);
  await server.start();
  
  return server;
}

// CLI execution - Auto-start ONLY when run directly (not when imported)
function isDirectExecution(): boolean {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
    return Boolean(invokedFile) && path.resolve(thisFile) === invokedFile;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  console.log('🔵 Starting Discord bot from CLI...');
  startDiscordServer()
    .then((server) => {
      console.log('🎉 Discord Educational Agent is now running!');
      console.log('📊 Server Stats:', server.getServerStats());
    })
    .catch((error) => {
      console.error('💥 Failed to start Discord Educational Agent:', error);
      console.error('Error details:', error);
      process.exit(1);
    });
} else {
  console.log('⏭️ Module imported, not starting automatically');
}