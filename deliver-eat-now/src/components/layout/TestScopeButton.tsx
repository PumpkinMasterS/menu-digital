import { Button } from '@/components/ui/button'
import { useViewScope } from '@/hooks/useViewScope'
import { Eye } from 'lucide-react'

const TestScopeButton = () => {
  const { enterScope, currentScope, exitScope } = useViewScope()

  const handleTestScope = () => {
    if (currentScope) {
      console.log('🔄 Saindo do scope:', currentScope.name)
      exitScope()
    } else {
      console.log('🧪 Testando ViewScope...')
      enterScope({
        type: 'organization',
        id: 'org-lisboa-123',
        name: 'Lisboa Food Network'
      })
    }
  }

  return (
    <Button 
      onClick={handleTestScope}
      variant={currentScope ? "destructive" : "secondary"}
      size="sm"
      className="flex items-center space-x-2"
    >
      <Eye className="h-4 w-4" />
      <span>
        {currentScope ? `🔄 Sair: ${currentScope.name}` : '🧪 Teste Scope'}
      </span>
    </Button>
  )
}

export default TestScopeButton 