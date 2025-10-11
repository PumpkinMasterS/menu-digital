import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import { 
  HelpCircle, 
  BookOpen, 
  Settings, 
  Bot, 
  MessageSquare,
  Mail,
  Phone,
  ExternalLink
} from "lucide-react";

export default function Help() {
  const quickStartGuides = [
    {
      title: "Configuração Inicial",
      description: "Como configurar sua escola no sistema",
      icon: <Settings className="h-5 w-5 text-blue-600" />,
      steps: [
        "Criar perfil da escola em 'Escolas'",
        "Adicionar disciplinas em 'Disciplinas'",
        "Criar turmas em 'Turmas'",
        "Registrar alunos em 'Alunos'",
        "Configurar Bot IA em 'Bot IA'"
      ]
    },
    {
      title: "Gestão de Conteúdos",
      description: "Como adicionar e organizar materiais educativos",
      icon: <BookOpen className="h-5 w-5 text-green-600" />,
      steps: [
        "Aceder a 'Materiais'",
        "Clique em 'Novo Conteúdo'",
        "Preencher título e descrição",
        "Associar à disciplina e ano",
        "Adicionar tags pedagógicas"
      ]
    },
    {
      title: "Bot WhatsApp",
      description: "Como configurar e testar o bot de IA",
      icon: <Bot className="h-5 w-5 text-purple-600" />,
      steps: [
        "Ir para 'Bot IA'",
        "Configurar credenciais WhatsApp",
        "Configurar modelo de IA",
        "Testar com aluno específico",
        "Ativar sistema"
      ]
    }
  ];

  const faqItems = [
    {
      question: "Como posso importar alunos em massa?",
      answer: "Atualmente, os alunos devem ser adicionados individualmente através do formulário. Uma funcionalidade de importação CSV está planeada para uma futura atualização."
    },
    {
      question: "Como ativar o bot para um aluno específico?",
      answer: "Na página 'Alunos', clique em editar o aluno desejado e marque a opção 'Bot Ativo'. Certifique-se de que o número de WhatsApp está correto."
    },
    {
      question: "Que tipos de ficheiros posso carregar?",
      answer: "O sistema suporta PDFs, imagens (JPG, PNG), documentos de texto, vídeos e áudios. Tamanho máximo de 50MB por ficheiro."
    },
    {
      question: "Como organizar conteúdos por dificuldade?",
      answer: "Use as tags pedagógicas para marcar o nível de dificuldade (iniciante, intermédio, avançado) e organize por tópicos específicos."
    }
  ];

  return (
    <div className="space-y-6">
      <Header 
        title="Central de Ajuda" 
        subtitle="Encontre respostas, guias e suporte técnico"
        icon={<HelpCircle className="h-6 w-6" />}
      />

      {/* Quick Start Guides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Guias Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quickStartGuides.map((guide, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        {guide.icon}
                        <div>
                          <CardTitle className="text-base">{guide.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{guide.description}</p>
                      <div className="space-y-1">
                        {guide.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-2 text-sm">
                            <span className="flex-shrink-0 w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs">
                              {stepIndex + 1}
                            </span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">{item.question}</h4>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Suporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">suporte@connectai.com</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Telefone</div>
                      <div className="text-sm text-muted-foreground">+351 800 123 456</div>
                    </div>
                  </div>
                </div>
                <div>
                  <Button className="w-full" size="lg">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Criar Ticket de Suporte
                  </Button>
                </div>
              </div>
            </CardContent>
           </Card>
    </div>
  );
}
