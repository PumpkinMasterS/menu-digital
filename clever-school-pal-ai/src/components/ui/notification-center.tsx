import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  BellRing,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  MessageSquare,
  Settings,
  Users,
  BookOpen,
  Bot,
  Trash2,
  Mail,
  Calendar,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'message' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    studentName?: string;
    schoolName?: string;
    className?: string;
    contentTitle?: string;
  };
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Mock notifications - in real app, this would come from your backend
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: 'Novo aluno registado',
        description: 'João Silva foi adicionado à turma 5º A',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        read: false,
        metadata: { studentName: 'João Silva', className: '5º A' }
      },
      {
        id: '2',
        type: 'message',
        title: 'Nova pergunta do bot IA',
        description: 'Maria Santos perguntou sobre frações em Matemática',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        read: false,
        metadata: { studentName: 'Maria Santos' }
      },
      {
        id: '3',
        type: 'warning',
        title: 'Conteúdo sem tags',
        description: '3 conteúdos novos precisam de tags pedagógicas',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        read: true,
        actionUrl: '/contents'
      },
      {
        id: '4',
        type: 'info',
        title: 'Backup da base de dados',
        description: 'Backup automático concluído com sucesso',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: true
      },
      {
        id: '5',
        type: 'error',
        title: 'Erro na configuração do bot',
        description: 'Credenciais WhatsApp inválidas para Escola Central',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        read: false,
        actionUrl: '/bot-config',
        metadata: { schoolName: 'Escola Central' }
      }
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      case 'message':
        return 'border-l-blue-500';
      case 'system':
        return 'border-l-gray-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAsUnread = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: false }
          : notification
      )
    );
    setUnreadCount(prev => prev + 1);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const filterNotifications = (type?: string) => {
    if (!type || type === 'all') return notifications;
    return notifications.filter(n => n.type === type);
  };

  const formatTime = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  const getTabCounts = () => {
    return {
      all: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      messages: notifications.filter(n => n.type === 'message').length,
      system: notifications.filter(n => ['info', 'success', 'warning', 'error', 'system'].includes(n.type)).length
    };
  };

  const tabCounts = getTabCounts();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-9 w-9 ${className}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        side="bottom"
      >
        <div className="flex flex-col h-[500px]">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-lg">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-4 mt-2">
              <TabsTrigger value="all" className="text-xs">
                Todas
                {tabCounts.all > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {tabCounts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Não lidas
                {tabCounts.unread > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                    {tabCounts.unread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="message" className="text-xs">
                Mensagens
                {tabCounts.messages > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {tabCounts.messages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs">
                Sistema
                {tabCounts.system > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {tabCounts.system}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex-1 mt-2">
              <ScrollArea className="h-full px-4">
                <NotificationList
                  notifications={filterNotifications('all')}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={deleteNotification}
                  formatTime={formatTime}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="unread" className="flex-1 mt-2">
              <ScrollArea className="h-full px-4">
                <NotificationList
                  notifications={filterNotifications('all').filter(n => !n.read)}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={deleteNotification}
                  formatTime={formatTime}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="message" className="flex-1 mt-2">
              <ScrollArea className="h-full px-4">
                <NotificationList
                  notifications={filterNotifications('message')}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={deleteNotification}
                  formatTime={formatTime}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="system" className="flex-1 mt-2">
              <ScrollArea className="h-full px-4">
                <NotificationList
                  notifications={filterNotifications('all').filter(n => 
                    ['info', 'success', 'warning', 'error', 'system'].includes(n.type)
                  )}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={deleteNotification}
                  formatTime={formatTime}
                  getNotificationIcon={getNotificationIcon}
                  getNotificationColor={getNotificationColor}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {notifications.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Não há notificações
                </p>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
  formatTime: (timestamp: Date) => string;
  getNotificationIcon: (type: Notification['type']) => JSX.Element;
  getNotificationColor: (type: Notification['type']) => string;
}

function NotificationList({
  notifications,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  formatTime,
  getNotificationIcon,
  getNotificationColor
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center text-center p-8">
        <div>
          <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação nesta categoria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className={`transition-all duration-200 border-l-4 ${getNotificationColor(notification.type)} ${
            !notification.read 
              ? 'bg-primary/5 border-primary/20' 
              : 'hover:bg-muted/50'
          }`}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-sm font-medium truncate ${
                      !notification.read ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {notification.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(notification.timestamp)}</span>
                    
                    {notification.metadata && (
                      <>
                        {notification.metadata.studentName && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {notification.metadata.studentName}
                          </Badge>
                        )}
                        {notification.metadata.className && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {notification.metadata.className}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => notification.read ? onMarkAsUnread(notification.id) : onMarkAsRead(notification.id)}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  {notification.read ? (
                    <Mail className="h-3 w-3" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(notification.id)}
                  className="h-6 w-6 p-0 hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 