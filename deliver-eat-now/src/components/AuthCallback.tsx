import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthCallbackProps {
  onAuthSuccess?: (session: any) => void;
}

export default function AuthCallback({ onAuthSuccess }: AuthCallbackProps) {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (!code) {
          throw new Error('No authorization code found');
        }

        console.log('📝 Found authorization code:', code.substring(0, 10) + '...');
        
        // Exchange code for session using Supabase's exchangeCodeForSession
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('❌ Error exchanging code for session:', error);
          setStatus('error');
          setMessage(`Authentication failed: ${error.message}`);
          return;
        }

        if (data.session) {
          console.log('✅ Authentication successful:', data.session.user.email);
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Call success callback if provided
          if (onAuthSuccess) {
            onAuthSuccess(data.session);
          }
          
          // Redirect to home page after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          throw new Error('No session received');
        }
        
      } catch (error) {
        console.error('❌ Unexpected error in callback:', error);
        setStatus('error');
        setMessage(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Redirect to login page with error after delay
        setTimeout(() => {
          window.location.href = '/?error=auth_failed';
        }, 3000);
      }
    };

    handleCallback();
  }, [onAuthSuccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <h2 className="mt-6 text-xl font-semibold text-gray-900">Processing Authentication</h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-green-900">Authentication Successful</h2>
              <p className="mt-2 text-sm text-green-600">{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-red-900">Authentication Failed</h2>
              <p className="mt-2 text-sm text-red-600">{message}</p>
              <p className="mt-4 text-xs text-gray-500">Redirecting to login page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}