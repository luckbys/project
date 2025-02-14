import { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, BarChart2, Mail, Rocket, Brain, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

type User = {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
};

type AIChatProps = {
  dashboardStats: {
    totalMessages: number;
    unreadMessages: number;
    totalProjects: number;
    totalSkills: number;
    messagesByMonth: { month: string; count: number; }[];
    projectsByCategory: { category: string; count: number; }[];
  };
  aboutMe: {
    developer_name: string;
    stats: {
      years_experience: number;
      projects_completed: number;
      clients_satisfied: number;
      satisfaction_rate: number;
    };
  } | null;
  messages: {
    id: string;
    name: string;
    email: string;
    message: string;
    read: boolean;
    created_at: string;
  }[];
  user: User | null;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type QuickAction = {
  id: string;
  icon: JSX.Element;
  label: string;
  prompt: string;
};

// Novo componente para formatar respostas
const FormattedResponse = ({ content }: { content: string }) => {
  // Separar o conteúdo em seções
  const sections = content.split('\n\n').filter(Boolean);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {sections.map((section, index) => {
        // Identificar o tipo de seção
        const isInsight = section.toLowerCase().includes('insight');
        const isRecommendation = section.toLowerCase().includes('recomendação') || 
                                section.toLowerCase().includes('sugestão');
        const isAnalysis = section.toLowerCase().includes('análise') ||
                          section.toLowerCase().includes('avaliação');
        const isMetric = /\d+%|\d+\.\d+/.test(section);

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg ${
              isInsight ? 'bg-purple-50 border border-purple-100' :
              isRecommendation ? 'bg-blue-50 border border-blue-100' :
              isAnalysis ? 'bg-green-50 border border-green-100' :
              isMetric ? 'bg-orange-50 border border-orange-100' :
              'bg-gray-50 border border-gray-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                isInsight ? 'bg-purple-100 text-purple-600' :
                isRecommendation ? 'bg-blue-100 text-blue-600' :
                isAnalysis ? 'bg-green-100 text-green-600' :
                isMetric ? 'bg-orange-100 text-orange-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {isInsight ? '💡' :
                 isRecommendation ? '🎯' :
                 isAnalysis ? '📊' :
                 isMetric ? '📈' : '💬'}
              </div>
              <div className="flex-1">
                <ReactMarkdown 
                  className="prose prose-sm max-w-none"
                  components={{
                    p: ({ children }) => (
                      <p className="text-gray-700 leading-relaxed">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 mt-2">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-600">{children}</li>
                    ),
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">
                        {children}
                      </code>
                    )
                  }}
                >
                  {section}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

const AIChat = ({ dashboardStats, aboutMe, messages, user }: AIChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const [hasInitialMessage, setHasInitialMessage] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const genAI = useMemo(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('API Key do Gemini não configurada');
      return null;
    }
    return new GoogleGenerativeAI(apiKey);
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'analyze_metrics',
      icon: <BarChart2 className="w-4 h-4" />,
      label: 'Analisar Métricas',
      prompt: 'Faça uma análise detalhada das métricas atuais do dashboard, destacando pontos importantes e tendências.'
    },
    {
      id: 'messages_summary',
      icon: <Mail className="w-4 h-4" />,
      label: 'Resumo de Mensagens',
      prompt: 'Resuma as últimas mensagens recebidas, identificando padrões e prioridades.'
    },
    {
      id: 'project_insights',
      icon: <Rocket className="w-4 h-4" />,
      label: 'Insights de Projetos',
      prompt: 'Analise o status dos projetos atuais e sugira otimizações na gestão.'
    },
    {
      id: 'ai_suggestions',
      icon: <Brain className="w-4 h-4" />,
      label: 'Sugestões IA',
      prompt: 'Com base nos dados atuais, que sugestões você tem para melhorar a performance geral?'
    },
    {
      id: 'trends',
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Tendências',
      prompt: 'Identifique as principais tendências nos dados do dashboard e projete cenários futuros.'
    }
  ];

  useEffect(() => {
    if (isOpen && !hasInitialMessage) {
      setChatMessages([generateWelcomeMessage()]);
      setHasInitialMessage(true);
    }
  }, [isOpen, hasInitialMessage, user]);

  useEffect(() => {
    // Scroll para a última mensagem com foco
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [chatMessages]);

  const generateSystemPrompt = () => {
    return `Você é um assistente especializado em análise de dashboard e comunicação com clientes. 
    Você ajuda a interpretar dados, analisar mensagens e sugerir respostas apropriadas.
    
    Dados do dashboard:
    - Total de Mensagens: ${dashboardStats.totalMessages}
    - Mensagens não lidas: ${dashboardStats.unreadMessages}
    - Total de Projetos: ${dashboardStats.totalProjects}
    - Total de Habilidades: ${dashboardStats.totalSkills}
    - Anos de Experiência: ${aboutMe?.stats.years_experience}
    - Projetos Completados: ${aboutMe?.stats.projects_completed}
    - Taxa de Satisfação: ${aboutMe?.stats.satisfaction_rate}%
    
    Mensagens recebidas:
    ${messages.map(msg => `
    De: ${msg.name} (${msg.email})
    Data: ${new Date(msg.created_at).toLocaleString()}
    Status: ${msg.read ? 'Lida' : 'Não lida'}
    Mensagem: ${msg.message}
    ---
    `).join('\n')}
    
    Por favor, analise as mensagens e forneça:
    1. Insights sobre os principais tipos de solicitações
    2. Padrões de comunicação dos clientes
    3. Sugestões de respostas personalizadas
    4. Recomendações para melhorar o tempo de resposta
    5. Identificação de oportunidades de negócio
    
    Ao sugerir respostas, considere:
    - Tom profissional mas amigável
    - Personalização baseada no contexto
    - Clareza e objetividade
    - Soluções práticas para as solicitações`;
  };

  const formatResponse = (text: string) => {
    // Adiciona formatação markdown para métricas
    text = text.replace(/(\d+([,.]\d+)?%?)/g, '**$1**');
    
    // Adiciona emojis contextuais
    text = text.replace(/mensagens/gi, '📨 mensagens');
    text = text.replace(/projetos/gi, '🚀 projetos');
    text = text.replace(/habilidades/gi, '💡 habilidades');
    text = text.replace(/experiência/gi, '⭐ experiência');
    
    return text;
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
    handleSendMessage(action.prompt);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageToSend = customPrompt || input;
    if (!messageToSend.trim()) return;

    try {
      setIsLoading(true);
      
      if (!genAI) {
        throw new Error('Cliente Gemini não inicializado - Verifique sua API key');
      }

      const newMessage: Message = { role: 'user', content: messageToSend };
      setChatMessages(prev => [...prev, newMessage]);
      setInput('');

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `${generateSystemPrompt()}\n\nUsuário: ${messageToSend}\n\nPor favor, formate sua resposta de forma clara e organizada.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const formattedText = formatResponse(response.text());

      setChatMessages(prev => [...prev, { role: 'assistant', content: formattedText }]);
    } catch (error) {
      console.error('Erro ao gerar resposta:', error);
      toast.error('Erro ao gerar resposta - Verifique sua API key do Gemini');
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Erro: API key inválida ou não configurada. Por favor, verifique suas configurações.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const userName = aboutMe?.developer_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Administrador';

    return {
      role: 'assistant' as const,
      content: `${greeting}, ${userName}! 👋

Sou seu assistente virtual e estou aqui para ajudar com a análise do seu dashboard. Posso te auxiliar com:

• 📊 Análise de métricas e estatísticas
• 📨 Gestão de mensagens e contatos
• 🚀 Insights sobre projetos
• 💡 Sugestões de melhorias
• 📈 Tendências e padrões

Como posso te ajudar hoje?`
    };
  };

  return (
    <>
      {/* Botão FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center group hover:scale-110 hover:rotate-[360deg] active:scale-95"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute right-16 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Assistente IA
        </span>
      </button>

      {/* Modal do Chat */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } z-50`}
        style={{ 
          borderRadius: '44px 0 0 44px',
          opacity: isOpen ? 1 : 0,
          transform: `translateX(${isOpen ? '0' : '100%'}) scale(${isOpen ? '1' : '0.95'})`,
        }}
      >
        <div className="flex flex-col h-full">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-pueple-70 to-indigo-50">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">🤖</span> Assistente IA
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/50 rounded-full transition-all duration-300 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Ações Rápidas */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
              {quickActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 whitespace-nowrap"
                >
                  {action.icon}
                  <span className="text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Chat */}
          <div 
            ref={chatRef}
            className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-gray-100"
          >
            {chatMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-l-xl rounded-tr-xl' 
                    : 'bg-gray-50 text-gray-700 rounded-r-xl rounded-tl-xl'
                } p-4`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <FormattedResponse content={message.content} />
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-center">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Área de Input */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Pergunte algo sobre seu dashboard..."
                className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-gray-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay para fechar o chat em telas menores */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 md:hidden z-40 animate-fadeIn"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AIChat; 