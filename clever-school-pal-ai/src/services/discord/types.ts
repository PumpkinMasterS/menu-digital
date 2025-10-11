// Discord Integration Types

export interface DiscordGuild {
  guild_id: string;
  guild_name: string;
  school_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscordChannel {
  channel_id: string;
  guild_id: string;
  channel_name: string;
  class_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscordUser {
  user_id: string;
  username: string;
  display_name?: string;
  student_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscordInteraction {
  id: string;
  message_id: string;
  user_id: string;
  channel_id: string;
  guild_id: string;
  message_content: string;
  bot_response: string;
  context_applied: any;
  response_time_ms: number;
  created_at: string;
}

export interface DiscordBotConfig {
  guild_id: string;
  bot_personality?: string;
  response_language: string;
  auto_response: boolean;
  allowed_channels?: string[];
  admin_roles?: string[];
  created_at: string;
  updated_at: string;
}

export interface DiscordContextMapping {
  guildToSchool: Map<string, string>;
  channelToClass: Map<string, string>;
  userToStudent: Map<string, string>;
}

export interface DiscordBotPermissions {
  sendMessages: boolean;
  readMessageHistory: boolean;
  embedLinks: boolean;
  attachFiles: boolean;
  useExternalEmojis: boolean;
  addReactions: boolean;
  manageMessages: boolean;
}

export interface DiscordCommandContext {
  guildId: string;
  channelId: string;
  userId: string;
  userRoles: string[];
  isAdmin: boolean;
  schoolContext?: {
    schoolId: string;
    schoolName: string;
  };
  classContext?: {
    classId: string;
    className: string;
    subject: string;
  };
  studentContext?: {
    studentId: string;
    studentName: string;
  };
}

export interface DiscordResponse {
  content: string;
  embeds?: any[];
  components?: any[];
  files?: any[];
  ephemeral?: boolean;
}

export interface DiscordBotStats {
  guilds: number;
  users: number;
  channels: number;
  uptime: number | null;
  ready: boolean;
  totalInteractions?: number;
  averageResponseTime?: number;
}

export interface DiscordWebhookConfig {
  url: string;
  username?: string;
  avatarUrl?: string;
}

export interface DiscordSlashCommand {
  name: string;
  description: string;
  options?: DiscordSlashCommandOption[];
  defaultPermission?: boolean;
  guildOnly?: boolean;
}

export interface DiscordSlashCommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: DiscordSlashCommandChoice[];
}

export interface DiscordSlashCommandChoice {
  name: string;
  value: string | number;
}

export interface DiscordEventHandlers {
  onReady?: () => void;
  onMessage?: (message: any) => void;
  onGuildJoin?: (guild: any) => void;
  onGuildLeave?: (guild: any) => void;
  onError?: (error: Error) => void;
}

export interface DiscordIntegrationConfig {
  botToken: string;
  applicationId: string;
  publicKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  openaiApiKey?: string;
  webhookUrl?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: {
    slashCommands: boolean;
    contextMenus: boolean;
    autoResponse: boolean;
    adminCommands: boolean;
    analytics: boolean;
  };
}

export interface DiscordAnalytics {
  totalMessages: number;
  totalResponses: number;
  averageResponseTime: number;
  topChannels: Array<{ channelId: string; messageCount: number }>;
  topUsers: Array<{ userId: string; messageCount: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  errorRate: number;
  uptime: number;
}

export interface DiscordEducationalContext {
  hierarchyLevel: 'global' | 'school' | 'class' | 'student';
  contextData: {
    personality?: string;
    guidelines?: string;
    language?: string;
    subjects?: string[];
    difficulty?: string;
    materials?: any[];
  };
  priority: number;
}

export interface DiscordMessageContext {
  messageId: string;
  channelId: string;
  guildId: string;
  userId: string;
  content: string;
  timestamp: Date;
  attachments?: any[];
  mentions?: string[];
  referencedMessage?: string;
}

export interface DiscordBotCommand {
  name: string;
  description: string;
  aliases?: string[];
  usage: string;
  examples: string[];
  permissions: string[];
  cooldown?: number;
  guildOnly: boolean;
  adminOnly: boolean;
  execute: (context: DiscordCommandContext, args: string[]) => Promise<DiscordResponse>;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    iconUrl?: string;
  };
  fields?: DiscordEmbedField[];
}

export interface DiscordActivityStatus {
  type: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'COMPETING';
  name: string;
  url?: string;
}

export interface DiscordPresence {
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  activity?: DiscordActivityStatus;
}

export interface DiscordRateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface DiscordCacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of items in cache
  checkPeriod: number; // How often to check for expired items
}

export interface DiscordSecurityConfig {
  allowedGuilds?: string[];
  blockedUsers?: string[];
  rateLimiting: DiscordRateLimitConfig;
  messageFiltering: {
    enabled: boolean;
    maxLength: number;
    blockedWords?: string[];
    allowUrls: boolean;
  };
}