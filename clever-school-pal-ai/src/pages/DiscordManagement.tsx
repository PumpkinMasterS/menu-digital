import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, RefreshCw, AlertCircle, School, Hash, Users, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { discordBotController, BotStatus } from '@/services/discord/controller';

interface DiscordGuild {
  id: string;
  guild_id: string;
  guild_name: string;
  school_name: string;
  is_active: boolean;
}

interface DiscordChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  guild_name: string;
  is_active: boolean;
}

interface DiscordUser {
  id: string;
  discord_id: string;
  username: string;
  guild_name: string;
  is_active: boolean;
}

interface BotConfig {
  id: string;
  guild_id: string;
  welcome_message: string;
  help_message: string;
  is_active: boolean;
}

interface School {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  school_id: string;
}

interface Student {
  id: string;
  name: string;
  class_id: string;
}

export default function DiscordManagement() {
  const { user, isAuthenticated } = useUnifiedAuth();
  const [loading, setLoading] = useState(true);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [users, setUsers] = useState<DiscordUser[]>([]);
  const [botConfigs, setBotConfigs] = useState<BotConfig[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isRunning: false,
    status: 'offline',
    error: null,
    lastActivity: null
  });

  const [newGuild, setNewGuild] = useState({ guild_id: '', guild_name: '', school_id: '' });
  const [newChannel, setNewChannel] = useState({ channel_id: '', channel_name: '', guild_id: '' });
  const [newUser, setNewUser] = useState({ discord_id: '', username: '', guild_id: '' });
  const [newBotConfig, setNewBotConfig] = useState({
    guild_id: '',
    welcome_message: '',
    help_message: ''
  });

  useEffect(() => {
    if (user) {
      loadData();
      checkBotStatus();
    }
  }, [user]);

  const checkBotStatus = async () => {
    try {
      const status = discordBotController.getBotStatus();
      setBotStatus(status);
    } catch (error) {
      console.error('Erro ao verificar status do bot:', error);
    }
  };

  const handleStartBot = async () => {
    try {
      const result = await discordBotController.startBot();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      checkBotStatus();
    } catch (error) {
      console.error('Erro ao iniciar bot:', error);
      toast.error('Erro ao iniciar o bot');
    }
  };

  const handleStopBot = async () => {
    try {
      const result = await discordBotController.stopBot();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      checkBotStatus();
    } catch (error) {
      console.error('Erro ao parar bot:', error);
      toast.error('Erro ao parar o bot');
    }
  };

  const handleRestartBot = async () => {
    try {
      const result = await discordBotController.restartBot();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      checkBotStatus();
    } catch (error) {
      console.error('Erro ao reiniciar bot:', error);
      toast.error('Erro ao reiniciar o bot');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load data with error handling for missing tables
      const results = await Promise.allSettled([
        supabase.from('discord_guilds').select('*'),
        supabase.from('discord_channels').select('*'),
        supabase.from('discord_users').select('*'),
        supabase.from('discord_bot_config').select('*'),
        supabase.from('schools').select('id, name'),
        supabase.from('classes').select('id, name, school_id'),
        supabase.from('students').select('id, name, class_id')
      ]);

      // Handle results with fallbacks for missing tables
      const [guildsRes, channelsRes, usersRes, configsRes, schoolsRes, classesRes, studentsRes] = results;
      
      if (guildsRes.status === 'fulfilled' && guildsRes.value.data) {
        setGuilds(guildsRes.value.data);
      } else {
        console.warn('discord_guilds table not found, using empty array');
        setGuilds([]);
      }
      
      if (channelsRes.status === 'fulfilled' && channelsRes.value.data) {
        setChannels(channelsRes.value.data);
      } else {
        console.warn('discord_channels table not found, using empty array');
        setChannels([]);
      }
      
      if (usersRes.status === 'fulfilled' && usersRes.value.data) {
        setUsers(usersRes.value.data);
      } else {
        console.warn('discord_users table not found, using empty array');
        setUsers([]);
      }
      
      if (configsRes.status === 'fulfilled' && configsRes.value.data) {
        setBotConfigs(configsRes.value.data);
      } else {
        console.warn('discord_bot_config table not found, using fallback config');
        setBotConfigs([{
          id: 'fallback',
          bot_token: '',
          guild_id: '',
          command_prefix: '!',
          auto_responses: true,
          moderation_enabled: false,
          welcome_message: 'Bem-vindo ao servidor!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      }
      
      if (schoolsRes.status === 'fulfilled' && schoolsRes.value.data) {
        setSchools(schoolsRes.value.data);
      } else {
        setSchools([]);
      }
      
      if (classesRes.status === 'fulfilled' && classesRes.value.data) {
        setClasses(classesRes.value.data);
      } else {
        setClasses([]);
      }
      
      if (studentsRes.status === 'fulfilled' && studentsRes.value.data) {
        setStudents(studentsRes.value.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuild = async () => {
    if (!newGuild.guild_id || !newGuild.guild_name || !newGuild.school_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!/^\d+$/.test(newGuild.guild_id)) {
      toast.error('ID do servidor deve conter apenas números');
      return;
    }

    try {
      const school = schools.find(s => s.id === newGuild.school_id);
      const { data, error } = await supabase
        .from('discord_guilds')
        .insert({
          guild_id: newGuild.guild_id,
          guild_name: newGuild.guild_name,
          school_id: newGuild.school_id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar servidor');
        return;
      }

      const newGuildWithSchool = {
        ...data,
        school_name: school?.name || 'Escola não encontrada'
      };

      setGuilds(prev => [...prev, newGuildWithSchool]);
      setNewGuild({ guild_id: '', guild_name: '', school_id: '' });
      toast.success('Servidor adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar servidor:', error);
      toast.error('Erro ao adicionar servidor');
    }
  };

  const handleAddChannel = async () => {
    if (!newChannel.channel_id || !newChannel.channel_name || !newChannel.guild_id) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const guild = guilds.find(g => g.id === newChannel.guild_id);
      const { data, error } = await supabase
        .from('discord_channels')
        .insert({
          channel_id: newChannel.channel_id,
          channel_name: newChannel.channel_name,
          guild_id: newChannel.guild_id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar canal');
        return;
      }

      const newChannelWithGuild = {
        ...data,
        guild_name: guild?.guild_name || 'Servidor não encontrado'
      };

      setChannels(prev => [...prev, newChannelWithGuild]);
      setNewChannel({ channel_id: '', channel_name: '', guild_id: '' });
      toast.success('Canal adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar canal:', error);
      toast.error('Erro ao adicionar canal');
    }
  };

  const handleAddUserToDiscord = async () => {
    if (!newUser.discord_id || !newUser.username || !newUser.guild_id) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const guild = guilds.find(g => g.id === newUser.guild_id);
      const { data, error } = await supabase
        .from('discord_users')
        .insert({
          discord_id: newUser.discord_id,
          username: newUser.username,
          guild_id: newUser.guild_id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar utilizador');
        return;
      }

      const newUserWithGuild = {
        ...data,
        guild_name: guild?.guild_name || 'Servidor não encontrado'
      };

      setUsers(prev => [...prev, newUserWithGuild]);
      setNewUser({ discord_id: '', username: '', guild_id: '' });
      toast.success('Utilizador adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar utilizador:', error);
      toast.error('Erro ao adicionar utilizador');
    }
  };

  const handleSaveBotConfig = async () => {
    if (!newBotConfig.guild_id || !newBotConfig.welcome_message || !newBotConfig.help_message) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('discord_bot_config')
        .insert({
          guild_id: newBotConfig.guild_id,
          welcome_message: newBotConfig.welcome_message,
          help_message: newBotConfig.help_message,
          is_active: true,
          permissions: {}
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes('relation "discord_bot_config" does not exist')) {
        console.warn('discord_bot_config table not found, simulating save');
          const mockData = {
            id: `mock-${Date.now()}`,
            guild_id: newBotConfig.guild_id,
            welcome_message: newBotConfig.welcome_message,
            help_message: newBotConfig.help_message,
            is_active: true,
            permissions: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setBotConfigs(prev => [...prev, mockData]);
          setNewBotConfig({ guild_id: '', welcome_message: '', help_message: '' });
          toast.success('Configuração salva localmente (tabela não encontrada)');
          return;
        }
        toast.error('Erro ao salvar configuração');
        return;
      }

      setBotConfigs(prev => [...prev, data]);
      setNewBotConfig({ guild_id: '', welcome_message: '', help_message: '' });
      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const handleDeleteGuild = async (id: string) => {
    try {
      const { error } = await supabase
        .from('discord_guilds')
        .delete()
        .eq('id', id);
      
      if (error) {
        toast.error('Erro ao eliminar servidor');
        return;
      }
      
      setGuilds(prev => prev.filter(guild => guild.id !== id));
      toast.success('Servidor eliminado com sucesso!');
    } catch (error) {
      console.error('Erro ao eliminar servidor:', error);
      toast.error('Erro ao eliminar servidor');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('discord_channels')
        .delete()
        .eq('id', id);
      
      if (error) {
        toast.error('Erro ao eliminar canal');
        return;
      }
      
      setChannels(prev => prev.filter(channel => channel.id !== id));
      toast.success('Canal eliminado com sucesso!');
    } catch (error) {
      console.error('Erro ao eliminar canal:', error);
      toast.error('Erro ao eliminar canal');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('discord_users')
        .delete()
        .eq('id', id);
      
      if (error) {
        toast.error('Erro ao eliminar utilizador');
        return;
      }
      
      setUsers(prev => prev.filter(user => user.id !== id));
      toast.success('Utilizador eliminado com sucesso!');
    } catch (error) {
      console.error('Erro ao eliminar utilizador:', error);
      toast.error('Erro ao eliminar utilizador');
    }
  };

  const getStats = () => {
    return {
      totalGuilds: guilds.length,
      activeGuilds: guilds.filter(g => g.is_active).length,
      totalChannels: channels.length,
      activeChannels: channels.filter(c => c.is_active).length,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length
    };
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const stats = getStats();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Gestão Discord" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-muted-foreground">Utilizador não autenticado. Por favor, faça login.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Gestão Discord" />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Gestão Discord" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servidores</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGuilds}/{stats.totalGuilds}</div>
              <p className="text-xs text-muted-foreground">Ativos/Total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canais</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeChannels}/{stats.totalChannels}</div>
              <p className="text-xs text-muted-foreground">Ativos/Total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilizadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}/{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Ativos/Total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Bot</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  botStatus.status === 'online' ? 'bg-green-500' :
                  botStatus.status === 'idle' ? 'bg-yellow-500' :
                  botStatus.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="text-sm capitalize">{botStatus.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {botStatus.lastActivity ? 
                  `Última atividade: ${new Date(botStatus.lastActivity).toLocaleString()}` :
                  'Nenhuma atividade registrada'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="guilds">Servidores</TabsTrigger>
            <TabsTrigger value="channels">Canais</TabsTrigger>
            <TabsTrigger value="users">Utilizadores</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Controlo do Bot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button onClick={handleStartBot} disabled={botStatus.isRunning}>
                    Iniciar Bot
                  </Button>
                  <Button onClick={handleStopBot} disabled={!botStatus.isRunning} variant="outline">
                    Parar Bot
                  </Button>
                  <Button onClick={handleRestartBot} variant="outline">
                    Reiniciar Bot
                  </Button>
                  <Button onClick={checkBotStatus} variant="ghost">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar Status
                  </Button>
                </div>
                {botStatus.error && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{botStatus.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guilds" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Servidores Discord</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Servidor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Servidor Discord</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="guild_id">ID do Servidor</Label>
                          <Input
                            id="guild_id"
                            value={newGuild.guild_id}
                            onChange={(e) => setNewGuild(prev => ({ ...prev, guild_id: e.target.value }))}
                            placeholder="123456789012345678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guild_name">Nome do Servidor</Label>
                          <Input
                            id="guild_name"
                            value={newGuild.guild_name}
                            onChange={(e) => setNewGuild(prev => ({ ...prev, guild_name: e.target.value }))}
                            placeholder="Meu Servidor Discord"
                          />
                        </div>
                        <div>
                          <Label htmlFor="school_id">Escola</Label>
                          <select
                            id="school_id"
                            value={newGuild.school_id}
                            onChange={(e) => setNewGuild(prev => ({ ...prev, school_id: e.target.value }))}
                            className="w-full p-2 border border-input rounded-md bg-background"
                          >
                            <option value="">Selecione uma escola</option>
                            {schools.map(school => (
                              <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                          </select>
                        </div>
                        <Button onClick={handleAddGuild} className="w-full">
                          Adicionar Servidor
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-2">
                    {guilds.map(guild => (
                      <div key={guild.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{guild.guild_name}</p>
                          <p className="text-sm text-muted-foreground">{guild.school_name}</p>
                          <p className="text-xs text-muted-foreground">ID: {guild.guild_id}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={guild.is_active ? "default" : "secondary"}>
                            {guild.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(guild.guild_id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteGuild(guild.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Canais Discord</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Canal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Canal Discord</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="channel_id">ID do Canal</Label>
                          <Input
                            id="channel_id"
                            value={newChannel.channel_id}
                            onChange={(e) => setNewChannel(prev => ({ ...prev, channel_id: e.target.value }))}
                            placeholder="123456789012345678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="channel_name">Nome do Canal</Label>
                          <Input
                            id="channel_name"
                            value={newChannel.channel_name}
                            onChange={(e) => setNewChannel(prev => ({ ...prev, channel_name: e.target.value }))}
                            placeholder="geral"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guild_id_channel">Servidor</Label>
                          <select
                            id="guild_id_channel"
                            value={newChannel.guild_id}
                            onChange={(e) => setNewChannel(prev => ({ ...prev, guild_id: e.target.value }))}
                            className="w-full p-2 border border-input rounded-md bg-background"
                          >
                            <option value="">Selecione um servidor</option>
                            {guilds.map(guild => (
                              <option key={guild.id} value={guild.id}>{guild.guild_name}</option>
                            ))}
                          </select>
                        </div>
                        <Button onClick={handleAddChannel} className="w-full">
                          Adicionar Canal
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-2">
                    {channels.map(channel => (
                      <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{channel.channel_name}</p>
                          <p className="text-sm text-muted-foreground">{channel.guild_name}</p>
                          <p className="text-xs text-muted-foreground">ID: {channel.channel_id}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={channel.is_active ? "default" : "secondary"}>
                            {channel.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(channel.channel_id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteChannel(channel.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Utilizadores Discord</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Utilizador
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Utilizador Discord</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="discord_id">ID do Discord</Label>
                          <Input
                            id="discord_id"
                            value={newUser.discord_id}
                            onChange={(e) => setNewUser(prev => ({ ...prev, discord_id: e.target.value }))}
                            placeholder="123456789012345678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="username">Nome de Utilizador</Label>
                          <Input
                            id="username"
                            value={newUser.username}
                            onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="utilizador#1234"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guild_id_user">Servidor</Label>
                          <select
                            id="guild_id_user"
                            value={newUser.guild_id}
                            onChange={(e) => setNewUser(prev => ({ ...prev, guild_id: e.target.value }))}
                            className="w-full p-2 border border-input rounded-md bg-background"
                          >
                            <option value="">Selecione um servidor</option>
                            {guilds.map(guild => (
                              <option key={guild.id} value={guild.id}>{guild.guild_name}</option>
                            ))}
                          </select>
                        </div>
                        <Button onClick={handleAddUserToDiscord} className="w-full">
                          Adicionar Utilizador
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-2">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.guild_name}</p>
                          <p className="text-xs text-muted-foreground">ID: {user.discord_id}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(user.discord_id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Bot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Configuração
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Configuração do Bot</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="config_guild_id">Servidor</Label>
                          <select
                            id="config_guild_id"
                            value={newBotConfig.guild_id}
                            onChange={(e) => setNewBotConfig(prev => ({ ...prev, guild_id: e.target.value }))}
                            className="w-full p-2 border border-input rounded-md bg-background"
                          >
                            <option value="">Selecione um servidor</option>
                            {guilds.map(guild => (
                              <option key={guild.id} value={guild.id}>{guild.guild_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                          <Input
                            id="welcome_message"
                            value={newBotConfig.welcome_message}
                            onChange={(e) => setNewBotConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                            placeholder="Bem-vindo ao servidor!"
                          />
                        </div>
                        <div>
                          <Label htmlFor="help_message">Mensagem de Ajuda</Label>
                          <Input
                            id="help_message"
                            value={newBotConfig.help_message}
                            onChange={(e) => setNewBotConfig(prev => ({ ...prev, help_message: e.target.value }))}
                            placeholder="Use /help para ver os comandos disponíveis"
                          />
                        </div>
                        <Button onClick={handleSaveBotConfig} className="w-full">
                          Salvar Configuração
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-4">
                    {botConfigs.map(config => {
                      const guild = guilds.find(g => g.id === config.guild_id);
                      return (
                        <Card key={config.id}>
                          <CardContent className="pt-6">
                            <h4 className="font-medium">{guild?.guild_name || 'Servidor Desconhecido'}</h4>
                            <div className="mt-2 space-y-2">
                              <div>
                                <span className="text-sm font-medium">Boas-vindas:</span>
                                <p className="text-sm text-muted-foreground">{config.welcome_message}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Ajuda:</span>
                                <p className="text-sm text-muted-foreground">{config.help_message}</p>
                              </div>
                              <Badge variant={config.is_active ? "default" : "secondary"}>
                                {config.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}