import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Car,
  Bike,
  Truck
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface DriverDocument {
  type: string
  label: string
  url: string
  uploadedAt: string
  verified: boolean
}

interface DriverOnboardingData {
  id: string
  user_id: string
  legal_consent: {
    acceptedRGPD: boolean
    acceptedTerms: boolean
    consentTimestamp: string
  }
  personal_data: {
    fullName: string
    nif: string
    niss?: string
    address: string
    iban: string
    vehicleType: 'bicycle' | 'motorcycle' | 'car'
  }
  documents: {
    identification: string
    drivingLicense?: string
    taxDocument: string
    vehicleInsurance?: string
  }
  created_at: string
  updated_at: string
}

interface DriverDocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  driverId: string
  driverName: string
  onDocumentVerified: (verified: boolean) => void
}

const DriverDocumentViewer: React.FC<DriverDocumentViewerProps> = ({
  isOpen,
  onClose,
  driverId,
  driverName,
  onDocumentVerified
}) => {
  const [loading, setLoading] = useState(false)
  const [onboardingData, setOnboardingData] = useState<DriverOnboardingData | null>(null)
  const [verifyingDocument, setVerifyingDocument] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && driverId) {
      fetchOnboardingData()
    }
  }, [isOpen, driverId])

  const fetchOnboardingData = async () => {
    try {
      setLoading(true)
      
      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Usuário não autenticado')
      }
      
      const { data, error } = await supabase
        .from('driver_onboarding_data')
        .select('*')
        .eq('user_id', driverId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No onboarding data found
          setOnboardingData(null)
          return
        }
        throw error
      }

      setOnboardingData(data)
    } catch (error: any) {
      console.error('Error fetching onboarding data:', error)
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getDocumentUrl = async (documentPath: string) => {
    try {
      const { data, error } = await supabase.rpc('get_driver_document_url', {
        document_path: documentPath
      })

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error getting document URL:', error)
      toast({
        title: "Erro ao acessar documento",
        description: error.message,
        variant: "destructive"
      })
      return null
    }
  }

  const viewDocument = async (documentUrl: string, documentType: string) => {
    try {
      // Extract path from full URL
      const urlParts = documentUrl.split('/storage/v1/object/public/documents/')
      if (urlParts.length < 2) {
        throw new Error('Invalid document URL format')
      }
      
      const documentPath = urlParts[1]
      const signedUrl = await getDocumentUrl(documentPath)
      
      if (signedUrl) {
        window.open(signedUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Error viewing document:', error)
      toast({
        title: "Erro ao visualizar documento",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const verifyDocument = async (documentType: string, verified: boolean) => {
    try {
      setVerifyingDocument(documentType)
      
      // Update driver documents_verified status
      const { error } = await supabase
        .from('drivers')
        .update({ 
          documents_verified: verified,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', driverId)

      if (error) throw error

      toast({
        title: verified ? "Documento aprovado" : "Documento rejeitado",
        description: `Documento ${documentType} foi ${verified ? 'aprovado' : 'rejeitado'} com sucesso.`,
        variant: verified ? "default" : "destructive"
      })

      onDocumentVerified(verified)
      
    } catch (error: any) {
      console.error('Error verifying document:', error)
      toast({
        title: "Erro ao verificar documento",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setVerifyingDocument(null)
    }
  }

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'bicycle':
        return <Bike className="h-4 w-4" />
      case 'motorcycle':
        return <Truck className="h-4 w-4" />
      case 'car':
        return <Car className="h-4 w-4" />
      default:
        return <Car className="h-4 w-4" />
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      identification: 'Documento de Identificação',
      drivingLicense: 'Carta de Condução',
      taxDocument: 'Comprovativo Fiscal',
      vehicleInsurance: 'Seguro do Veículo'
    }
    return labels[type] || type
  }

  const renderDocumentCard = (type: string, url: string) => {
    if (!url) return null

    const isImage = url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')
    const isPdf = url.includes('.pdf')

    return (
      <Card key={type} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {getDocumentTypeLabel(type)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isPdf ? "secondary" : "outline"}>
                {isPdf ? 'PDF' : 'Imagem'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {isImage ? 'Imagem' : 'Documento PDF'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => viewDocument(url, type)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => verifyDocument(type, true)}
                disabled={verifyingDocument === type}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => verifyDocument(type, false)}
                disabled={verifyingDocument === type}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos do Motorista - {driverName}</DialogTitle>
            <DialogDescription>
              Carregando dados do onboarding...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!onboardingData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos do Motorista - {driverName}</DialogTitle>
            <DialogDescription>
              Dados de onboarding não encontrados
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600">
                Este motorista ainda não completou o processo de onboarding.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos do Motorista - {driverName}</DialogTitle>
          <DialogDescription>
            Revise e aprove os documentos submetidos pelo motorista
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nome Completo</p>
                  <p className="text-sm">{onboardingData.personal_data.fullName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">NIF</p>
                  <p className="text-sm">{onboardingData.personal_data.nif}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">NISS</p>
                  <p className="text-sm">{onboardingData.personal_data.niss || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo de Veículo</p>
                  <div className="flex items-center gap-2">
                    {getVehicleIcon(onboardingData.personal_data.vehicleType)}
                    <span className="text-sm capitalize">
                      {onboardingData.personal_data.vehicleType}
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700">Morada</p>
                  <p className="text-sm">{onboardingData.personal_data.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">IBAN</p>
                  <p className="text-sm font-mono">{onboardingData.personal_data.iban}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Consent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consentimentos Legais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {onboardingData.legal_consent.acceptedRGPD ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">Aceitou RGPD</span>
                </div>
                <div className="flex items-center gap-2">
                  {onboardingData.legal_consent.acceptedTerms ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">Aceitou Termos e Condições</span>
                </div>
                <p className="text-xs text-gray-500">
                  Consentimento dado em: {new Date(onboardingData.legal_consent.consentTimestamp).toLocaleString('pt-PT')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Documentos Submetidos</h3>
            <div className="space-y-4">
              {Object.entries(onboardingData.documents).map(([type, url]) => 
                renderDocumentCard(type, url as string)
              )}
            </div>
          </div>

          {/* Submission Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Submetido em: {new Date(onboardingData.created_at).toLocaleString('pt-PT')}</span>
                <span>Última atualização: {new Date(onboardingData.updated_at).toLocaleString('pt-PT')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DriverDocumentViewer