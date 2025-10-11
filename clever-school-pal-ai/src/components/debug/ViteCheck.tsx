import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const ViteCheck: React.FC = () => {
  // Verificar se há elementos típicos do template padrão do Vite
  const hasViteElements = React.useMemo(() => {
    const checks = {
      hasCountState: false,
      hasViteLogo: false,
      hasReactLogo: false,
      hasDefaultViteText: false,
      hasHMRText: false
    };

    // Verificar no DOM se há elementos típicos do Vite
    const bodyText = document.body.innerText || '';
    
    checks.hasCountState = bodyText.includes('count is');
    checks.hasViteLogo = bodyText.includes('Vite logo');
    checks.hasReactLogo = bodyText.includes('React logo');
    checks.hasDefaultViteText = bodyText.includes('Vite + React');
    checks.hasHMRText = bodyText.includes('Edit src/App.tsx and save to test HMR');

    return checks;
  }, []);

  const hasAnyViteElements = Object.values(hasViteElements).some(Boolean);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasAnyViteElements ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          Verificação de Template Padrão do Vite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {Object.entries(hasViteElements).map(([check, hasElement]) => (
            <div key={check} className="flex items-center justify-between p-2 rounded border">
              <span className="text-sm font-medium">
                {check === 'hasCountState' && 'Counter State (count is X)'}
                {check === 'hasViteLogo' && 'Vite Logo Text'}
                {check === 'hasReactLogo' && 'React Logo Text'}
                {check === 'hasDefaultViteText' && 'Vite + React Text'}
                {check === 'hasHMRText' && 'HMR Test Text'}
              </span>
              <div className="flex items-center gap-2">
                {hasElement ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Detectado</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">OK</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasAnyViteElements && (
          <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h4 className="font-medium text-red-800">Template Padrão do Vite Detectado!</h4>
            </div>
            <p className="text-sm text-red-700">
              Sua aplicação ainda contém elementos do template padrão do Vite. 
              Isso pode indicar que o build não está sendo executado corretamente 
              ou que há conflitos de JavaScript.
            </p>
          </div>
        )}

        <div className="p-4 border rounded bg-muted/50">
          <h4 className="font-medium mb-2">Informações de Debug:</h4>
          <div className="text-sm space-y-1">
            <p><strong>URL Atual:</strong> {window.location.href}</p>
            <p><strong>User Agent:</strong> {navigator.userAgent}</p>
            <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ViteCheck; 