import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { authorizedFetch } from '@/lib/http-client';

export default function Debug401() {
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const triggerAuthorized401 = async () => {
    setResult('');
    setError('');
    try {
      logger.info('🔧 Triggering authorizedFetch to /api-contents (expect 401 due to missing x-api-key)');
      const res = await authorizedFetch('/api-contents');
      const text = await res.text();
      setResult(`Status: ${res.status} ${res.statusText}\n${text}`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      logger.warn('Expected unauthorized error captured', { message: msg });
      setError(msg);
    }
  };

  const triggerPlain401 = async () => {
    setResult('');
    setError('');
    try {
      logger.info('🔧 Triggering plain fetch to /functions/v1/api-contents (expect 401, no global event)');
      const res = await fetch('/functions/v1/api-contents');
      const text = await res.text();
      setResult(`Status: ${res.status} ${res.statusText}\n${text}`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      logger.error('Plain fetch error', { message: msg });
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Debug 401 / 403</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use os botões abaixo para acionar respostas 401 e observar o listener global.
          </p>
          <div className="flex gap-3">
            <Button data-testid="trigger-authorized-401" onClick={triggerAuthorized401}>
              Acionar 401 via authorizedFetch
            </Button>
            <Button variant="outline" data-testid="trigger-plain-401" onClick={triggerPlain401}>
              Acionar 401 via fetch direto
            </Button>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          {result && (
            <Alert>
              <AlertDescription>
                <pre className="whitespace-pre-wrap break-words text-xs">{result}</pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}