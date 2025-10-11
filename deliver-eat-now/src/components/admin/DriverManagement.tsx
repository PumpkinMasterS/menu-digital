import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Truck, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  MoreHorizontal,
  RefreshCw,
  UserPlus,
  UserCheck,
  UserX,
  AlertTriangle,
  FileText
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import UserManagementDialog from './UserManagementDialog'
import DriverDocumentViewer from './DriverDocumentViewer'

interface Driver {
  id: string
  full_name: string
  email: string
  phone: string
  organization_id: string
  organization_name: string
  is_active: boolean
  account_activated: boolean
  activation_email_sent: boolean
  activation_email_sent_at: string
  account_activated_at: string
  created_at: string
  driver_status: string
  profile_completed: boolean
  documents_verified: boolean
  background_check_status: string
}

const DriverManagement: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isResendingEmail, setIsResendingEmail] = useState<string | null>(null)
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null)
  const [rejectionDialog, setRejectionDialog] = useState<{
    isOpen: boolean
    driver: Driver | null
    reason: string
  }>({
    isOpen: false,
    driver: null,
    reason: ''
  })
  const [documentViewer, setDocumentViewer] = useState<{
    isOpen: boolean
    driverId: string
    driverName: string
  }>({
    isOpen: false,
    driverId: '',
    driverName: ''
  })

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      
      // First, get all driver profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          organization_id,
          account_activated,
          activation_email_sent,
          activation_email_sent_at,
          account_activated_at,
          created_at,
          organizations(name)
        `)
        .eq('role', 'driver')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Then get driver details for each profile
      const profileIds = profilesData?.map(p => p.id) || []
      
      let driversData = []
      if (profileIds.length > 0) {
        const { data: driverDetails, error: driversError } = await supabase
          .from('drivers')
          .select(`
            user_id,
            id,
            is_available,
            profile_completed,
            documents_verified,
            background_check_status
          `)
          .in('user_id', profileIds)

        if (driversError) throw driversError
        driversData = driverDetails || []
      }

      // Combine the data
      const formattedDrivers = profilesData?.map((profile: any) => {
        const driverInfo = driversData.find(d => d.user_id === profile.id)
        
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          organization_id: profile.organization_id,
          organization_name: profile.organizations?.name || 'N/A',
          is_active: profile.account_activated || false, // Use account_activated as is_active
          account_activated: profile.account_activated,
          activation_email_sent: profile.activation_email_sent,
          activation_email_sent_at: profile.activation_email_sent_at,
          account_activated_at: profile.account_activated_at,
          created_at: profile.created_at,
          driver_status: driverInfo?.is_available ? 'available' : 'inactive',
          profile_completed: driverInfo?.profile_completed || false,
          documents_verified: driverInfo?.documents_verified || false,
          background_check_status: driverInfo?.background_check_status || 'pending'
        }
      }) || []

      setDrivers(formattedDrivers)
    } catch (error: any) {
      console.error('Error fetching drivers:', error)
      toast({
        title: "Erro ao carregar motoristas",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resendActivationEmail = async (driver: Driver) => {
    setIsResendingEmail(driver.id)
    
    try {
      const { error } = await supabase.functions.invoke('send-driver-activation', {
        body: {
          email: driver.email,
          driverName: driver.full_name,
          organizationName: driver.organization_name,
          tempPassword: 'TEMP_PASSWORD_PLACEHOLDER', // You might want to generate a new one
          userId: driver.id
        }
      })

      if (error) throw error

      toast({
        title: "✅ Email reenviado!",
        description: `Email de ativação enviado para ${driver.full_name}`,
      })

      // Refresh drivers list
      fetchDrivers()
    } catch (error: any) {
      console.error('Error resending activation email:', error)
      toast({
        title: "Erro ao reenviar email",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsResendingEmail(null)
    }
  }

  const approveDriver = async (driver: Driver) => {
    setIsProcessingApproval(driver.id)
    
    try {
      // Use the new activation function
      const { data, error } = await supabase.rpc('activate_driver_account', {
        driver_user_id: driver.id,
        activation_reason: 'Manual approval after document verification'
      })

      if (error) throw error

      if (!data) {
        throw new Error('Failed to activate driver account')
      }

      toast({
        title: "✅ Motorista aprovado!",
        description: `${driver.full_name} foi aprovado e sua conta foi ativada.`,
      })

      // Refresh drivers list
      fetchDrivers()
    } catch (error: any) {
      console.error('Error approving driver:', error)
      toast({
        title: "Erro ao aprovar motorista",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsProcessingApproval(null)
    }
  }

  const openDocumentViewer = (driver: Driver) => {
    setDocumentViewer({
      isOpen: true,
      driverId: driver.id,
      driverName: driver.full_name
    })
  }

  const closeDocumentViewer = () => {
    setDocumentViewer({
      isOpen: false,
      driverId: '',
      driverName: ''
    })
  }

  const handleDocumentVerified = (verified: boolean) => {
    // Refresh drivers list to update verification status
    fetchDrivers()
  }

  const rejectDriver = async () => {
    if (!rejectionDialog.driver) return

    setIsProcessingApproval(rejectionDialog.driver.id)
    
    try {
      // Use the new deactivation function
      const { data, error } = await supabase.rpc('deactivate_driver_account', {
        driver_user_id: rejectionDialog.driver.id,
        deactivation_reason: rejectionDialog.reason || 'Manual rejection during verification process'
      })

      if (error) throw error

      if (!data) {
        throw new Error('Failed to deactivate driver account')
      }

      toast({
        title: "❌ Motorista rejeitado",
        description: `${rejectionDialog.driver.full_name} foi rejeitado e sua conta foi desativada.`,
      })

      // Close dialog and refresh drivers list
      setRejectionDialog({ isOpen: false, driver: null, reason: '' })
      fetchDrivers()
    } catch (error: any) {
      console.error('Error rejecting driver:', error)
      toast({
        title: "Erro ao rejeitar motorista",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsProcessingApproval(null)
    }
  }

  const getStatusBadge = (driver: Driver) => {
    if (!driver.account_activated) {
      return <Badge variant="destructive">Pendente Ativação</Badge>
    }
    
    if (!driver.is_active) {
      return <Badge variant="secondary">Inativo</Badge>
    }

    switch (driver.driver_status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600">Ativo</Badge>
      case 'busy':
        return <Badge variant="default" className="bg-yellow-600">Ocupado</Badge>
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>
      default:
        return <Badge variant="outline">Inativo</Badge>
    }
  }

  const getActivationStatus = (driver: Driver) => {
    if (driver.account_activated) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Ativado em {new Date(driver.account_activated_at).toLocaleDateString()}</span>
        </div>
      )
    }

    if (driver.activation_email_sent) {
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Email enviado em {new Date(driver.activation_email_sent_at).toLocaleDateString()}</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-red-600">
        <XCircle className="h-4 w-4" />
        <span className="text-sm">Email não enviado</span>
      </div>
    )
  }

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    if (statusFilter === 'pending') return matchesSearch && !driver.account_activated
    if (statusFilter === 'active') return matchesSearch && driver.account_activated && driver.is_active
    if (statusFilter === 'inactive') return matchesSearch && (!driver.is_active || !driver.account_activated)
    
    return matchesSearch
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Gestão de Motoristas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando motoristas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Gestão de Motoristas
            </CardTitle>
            <CardDescription>
              Gerir motoristas, ativação de contas e status de entrega
            </CardDescription>
          </div>
          <UserManagementDialog mode="create" onUserUpdated={fetchDrivers} />
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Pesquisar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Pesquisar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="status-filter">Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendente Ativação</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button onClick={fetchDrivers} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Drivers List */}
        <div className="space-y-4">
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum motorista encontrado</p>
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <div key={driver.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{driver.full_name}</h3>
                      {getStatusBadge(driver)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>Email:</strong> {driver.email}</p>
                        <p><strong>Telefone:</strong> {driver.phone || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p><strong>Organização:</strong> {driver.organization_name}</p>
                        <p><strong>Criado em:</strong> {new Date(driver.created_at).toLocaleDateString()}</p>
                      </div>
                      
                      <div>
                        {getActivationStatus(driver)}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs">Perfil: </span>
                          {driver.profile_completed ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className="text-xs">Docs: </span>
                          {driver.documents_verified ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDocumentViewer(driver)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="h-4 w-4" />
                      Documentos
                    </Button>
                    
                    {!driver.account_activated && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveDriver(driver)}
                          disabled={isProcessingApproval === driver.id}
                        >
                          {isProcessingApproval === driver.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          Aprovar
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectionDialog({
                            isOpen: true,
                            driver: driver,
                            reason: ''
                          })}
                          disabled={isProcessingApproval === driver.id}
                        >
                          <UserX className="h-4 w-4" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    
                    {!driver.account_activated && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resendActivationEmail(driver)}
                        disabled={isResendingEmail === driver.id}
                      >
                        {isResendingEmail === driver.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        {isResendingEmail === driver.id ? 'Enviando...' : 'Reenviar Email'}
                      </Button>
                    )}
                    
                    <UserManagementDialog 
                      mode="edit" 
                      user={driver} 
                      onUserUpdated={fetchDrivers} 
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      
      {/* Rejection Dialog */}
      <Dialog 
        open={rejectionDialog.isOpen} 
        onOpenChange={(open) => setRejectionDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Rejeitar Motorista
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja rejeitar a candidatura de <strong>{rejectionDialog.driver?.full_name}</strong>?
              Esta ação irá notificar o motorista por email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Motivo da rejeição (opcional)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explique o motivo da rejeição..."
                value={rejectionDialog.reason}
                onChange={(e) => setRejectionDialog(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectionDialog({ isOpen: false, driver: null, reason: '' })}
                disabled={isProcessingApproval !== null}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={rejectDriver}
                disabled={isProcessingApproval !== null}
              >
                {isProcessingApproval === rejectionDialog.driver?.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Rejeitando...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Rejeitar Motorista
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Document Viewer */}
      <DriverDocumentViewer
        isOpen={documentViewer.isOpen}
        onClose={closeDocumentViewer}
        driverId={documentViewer.driverId}
        driverName={documentViewer.driverName}
        onDocumentVerified={handleDocumentVerified}
      />
    </Card>
  )
}

export default DriverManagement