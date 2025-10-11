import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export class RedisClient {
  private client: Redis;
  private config: RedisConfig;
  private connected = false;

  constructor(config: RedisConfig) {
    this.config = {
      keyPrefix: 'cripto:',
      ...config
    };

    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db || 0,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      }
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.connected = true;
    });

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
      this.connected = false;
    });

    this.client.on('close', () => {
      console.log('Redis client disconnected');
      this.connected = false;
    });
  }

  /**
   * Conecta ao Redis
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Desconecta do Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.connected = false;
    } catch (error) {
      console.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Define um valor com TTL opcional
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const fullKey = this.config.keyPrefix + key;
    const serializedValue = JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.setex(fullKey, ttlSeconds, serializedValue);
    } else {
      await this.client.set(fullKey, serializedValue);
    }
  }

  /**
   * Obtém um valor
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.config.keyPrefix + key;
    const value = await this.client.get(fullKey);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to parse Redis value for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove uma chave
   */
  async del(key: string): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    return this.client.del(fullKey);
  }

  /**
   * Verifica se uma chave existe
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.config.keyPrefix + key;
    const result = await this.client.exists(fullKey);
    return result === 1;
  }

  /**
   * Define o TTL de uma chave
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const fullKey = this.config.keyPrefix + key;
    const result = await this.client.expire(fullKey, ttlSeconds);
    return result === 1;
  }

  /**
   * Obtém o TTL restante de uma chave
   */
  async ttl(key: string): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    return this.client.ttl(fullKey);
  }

  /**
   * Adiciona um item a uma lista
   */
  async listPush(key: string, value: any): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    const serializedValue = JSON.stringify(value);
    return this.client.lpush(fullKey, serializedValue);
  }

  /**
   * Obtém itens de uma lista
   */
  async listRange<T>(key: string, start: number = 0, stop: number = -1): Promise<T[]> {
    const fullKey = this.config.keyPrefix + key;
    const values = await this.client.lrange(fullKey, start, stop);

    return values.map(value => {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        console.error(`Failed to parse Redis list value for key ${key}:`, error);
        return null;
      }
    }).filter(item => item !== null) as T[];
  }

  /**
   * Remove itens de uma lista
   */
  async listRemove(key: string, value: any, count: number = 0): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    const serializedValue = JSON.stringify(value);
    return this.client.lrem(fullKey, count, serializedValue);
  }

  /**
   * Adiciona um item a um set
   */
  async setAdd(key: string, value: any): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    const serializedValue = JSON.stringify(value);
    return this.client.sadd(fullKey, serializedValue);
  }

  /**
   * Obtém todos os itens de um set
   */
  async setMembers<T>(key: string): Promise<T[]> {
    const fullKey = this.config.keyPrefix + key;
    const values = await this.client.smembers(fullKey);

    return values.map(value => {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        console.error(`Failed to parse Redis set value for key ${key}:`, error);
        return null;
      }
    }).filter(item => item !== null) as T[];
  }

  /**
   * Remove um item de um set
   */
  async setRemove(key: string, value: any): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    const serializedValue = JSON.stringify(value);
    return this.client.srem(fullKey, serializedValue);
  }

  /**
   * Define um campo em um hash
   */
  async hashSet(key: string, field: string, value: any): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    const serializedValue = JSON.stringify(value);
    return this.client.hset(fullKey, field, serializedValue);
  }

  /**
   * Obtém um campo de um hash
   */
  async hashGet<T>(key: string, field: string): Promise<T | null> {
    const fullKey = this.config.keyPrefix + key;
    const value = await this.client.hget(fullKey, field);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to parse Redis hash value for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  /**
   * Obtém todos os campos de um hash
   */
  async hashGetAll<T>(key: string): Promise<Record<string, T>> {
    const fullKey = this.config.keyPrefix + key;
    const hash = await this.client.hgetall(fullKey);
    const result: Record<string, T> = {};

    for (const [field, value] of Object.entries(hash)) {
      try {
        result[field] = JSON.parse(value) as T;
      } catch (error) {
        console.error(`Failed to parse Redis hash value for key ${key}, field ${field}:`, error);
      }
    }

    return result;
  }

  /**
   * Remove um campo de um hash
   */
  async hashDel(key: string, field: string): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    return this.client.hdel(fullKey, field);
  }

  /**
   * Incrementa um valor numérico
   */
  async incr(key: string, increment: number = 1): Promise<number> {
    const fullKey = this.config.keyPrefix + key;
    return this.client.incrby(fullKey, increment);
  }

  /**
   * Limpa todas as chaves com o prefixo configurado
   */
  async clear(): Promise<void> {
    const pattern = this.config.keyPrefix + '*';
    const keys = await this.client.keys(pattern);
    
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /**
   * Obtém o cliente Redis subjacente para operações avançadas
   */
  getClient(): Redis {
    return this.client;
  }
}

// Instância singleton
let redisClient: RedisClient | null = null;

/**
 * Inicializa o cliente Redis
 */
export function initializeRedis(config: RedisConfig): RedisClient {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new RedisClient(config);
  return redisClient;
}

/**
 * Obtém a instância do cliente Redis
 */
export function getRedisClient(): RedisClient | null {
  return redisClient;
}

