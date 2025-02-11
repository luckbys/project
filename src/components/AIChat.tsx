import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send } from 'lucide-react';

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
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const AIChat = ({ dashboardStats, aboutMe, messages }: AIChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  useEffect(() => {
    // Scroll para a última mensagem
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
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

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    try {
      setIsLoading(true);
      const newMessage: Message = { role: 'user', content: input };
      setChatMessages(prev => [...prev, newMessage]);
      setInput('');

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `${generateSystemPrompt()}\n\nUsuário: ${input}\n\nPor favor, formate sua resposta de forma clara e organizada, usando:\n- Bullets para listas\n- Negrito para números importantes\n- Seções bem definidas\n- Conclusões objetivas`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const formattedText = formatResponse(response.text());

      setChatMessages(prev => [...prev, { role: 'assistant', content: formattedText }]);
    } catch (error) {
      console.error('Erro ao gerar resposta:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Desculpe, ocorreu um erro ao processar sua mensagem.' 
      }]);
    } finally {
      setIsLoading(false);
    }
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
        className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } z-50`}
        style={{ 
          borderRadius: '24px 0 0 24px',
          opacity: isOpen ? 1 : 0,
          transform: `translateX(${isOpen ? '0' : '100%'}) scale(${isOpen ? '1' : '0.95'})`,
        }}
      >
        <div className="flex flex-col h-full">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
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

          {/* Área de Chat */}
          <div 
            ref={chatRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 shadow-sm animate-slideInLeft'
                      : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md animate-slideInRight'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown 
                      className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-strong:text-blue-600 prose-strong:font-bold prose-li:text-gray-700"
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
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
                onClick={handleSendMessage}
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