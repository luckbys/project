import { useState, useEffect, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type SmartMetric = {
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  insight: string;
  prediction?: number;
  historicalTrend: number[];
  relatedMetrics: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
};

type SmartFilter = {
  id: string;
  label: string;
  type: 'date' | 'category' | 'status' | 'performance';
  options: string[];
  value: string;
};

type AIAnalysis = {
  metrics: Record<string, SmartMetric>;
  insights: string[];
  predictions: Record<string, number>;
  correlations: string[];
  patterns?: {
    [key: string]: {
      label: string;
      categories: string[];
    };
  };
  anomalies?: string[];
};

type AIRecommendation = {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  priority: number;
  category: 'performance' | 'engagement' | 'growth' | 'risk';
  steps: string[];
  metrics: string[];
};

type AIInsight = {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'pattern';
  confidence: number;
  visualization?: 'line' | 'bar' | 'radar';
  data?: {
    labels: string[];
    values: number[];
  };
  relatedMetrics: string[];
};

// Novos tipos para métricas avançadas
type KPI = {
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  previousValue: number;
  goal?: number;
  status: 'good' | 'warning' | 'critical';
  history: number[];
  forecast: number[];
};

type DashboardMetrics = {
  conversion: KPI & {
    totalQuotes: number;
    convertedQuotes: number;
  };
  responseTime: KPI & {
    averageTime: number; // em minutos
    responseDistribution: {
      under1h: number;
      under24h: number;
      over24h: number;
    };
  };
  satisfaction: KPI & {
    totalRatings: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  };
  projectCompletion: KPI & {
    totalProjects: number;
    completedProjects: number;
    onTimeCompletion: number;
  };
};

type TimeRange = '7d' | '30d' | '90d' | '1y';

type KPIs = {
  conversion: {
    value: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
    convertedQuotes: number;
    goal: number;
  };
  responseTime: {
    averageTime: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
    responseDistribution: {
      under1h: number;
      under24h: number;
      over24h: number;
    };
  };
  satisfaction: {
    value: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
    totalRatings: number;
  };
  projectCompletion: {
    value: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
    completedProjects: number;
  };
};

// Adicionar novos tipos
type ProjectTimeline = {
  projectId: string;
  title: string;
  startDate: Date;
  dueDate: Date;
  progress: number;
  milestones: {
    id: string;
    title: string;
    dueDate: Date;
    completed: boolean;
  }[];
  delays: {
    taskId: string;
    daysDelayed: number;
    impact: 'high' | 'medium' | 'low';
  }[];
  timelineHealth: {
    status: 'on_track' | 'at_risk' | 'delayed';
    daysAhead?: number;
    daysDelayed?: number;
    completionForecast?: Date;
  };
};

// Adicionar cache local
const CACHE_KEY = 'dashboard_ai_analysis';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutos

interface CacheData {
  timestamp: number;
  data: {
    insights: any[];
    recommendations: any[];
    analysis: any;
  };
}

const getCache = (): CacheData | null => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const data = JSON.parse(cached);
  const now = Date.now();

  if (now - data.timestamp > CACHE_DURATION) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }

  return data;
};

const setCache = (data: any) => {
  const cacheData: CacheData = {
    timestamp: Date.now(),
    data
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
};

// Adicionar tipos mais específicos
type AIResponse = {
  metrics: {
    messageMetrics: {
      total: number;
      unread: number;
      responseRate: number;
    };
    projectMetrics: {
      total: number;
      active: number;
      completionRate: number;
      onTimeDelivery: number;
    };
  };
  insights: AIInsight[];
  recommendations: AIRecommendation[];
};

// Melhorar a inicialização do Gemini
const initializeGenAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('API Key do Gemini não encontrada');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-pro" });
  } catch (error) {
    console.error('Erro ao inicializar Gemini:', error);
    return null;
  }
};

// Mover funções auxiliares para fora do hook
const calculateGrowthPercentage = (data: any[]) => {
  if (!data || data.length < 2) return 0;
  const first = data[0].count;
  const last = data[data.length - 1].count;
  return first === 0 ? 100 : Math.round(((last - first) / first) * 100);
};

const predictNextValue = (values: number[]) => {
  if (!values || values.length < 2) return values?.[0] || 0;
  const lastValue = values[values.length - 1];
  const growth = values[values.length - 1] - values[values.length - 2];
  return Math.max(0, lastValue + growth);
};

// Adicionar a função fetchLatestData
const fetchLatestData = async () => {
  try {
    const now = new Date();
    const timeRanges = {
      '7d': new Date(now.setDate(now.getDate() - 7)),
      '30d': new Date(now.setDate(now.getDate() - 30)),
      '90d': new Date(now.setDate(now.getDate() - 90)),
      '1y': new Date(now.setFullYear(now.getFullYear() - 1))
    };

    const startDate = timeRanges[timeRange];

    // Buscar mensagens
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    // Buscar projetos
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        description,
        image,
        tags,
        link,
        created_at,
        category,
        status,
        priority,
        start_date,
        due_date,
        progress,
        assigned_to,
        tasks,
        budget,
        created_from_quote
      `)
      .gte('created_at', startDate.toISOString());

    if (projectsError) throw projectsError;

    // Calcular métricas localmente
    const calculatedMetrics = {
      messages: {
        total: messages?.length || 0,
        unread: messages?.filter(m => !m.read).length || 0,
        responseRate: messages?.length ? 
          ((messages.length - messages.filter(m => !m.read).length) / messages.length) * 100 : 0
      },
      projects: {
        total: projects?.length || 0,
        active: projects?.filter(p => p.status === 'in_progress').length || 0,
        completed: projects?.filter(p => p.status === 'done').length || 0,
        onTime: projects?.filter(p => {
          const dueDate = new Date(p.due_date);
          return p.status === 'done' && new Date() <= dueDate;
        }).length || 0
      }
    };

    // Formatar projetos
    const formattedProjects = projects?.map(p => ({
      ...p,
      tasks: Array.isArray(p.tasks) ? p.tasks : JSON.parse(p.tasks || '[]'),
      team: [] // Se precisar de membros da equipe, implementar depois
    })) || [];

    return {
      messages: messages || [],
      projects: formattedProjects,
      metrics: calculatedMetrics,
      timeRange,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao buscar dados atualizados:', error);
    throw error;
  }
};

export const useSmartDashboard = (initialData: any) => {
  // Definir tipos para os dados do dashboard
  type DashboardData = {
    totalMessages: number;
    unreadMessages: number;
    totalProjects: number;
    messagesByMonth: { month: string; count: number; }[];
    projectsByCategory: { category: string; count: number; }[];
    recentMessages: any[];
    recentProjects: any[];
    projects: any[];
  };

  // Inicializar com valores padrão
  const defaultDashboardData: DashboardData = {
    totalMessages: 0,
    unreadMessages: 0,
    totalProjects: 0,
    messagesByMonth: [],
    projectsByCategory: [],
    recentMessages: [],
    recentProjects: [],
    projects: []
  };

  // Estados
  const [dashboardData, setDashboardData] = useState<DashboardData>(
    initialData || defaultDashboardData
  );
  const [smartMetrics, setSmartMetrics] = useState<Record<string, SmartMetric>>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [detailedInsights, setDetailedInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Inicializar Gemini com verificação
  const genAI = useMemo(() => initializeGenAI(), []);

  // Filtros dinâmicos baseados em padrões detectados
  const dynamicFilters = useMemo(() => {
    return [
      {
        id: 'performance',
        label: 'Performance',
        type: 'performance',
        options: ['Alta', 'Média', 'Baixa'],
        value: 'all'
      },
      {
        id: 'activity',
        label: 'Atividade',
        type: 'status',
        options: ['Muito Ativo', 'Ativo', 'Inativo'],
        value: 'all'
      },
      {
        id: 'trend',
        label: 'Tendência',
        type: 'category',
        options: ['Crescente', 'Estável', 'Decrescente'],
        value: 'all'
      }
    ] as SmartFilter[];
  }, []);

  // Remover declarações duplicadas e usar as funções globais
  const formatInitialData = (data: any) => {
    return {
      metrics: {
        messages: {
          value: data.totalMessages,
          trend: data.messagesByMonth[data.messagesByMonth.length - 1]?.count > data.messagesByMonth[0]?.count ? 'up' : 'down',
          percentage: calculateGrowthPercentage(data.messagesByMonth),
          insight: `Total de ${data.totalMessages} mensagens, ${data.unreadMessages} não lidas`,
          prediction: predictNextValue(data.messagesByMonth.map(m => m.count)),
          recommendations: ['Responder mensagens não lidas', 'Melhorar tempo de resposta'],
          riskLevel: data.unreadMessages > 5 ? 'high' : 'low',
          confidence: 90,
          historicalTrend: data.messagesByMonth.map(m => m.count),
          relatedMetrics: ['projects', 'skills']
        },
        projects: {
          value: data.totalProjects,
          trend: 'up',
          percentage: 100,
          insight: `${data.totalProjects} projetos ativos`,
          prediction: data.totalProjects + 2,
          recommendations: ['Diversificar categorias', 'Aumentar portfólio'],
          riskLevel: 'low',
          confidence: 85,
          historicalTrend: [data.totalProjects - 2, data.totalProjects - 1, data.totalProjects],
          relatedMetrics: ['skills', 'messages']
        },
        skills: {
          value: data.totalSkills,
          trend: 'stable',
          percentage: 100,
          insight: `${data.totalSkills} habilidades registradas`,
          prediction: data.totalSkills + 1,
          recommendations: ['Adicionar novas tecnologias', 'Atualizar skills existentes'],
          riskLevel: 'low',
          confidence: 95,
          historicalTrend: [data.totalSkills],
          relatedMetrics: ['projects']
        }
      },
      recommendations: [
        {
          id: '1',
          title: 'Melhorar Gestão de Mensagens',
          description: `Existem ${data.unreadMessages} mensagens não lidas que precisam de atenção`,
          impact: data.unreadMessages > 5 ? 'high' : 'medium',
          effort: 'low',
          priority: data.unreadMessages > 5 ? 100 : 50,
          category: 'performance',
          steps: ['Revisar caixa de entrada', 'Categorizar mensagens', 'Definir prioridades'],
          metrics: ['messages']
        },
        {
          id: '2',
          title: 'Expandir Portfólio',
          description: 'Oportunidade de crescimento em novas categorias',
          impact: 'high',
          effort: 'medium',
          priority: 80,
          category: 'growth',
          steps: ['Identificar tendências', 'Selecionar novos nichos', 'Desenvolver MVPs'],
          metrics: ['projects', 'skills']
        }
      ],
      insights: [
        {
          title: 'Análise de Mensagens',
          description: `Tendência de ${calculateGrowthPercentage(data.messagesByMonth)}% no volume de mensagens`,
          type: 'trend',
          confidence: 90,
          relatedMetrics: ['messages'],
          visualization: 'line',
          data: {
            labels: data.messagesByMonth.map(m => m.month),
            values: data.messagesByMonth.map(m => m.count)
          }
        },
        {
          title: 'Distribuição de Projetos',
          description: 'Análise da distribuição de projetos por categoria',
          type: 'correlation',
          confidence: 85,
          relatedMetrics: ['projects'],
          visualization: 'bar',
          data: {
            labels: data.projectsByCategory.map(p => p.category),
            values: data.projectsByCategory.map(p => p.count)
          }
        }
      ]
    };
  };

  // Atualizar a função generateAnalysisPrompt para usar as funções globais
  const generateAnalysisPrompt = (data: DashboardData) => {
    const growth = calculateGrowthPercentage(data.messagesByMonth);
    const prediction = predictNextValue(data.messagesByMonth.map(m => m.count));
    
    return `
      Analise os dados do dashboard e forneça insights estratégicos:
      
      MÉTRICAS ATUAIS:
      * Mensagens
        - Total: ${data.totalMessages}
        - Não lidas: ${data.unreadMessages}
        - Crescimento: ${growth}%
        - Previsão próximo mês: ${prediction}
      
      * Projetos
        - Total: ${data.totalProjects}
        - Por categoria: ${JSON.stringify(data.projectsByCategory)}
        - Tendência mensal: ${JSON.stringify(data.messagesByMonth)}

      ANÁLISE SOLICITADA:

      1. Performance Geral:
        - Identifique os principais KPIs e suas tendências
        - Destaque áreas de sucesso e pontos de atenção
        - Sugira metas realistas baseadas nos dados históricos

      2. Análise de Tendências:
        - Padrões de comunicação e resposta
        - Evolução dos projetos por categoria
        - Sazonalidade e ciclos identificados

      3. Recomendações Práticas:
        - Priorize 3-5 ações de alto impacto
        - Inclua passos específicos para implementação
        - Estime esforço necessário e resultados esperados

      4. Oportunidades de Melhoria:
        - Identifique gargalos e ineficiências
        - Sugira otimizações de processo
        - Proponha métricas para acompanhamento

      FORMATO DA RESPOSTA:
      {
        "metrics": {
          "performance": {
            "score": number (0-100),
            "trend": "up" | "down" | "stable",
            "keyFindings": string[]
          },
          "communication": {
            "efficiency": number (0-100),
            "bottlenecks": string[],
            "improvements": string[]
          },
          "projects": {
            "healthScore": number (0-100),
            "riskAreas": string[],
            "opportunities": string[]
          }
        },
          "insights": [
            {
            "id": string,
            "title": string,
            "description": string,
            "type": "trend" | "anomaly" | "correlation" | "pattern",
            "impact": "high" | "medium" | "low",
            "confidence": number (0-100),
            "metrics": string[],
            "visualization": {
              "type": "line" | "bar" | "radar",
              "data": {
                "labels": string[],
                "values": number[]
              }
            }
            }
          ],
          "recommendations": [
            {
            "id": string,
            "title": string,
            "description": string,
            "impact": "high" | "medium" | "low",
            "effort": "high" | "medium" | "low",
            "priority": number (1-10),
            "category": "performance" | "communication" | "process" | "growth",
              "steps": string[],
            "expectedResults": string[],
            "metrics": string[]
          }
        ],
        "forecast": {
          "nextMonth": {
            "messages": number,
            "projects": number,
            "responseRate": number
          },
          "trends": {
            "growing": string[],
            "declining": string[],
            "stable": string[]
          }
        }
      }

      OBSERVAÇÕES:
      - Priorize insights acionáveis e específicos
      - Baseie as recomendações em dados concretos
      - Inclua métricas quantitativas sempre que possível
      - Considere o contexto histórico nas análises
      - Sugira metas realistas e mensuráveis
    `;
  };

  // Função para carregar dados iniciais
  const loadInitialData = async () => {
    try {
      setIsGeneratingInsights(true);
      const data = await fetchLatestData();
      
      const formattedData = {
        totalMessages: data.messages.length,
        unreadMessages: data.messages.filter(m => !m.read).length,
        totalProjects: data.projects.length,
        messagesByMonth: groupMessagesByMonth(data.messages),
        projectsByCategory: groupProjectsByCategory(data.projects),
        recentMessages: data.messages.slice(0, 10),
        recentProjects: data.projects.slice(0, 5),
        projects: data.projects.map(formatProject)
      };

      setDashboardData(formattedData);
      await generateAIAnalysis(formattedData);

    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Efeito para carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []); // Carregar apenas uma vez ao montar

  // Efeito para atualizar quando mudar o período
  useEffect(() => {
    if (timeRange) {
      generateDetailedAnalysis();
    }
  }, [timeRange]);

  // Atualizar generateDetailedAnalysis
  const generateDetailedAnalysis = async () => {
    try {
      setIsGeneratingInsights(true);
      
      const latestData = await fetchLatestData();
      
      const formattedData = {
        totalMessages: latestData.messages.length,
        unreadMessages: latestData.messages.filter(m => !m.read).length,
        totalProjects: latestData.projects.length,
        messagesByMonth: groupMessagesByMonth(latestData.messages),
        projectsByCategory: groupProjectsByCategory(latestData.projects),
        recentMessages: latestData.messages.slice(0, 10),
        recentProjects: latestData.projects.slice(0, 5),
        projects: latestData.projects.map(formatProject),
        metrics: latestData.metrics // Usar métricas calculadas
      };

      setDashboardData(formattedData);

      if (Object.keys(formattedData).length > 0) {
        await generateAIAnalysis(formattedData);
      }

      // Atualizar KPIs com base nas métricas calculadas
      const newKpis = {
        conversion: {
          value: latestData.metrics.projects.completed / latestData.metrics.projects.total * 100 || 0,
          trend: 'stable',
          percentage: 0,
          convertedQuotes: latestData.metrics.projects.completed,
          goal: 100
        },
        responseTime: {
          averageTime: 0,
          trend: 'stable',
          percentage: latestData.metrics.messages.responseRate,
          responseDistribution: {
            under1h: 0,
            under24h: 0,
            over24h: 0
          }
        },
        satisfaction: {
          value: 0,
          trend: 'stable',
          percentage: 0,
          totalRatings: 0
        },
        projectCompletion: {
          value: latestData.metrics.projects.completed / latestData.metrics.projects.total * 100 || 0,
          trend: 'stable',
          percentage: latestData.metrics.projects.onTime / latestData.metrics.projects.completed * 100 || 0,
          completedProjects: latestData.metrics.projects.completed
        }
      };

      setKpis(newKpis);
      toast.success('Dashboard atualizado com sucesso!');

    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error);
      toast.error('Erro ao atualizar dashboard');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Funções auxiliares para formatação
  const groupMessagesByMonth = (messages: any[]) => {
    const grouped = messages.reduce((acc, msg) => {
      const month = new Date(msg.created_at).toLocaleString('pt-BR', { month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([month, count]) => ({
      month,
      count
    }));
  };

  const groupProjectsByCategory = (projects: any[]) => {
    const grouped = projects.reduce((acc, proj) => {
      acc[proj.category] = (acc[proj.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, count]) => ({
      category,
      count
    }));
  };

  // Funções para gerar insights e recomendações
  const generateInsights = (metrics: Record<string, SmartMetric>): AIInsight[] => {
    const insights: AIInsight[] = [];
    
    // Exemplo de geração de insights
    Object.entries(metrics).forEach(([key, metric]) => {
      insights.push({
        id: `insight-${key}`,
        title: `Análise de ${key}`,
        description: metric.insight,
        type: metric.trend === 'up' ? 'trend' : 'pattern',
        confidence: metric.confidence,
        visualization: 'line',
        data: {
          labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
          values: metric.historicalTrend
        },
        relatedMetrics: metric.relatedMetrics
      });
    });

    return insights;
  };

  const generateRecommendations = (
    metrics: Record<string, SmartMetric>,
    insights: AIInsight[]
  ): AIRecommendation[] => {
    // Implementar lógica de geração de recomendações
    return [
      {
        id: 'rec-1',
        title: 'Melhorar Engajamento',
        description: 'Aumentar interação com usuários',
        impact: 'high',
        effort: 'medium',
        priority: 8,
        category: 'engagement',
        steps: [
          'Responder mensagens mais rapidamente',
          'Criar conteúdo interativo',
          'Engajar em redes sociais'
        ],
        metrics: ['engagement', 'satisfaction']
      },
      // Adicionar mais recomendações...
    ];
  };

  // Calcular KPIs
  const calculateKPIs = (data: any): KPIs => {
    if (!data) {
      return {
        conversion: {
          value: 0,
          trend: 'stable',
          percentage: 0,
          convertedQuotes: 0,
          goal: 0
        },
        responseTime: { 
          averageTime: 0, 
          trend: 'stable', 
          percentage: 0, 
          responseDistribution: {
            under1h: 0,
            under24h: 0,
            over24h: 0
          }
        },
        satisfaction: {
          value: 0,
          trend: 'stable',
          percentage: 0,
          totalRatings: 0
        },
        projectCompletion: {
          value: 0,
          trend: 'stable',
          percentage: 0,
          completedProjects: 0
        }
      };
    }

    // Calcular métricas de conversão
    const quotes = data.quotes || [];
    const convertedQuotes = quotes.filter((q: any) => q.status === 'converted').length;
    const conversionRate = quotes.length ? (convertedQuotes / quotes.length) * 100 : 0;

    // Calcular tempo de resposta
    const messages = data.messages || [];
    const responseTimes = messages
      .filter((m: any) => m.response_time)
      .map((m: any) => m.response_time);
    const avgResponseTime = responseTimes.length 
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length 
      : 0;

    // Distribuição de respostas
    const responseDistribution = {
      under1h: messages.filter((m: any) => m.response_time && m.response_time <= 60).length,
      under24h: messages.filter((m: any) => m.response_time && m.response_time <= 1440).length,
      over24h: messages.filter((m: any) => m.response_time && m.response_time > 1440).length
    };

    // Calcular satisfação
    const ratings = data.ratings || [];
    const avgRating = ratings.length 
      ? ratings.reduce((a: number, b: number) => a + b.rating, 0) / ratings.length 
      : 0;

    // Calcular conclusão de projetos
    const projects = data.projects || [];
    const completedProjects = projects.filter((p: any) => p.status === 'done').length;
    const completionRate = projects.length ? (completedProjects / projects.length) * 100 : 0;

    return {
      conversion: {
        value: Math.round(conversionRate),
        trend: determineTrend(conversionRate, data.previousConversionRate || 0),
        percentage: calculateGrowthPercentage([{ count: data.previousConversionRate || 0 }, { count: conversionRate }]),
        convertedQuotes,
        goal: data.conversionGoal || Math.round(conversionRate * 1.2)
      },
      responseTime: {
        averageTime: Math.round(avgResponseTime),
        trend: determineTrend(avgResponseTime, data.previousResponseTime || 0),
        percentage: calculateGrowthPercentage([{ count: data.previousResponseTime || 0 }, { count: avgResponseTime }]),
        responseDistribution
      },
      satisfaction: {
        value: Math.round(avgRating * 100) / 100,
        trend: determineTrend(avgRating, data.previousSatisfaction || 0),
        percentage: calculateGrowthPercentage([{ count: data.previousSatisfaction || 0 }, { count: avgRating }]),
        totalRatings: ratings.length
      },
      projectCompletion: {
        value: Math.round(completionRate),
        trend: determineTrend(completionRate, data.previousCompletionRate || 0),
        percentage: calculateGrowthPercentage([{ count: data.previousCompletionRate || 0 }, { count: completionRate }]),
        completedProjects
      }
    };
  };

  // Funções auxiliares
  const determineTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const threshold = 0.05; // 5% de variação
    const change = (current - previous) / previous;
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  const determineStatus = (value: number, threshold: number): 'success' | 'warning' | 'danger' => {
    if (value >= threshold) return 'success';
    if (value >= threshold * 0.7) return 'warning';
    return 'danger';
  };

  const predictValues = (historicalData: number[]): number => {
    if (!historicalData?.length) return 0;
    
    // Implementação básica de previsão usando média móvel
    const recentValues = historicalData.slice(-3);
    const avgGrowth = recentValues.reduce((acc, curr, i, arr) => {
      if (i === 0) return acc;
      return acc + (curr - arr[i - 1]) / arr[i - 1];
    }, 0) / (recentValues.length - 1);

    const lastValue = recentValues[recentValues.length - 1];
    return Math.round(lastValue * (1 + avgGrowth));
  };

  return {
    dashboardData,
    smartMetrics,
    insights: detailedInsights,
    recommendations,
    activeFilters,
    setActiveFilters,
    isAnalyzing: isGeneratingInsights,
    refreshAnalysis: generateDetailedAnalysis,
    kpis,
    timeRange,
    setTimeRange
  };
}; 