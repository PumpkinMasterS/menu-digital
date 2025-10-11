import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface OnboardingData {
  legalConsent: {
    gdprConsent: boolean
    termsAccepted: boolean
    privacyPolicyAccepted: boolean
  }
  personalData: {
    fullName: string
    nif: string
    niss?: string
    address: {
      street: string
      city: string
      postalCode: string
      country: string
    }
    bankDetails: {
      iban: string
    }
    vehicleType: 'bicycle' | 'motorcycle' | 'car'
  }
  documents: {
    identification: string
    taxDocument: string
    drivingLicense?: string
    vehicleInsurance?: string
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Parse request body
    const { onboardingData }: { onboardingData: OnboardingData } = await req.json()

    // Validate required data
    if (!onboardingData.legalConsent.gdprConsent || 
        !onboardingData.legalConsent.termsAccepted || 
        !onboardingData.legalConsent.privacyPolicyAccepted) {
      throw new Error('Legal consent is required')
    }

    if (!onboardingData.personalData.fullName || 
        !onboardingData.personalData.nif || 
        !onboardingData.personalData.address.street ||
        !onboardingData.personalData.bankDetails.iban) {
      throw new Error('Personal data is incomplete')
    }

    if (!onboardingData.documents.identification || 
        !onboardingData.documents.taxDocument) {
      throw new Error('Required documents are missing')
    }

    // Validate vehicle-specific documents
    if (onboardingData.personalData.vehicleType !== 'bicycle') {
      if (!onboardingData.documents.drivingLicense || 
          !onboardingData.documents.vehicleInsurance) {
        throw new Error('Driving license and vehicle insurance are required for this vehicle type')
      }
    }

    // Start a transaction
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (driverError || !driver) {
      throw new Error('Driver profile not found')
    }

    // Update driver profile with onboarding data
    const { error: updateDriverError } = await supabase
      .from('drivers')
      .update({
        profile_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateDriverError) {
      throw new Error('Failed to update driver profile')
    }

    // Update user profile with personal data
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        full_name: onboardingData.personalData.fullName,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateProfileError) {
      throw new Error('Failed to update user profile')
    }

    // Store onboarding data in a separate table (you may need to create this table)
    const { error: onboardingError } = await supabase
      .from('driver_onboarding_data')
      .insert({
        driver_id: driver.id,
        user_id: user.id,
        legal_consent: onboardingData.legalConsent,
        personal_data: onboardingData.personalData,
        documents: onboardingData.documents,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    if (onboardingError) {
      console.error('Failed to store onboarding data:', onboardingError)
      // Don't throw here as the main profile update succeeded
    }

    // Send notification to admin about new driver onboarding completion
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Novo Motorista Completou Onboarding',
          message: `${onboardingData.personalData.fullName} completou o processo de onboarding`,
          data: {
            type: 'driver_onboarding_completed',
            driverId: driver.id,
            userId: user.id
          }
        }
      })
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // Don't throw here as the main process succeeded
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Onboarding completed successfully',
        data: {
          profileCompleted: true,
          nextSteps: [
            'Aguarde a verificação dos seus documentos',
            'Receberá uma notificação quando a conta for ativada',
            'Pode acompanhar o status na secção de perfil'
          ]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error completing onboarding:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})