import { useState, useEffect, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toast } from 'react-hot-toast';

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

export const useSmartDashboard = (dashboardData: any) => {
  const [smartMetrics, setSmartMetrics] = useState<Record<string, SmartMetric>>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [detailedInsights, setDetailedInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

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

  // Função para formatar dados iniciais
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

  // Função auxiliar para calcular crescimento
  const calculateGrowthPercentage = (data: any[]) => {
    if (!data || data.length < 2) return 0;
    const first = data[0].count;
    const last = data[data.length - 1].count;
    return first === 0 ? 100 : Math.round(((last - first) / first) * 100);
  };

  // Função auxiliar para prever próximo valor
  const predictNextValue = (values: number[]) => {
    if (!values || values.length < 2) return values?.[0] || 0;
    const lastValue = values[values.length - 1];
    const growth = values[values.length - 1] - values[values.length - 2];
    return Math.max(0, lastValue + growth);
  };

  // Adicionar função generateAnalysisPrompt
  const generateAnalysisPrompt = (data: any): string => {
    // Calcular métricas de cronograma
    const projectTimelines = data.projects?.map((p: any) => {
      const today = new Date();
      const startDate = new Date(p.startDate);
      const dueDate = new Date(p.dueDate);
      const totalDays = Math.ceil((dueDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      const expectedProgress = (daysElapsed / totalDays) * 100;
      
      return {
        projectId: p.id,
        title: p.title,
        startDate,
        dueDate,
        progress: p.progress,
        timelineHealth: {
          status: p.progress >= expectedProgress ? 'on_track' : 
                 p.progress >= expectedProgress * 0.8 ? 'at_risk' : 'delayed',
          daysAhead: p.progress > expectedProgress ? 
                    Math.ceil((p.progress - expectedProgress) * totalDays / 100) : undefined,
          daysDelayed: p.progress < expectedProgress ?
                      Math.ceil((expectedProgress - p.progress) * totalDays / 100) : undefined,
        }
      };
    });

    return `
      Analise os seguintes dados do sistema e gere insights e recomendações relevantes:

      Métricas Gerais:
      - Total de Mensagens: ${data.totalMessages}
      - Mensagens não lidas: ${data.unreadMessages}
      - Total de Projetos: ${data.totalProjects}
      - Projetos Ativos: ${data.recentProjects?.filter(p => p.status === 'in_progress').length}
      
      Histórico de Mensagens (últimos 6 meses):
      ${JSON.stringify(data.messagesByMonth)}

      Projetos por Categoria:
      ${JSON.stringify(data.projectsByCategory)}

      Análise de Cronogramas:
      ${JSON.stringify(projectTimelines, null, 2)}

      Detalhamento dos Projetos:
      ${JSON.stringify(data.projects?.map(p => ({
        id: p.id,
        título: p.title,
        status: p.status,
        prioridade: p.priority,
        progresso: p.progress,
        início: p.startDate,
        prazo: p.dueDate,
        equipe: p.team,
        tarefas: p.tasks?.map(t => ({
          título: t.title,
          concluída: t.completed,
          prazo: t.dueDate
        }))
      })), null, 2)}

      Por favor, forneça uma análise detalhada no seguinte formato:
      {
        "metrics": {
          "messageMetrics": {
            "total": number,
            "unread": number,
            "responseRate": number
          },
          "projectMetrics": {
            "total": number,
            "active": number,
            "completionRate": number,
            "onTimeDelivery": number
          }
        },
        "insights": [
          {
            "id": string,
            "title": string,
            "description": string,
            "type": "trend" | "anomaly" | "correlation" | "pattern",
            "confidence": number,
            "visualization": "line" | "bar" | "radar",
            "data": {
              "labels": string[],
              "values": number[]
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
            "priority": number,
            "category": "performance" | "engagement" | "growth" | "risk",
            "steps": string[]
          }
        ]
      }

      Foque em:
      1. Identificação de tendências e padrões
      2. Detecção de anomalias e pontos de atenção
      3. Recomendações práticas e acionáveis
      4. Priorização baseada em impacto e esforço
      5. Correlações entre diferentes métricas
    `;
  };

  // Melhorar a função de análise da IA
  const generateAIAnalysis = async (data: any) => {
    try {
      setIsGeneratingInsights(true);

      // 1. Tentar usar cache primeiro
      const cached = getCache();
      if (cached?.data) {
        const validCache = validateAnalysisData(cached.data);
        if (validCache) {
          applyAnalysisData(validCache);
          return;
        }
      }

      // 2. Gerar análise local básica como fallback inicial
      const localAnalysis = generateLocalAnalysis(data);
      applyAnalysisData(localAnalysis);

      try {
        // 3. Tentar análise com IA
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = generateAnalysisPrompt(data);
        const result = await model.generateContent(prompt);
        const response = await result.response;

        // 4. Validar e processar resposta da IA
        const aiResponse = processAIResponse(response.text(), localAnalysis);
        
        // 5. Mesclar análises local e IA
        const enrichedAnalysis = enrichAnalysisData(aiResponse, localAnalysis);
        
        // 6. Salvar no cache e aplicar
        setCache(enrichedAnalysis);
        applyAnalysisData(enrichedAnalysis);

      } catch (aiError) {
        console.warn('Usando análise local devido a erro na IA:', aiError);
        // Já temos a análise local aplicada, então só logamos o erro
      }

    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao gerar análise do dashboard');
      
      // Garantir valores padrão
      applyAnalysisData(getDefaultAnalysis());
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Funções auxiliares melhoradas
  const validateAnalysisData = (data: any): AIResponse | null => {
    try {
      // Validar estrutura básica
      if (!data || typeof data !== 'object') return null;

      // Validar métricas
      if (!data.metrics?.messageMetrics || !data.metrics?.projectMetrics) return null;

      // Validar insights e recomendações
      if (!Array.isArray(data.insights) || !Array.isArray(data.recommendations)) return null;

      return data as AIResponse;
    } catch {
      return null;
    }
  };

  const processAIResponse = (responseText: string, fallback: AIResponse): AIResponse => {
    try {
      const parsed = JSON.parse(responseText);
      const validated = validateAnalysisData(parsed);
      
      if (!validated) throw new Error('Resposta da IA inválida');
      
      return validated;
    } catch (error) {
      console.warn('Erro ao processar resposta da IA:', error);
      return fallback;
    }
  };

  const enrichAnalysisData = (aiData: AIResponse, localData: AIResponse): AIResponse => {
    return {
      metrics: {
        messageMetrics: {
          ...localData.metrics.messageMetrics,
          ...aiData.metrics.messageMetrics
        },
        projectMetrics: {
          ...localData.metrics.projectMetrics,
          ...aiData.metrics.projectMetrics
        }
      },
      insights: [
        ...localData.insights,
        ...aiData.insights.filter(insight => 
          !localData.insights.some(local => local.id === insight.id)
        )
      ],
      recommendations: [
        ...localData.recommendations,
        ...aiData.recommendations.filter(rec => 
          !localData.recommendations.some(local => local.id === rec.id)
        )
      ]
    };
  };

  const applyAnalysisData = (data: AIResponse) => {
    setSmartMetrics(data.metrics);
    setDetailedInsights(data.insights);
    setRecommendations(data.recommendations);
  };

  const getDefaultAnalysis = (): AIResponse => ({
    metrics: {
      messageMetrics: {
        total: 0,
        unread: 0,
        responseRate: 0
      },
      projectMetrics: {
        total: 0,
        active: 0,
        completionRate: 0,
        onTimeDelivery: 0
      }
    },
    insights: [],
    recommendations: []
  });

  // Função para gerar análise local
  const generateLocalAnalysis = (data: any) => {
    const metrics = calculateBasicMetrics(data);
    const insights = generateBasicInsights(metrics);
    const recommendations = generateBasicRecommendations(metrics);

    return {
      metrics,
      insights,
      recommendations
    };
  };

  // Funções auxiliares para análise local
  const calculateBasicMetrics = (data: any) => {
    // Cálculos básicos sem IA
    const totalMessages = data.totalMessages || 0;
    const unreadMessages = data.unreadMessages || 0;
    const responseRate = totalMessages ? ((totalMessages - unreadMessages) / totalMessages) * 100 : 0;

    return {
      messageMetrics: {
        total: totalMessages,
        unread: unreadMessages,
        responseRate
      },
      // ... outros cálculos básicos
    };
  };

  const generateBasicInsights = (metrics: any) => {
    const insights = [];
    
    // Gerar insights baseados em regras simples
    if (metrics.messageMetrics.responseRate < 80) {
      insights.push({
        id: 'response-rate',
        title: 'Taxa de Resposta Baixa',
        type: 'alert',
        description: 'A taxa de resposta está abaixo do ideal. Considere priorizar respostas pendentes.'
      });
    }

    // ... outros insights baseados em regras

    return insights;
  };

  const generateBasicRecommendations = (metrics: any) => {
    const recommendations = [];
    
    // Recomendações baseadas em regras simples
    if (metrics.messageMetrics.unread > 10) {
      recommendations.push({
        id: 'handle-unread',
        title: 'Gerenciar Mensagens Não Lidas',
        impact: 'high',
        description: 'Há muitas mensagens não lidas. Estabeleça um horário dedicado para respondê-las.',
        steps: ['Revisar mensagens não lidas', 'Priorizar por data', 'Responder as mais urgentes primeiro']
      });
    }

    // ... outras recomendações baseadas em regras

    return recommendations;
  };

  // Função para gerar análise com Gemini
  const generateDetailedAnalysis = async () => {
    try {
      setIsGeneratingInsights(true);
      
      if (!dashboardData) {
        throw new Error('Dados do dashboard não disponíveis');
      }

      const formattedData = formatInitialData(dashboardData);
      setSmartMetrics(formattedData.metrics);
      setDetailedInsights(formattedData.insights);
      setRecommendations(formattedData.recommendations);

      // Gerar análise com IA apenas se houver dados suficientes
      if (Object.keys(formattedData.metrics).length > 0) {
        await generateAIAnalysis(dashboardData);
      }

    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao gerar análise do dashboard');
    } finally {
      setIsGeneratingInsights(false);
    }
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

  // Efeito para análise inicial
  useEffect(() => {
    if (dashboardData && Object.keys(dashboardData).length > 0) {
      generateDetailedAnalysis();
    }
  }, [dashboardData]);

  // Efeito para calcular KPIs
  useEffect(() => {
    if (dashboardData && typeof dashboardData === 'object') {
      try {
        const calculatedKpis = calculateKPIs(dashboardData);
        setKpis(calculatedKpis);
      } catch (error) {
        console.error('Erro ao calcular KPIs:', error);
        setKpis(calculateKPIs(null));
      }
    }
  }, [dashboardData, timeRange]);

  return {
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