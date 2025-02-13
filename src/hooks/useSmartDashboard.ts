import { useState, useEffect, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

type SmartMetric = {
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  insight: string;
  prediction?: number;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  historicalTrend: number[];
  relatedMetrics: string[];
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
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction';
  confidence: number;
  relatedMetrics: string[];
  visualization?: 'line' | 'bar' | 'radar';
  data?: any;
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

type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const useSmartDashboard = (dashboardData: any) => {
  const [smartMetrics, setSmartMetrics] = useState<Record<string, SmartMetric>>({});
  const [activeFilters, setActiveFilters] = useState<SmartFilter[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [detailedInsights, setDetailedInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [kpis, setKpis] = useState<DashboardMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

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

  // Análise detalhada modificada
  const generateDetailedAnalysis = async () => {
    setIsGeneratingInsights(true);
    try {
      // Primeiro, processa os dados localmente
      const initialAnalysis = formatInitialData(dashboardData);
      
      // Atualiza estados com dados iniciais
      setSmartMetrics(initialAnalysis.metrics);
      setRecommendations(initialAnalysis.recommendations);
      setDetailedInsights(initialAnalysis.insights);
      
      // Depois, enriquece com IA
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `Analise estes dados e sugira insights adicionais:
      ${JSON.stringify(initialAnalysis, null, 2)}
      
      Mantenha o formato existente e adicione:
      1. Novos insights relevantes
      2. Recomendações específicas
      3. Correlações interessantes
      4. Previsões futuras`;

      const result = await model.generateContent(prompt);
      const aiAnalysis = JSON.parse(result.response.text());

      // Combina dados iniciais com insights da IA
      setDetailedInsights([...initialAnalysis.insights, ...(aiAnalysis.insights || [])]);
      setRecommendations([...initialAnalysis.recommendations, ...(aiAnalysis.recommendations || [])]);

    } catch (error) {
      console.error('Erro na análise:', error);
      // Em caso de erro, mantém os dados iniciais
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Gerar filtros dinâmicos baseados na análise
  const generateDynamicFilters = (analysis: any) => {
    const filters: SmartFilter[] = [];
    
    // Adicionar filtros baseados em padrões detectados
    if (analysis?.patterns) {
      Object.entries(analysis.patterns).forEach(([key, value]: [string, any]) => {
        if (value?.label && Array.isArray(value?.categories)) {
          filters.push({
            id: `pattern_${key}`,
            label: value.label,
            type: 'category',
            options: value.categories,
            value: 'all'
          });
        }
      });
    }

    // Adicionar filtros de performance
    filters.push({
      id: 'performance',
      label: 'Performance',
      type: 'performance',
      options: ['Alta', 'Média', 'Baixa'],
      value: 'all'
    });

    return filters;
  };

  // Obter insights específicos por categoria
  const getInsightsByCategory = (category: string) => {
    if (!detailedInsights || !Array.isArray(detailedInsights)) {
      return [];
    }
    return detailedInsights.filter(insight => 
      insight?.relatedMetrics?.includes(category)
    );
  };

  // Priorizar recomendações
  const getPrioritizedRecommendations = () => {
    if (!recommendations || !Array.isArray(recommendations)) {
      return [];
    }
    
    // Remover duplicatas usando Set e id como chave
    const uniqueRecommendations = Array.from(
      new Map(recommendations.map(rec => [rec.id, rec])).values()
    );
    
    // Ordenar por prioridade
    return uniqueRecommendations
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 5); // Limitar a 5 recomendações mais prioritárias
  };

  // Aplica filtros inteligentes aos dados
  const getFilteredData = (data: any) => {
    return activeFilters.reduce((filtered, filter) => {
      if (filter.value === 'all') return filtered;

      switch (filter.type) {
        case 'performance':
          return filtered.filter((item: any) => 
            getPerformanceCategory(item) === filter.value
          );
        case 'status':
          return filtered.filter((item: any) => 
            getActivityStatus(item) === filter.value
          );
        case 'trend':
          return filtered.filter((item: any) => 
            getTrendCategory(item) === filter.value
          );
        default:
          return filtered;
      }
    }, data);
  };

  // Funções auxiliares para categorização
  const getPerformanceCategory = (item: any) => {
    // Lógica para categorizar performance
    return 'Alta';
  };

  const getActivityStatus = (item: any) => {
    // Lógica para determinar status de atividade
    return 'Ativo';
  };

  const getTrendCategory = (item: any) => {
    // Lógica para categorizar tendência
    return 'Crescente';
  };

  // Função para calcular KPIs
  const calculateKPIs = (data: any): DashboardMetrics => {
    // Verificar se os dados existem
    if (!data) {
      return {
        conversion: {
          value: 0,
          trend: 'stable',
          percentage: 0,
          previousValue: 0,
          status: 'warning',
          history: [],
          forecast: [],
          totalQuotes: 0,
          convertedQuotes: 0
        },
        responseTime: {
          value: 0,
          trend: 'stable',
          percentage: 0,
          previousValue: 0,
          status: 'warning',
          history: [],
          forecast: [],
          averageTime: 0,
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
          previousValue: 0,
          status: 'warning',
          history: [],
          forecast: [],
          totalRatings: 0,
          averageRating: 0,
          ratingDistribution: {}
        },
        projectCompletion: {
          value: 0,
          trend: 'stable',
          percentage: 0,
          previousValue: 0,
          status: 'warning',
          history: [],
          forecast: [],
          totalProjects: 0,
          completedProjects: 0,
          onTimeCompletion: 0
        }
      };
    }

    // Cálculo da taxa de conversão com verificações de segurança
    const conversionRate = {
      value: calculateConversionRate(data.quotes || [], data.projects || []),
      trend: determineTrend(data.conversionHistory || []),
      percentage: calculateGrowthPercentage(data.conversionHistory || []),
      previousValue: data.conversionHistory?.[data.conversionHistory?.length - 2] || 0,
      status: determineStatus('conversion', data.conversionRate || 0),
      history: data.conversionHistory || [],
      forecast: predictValues(data.conversionHistory || []),
      totalQuotes: data.quotes?.length || 0,
      convertedQuotes: (data.projects || []).filter((p: any) => p.created_from_quote).length || 0
    };

    // Cálculo do tempo de resposta com verificações de segurança
    const responseTime = {
      value: calculateAverageResponseTime(data.messages || []),
      trend: determineTrend(data.responseTimeHistory || []),
      percentage: calculateGrowthPercentage(data.responseTimeHistory || []),
      previousValue: data.responseTimeHistory?.[data.responseTimeHistory?.length - 2] || 0,
      status: determineStatus('responseTime', data.averageResponseTime || 0),
      history: data.responseTimeHistory || [],
      forecast: predictValues(data.responseTimeHistory || []),
      averageTime: calculateAverageResponseTime(data.messages || []),
      responseDistribution: calculateResponseDistribution(data.messages || [])
    };

    return {
      conversion: conversionRate,
      responseTime,
      satisfaction: calculateSatisfaction(data),
      projectCompletion: calculateProjectCompletion(data)
    };
  };

  // Funções auxiliares
  const calculateConversionRate = (quotes: any[], projects: any[]): number => {
    if (!quotes?.length) return 0;
    const convertedQuotes = projects?.filter(p => p.created_from_quote)?.length || 0;
    return (convertedQuotes / quotes.length) * 100;
  };

  const calculateAverageResponseTime = (messages: any[]): number => {
    if (!messages?.length) return 0;
    const responseTimes = messages
      .filter(m => m.first_response_time)
      .map(m => m.first_response_time);
    return responseTimes.reduce((acc, time) => acc + time, 0) / responseTimes.length;
  };

  const calculateResponseDistribution = (messages: any[]) => {
    const distribution = {
      under1h: 0,
      under24h: 0,
      over24h: 0
    };

    messages?.forEach(msg => {
      const responseTime = msg.first_response_time;
      if (responseTime <= 60) distribution.under1h++;
      else if (responseTime <= 1440) distribution.under24h++;
      else distribution.over24h++;
    });

    return distribution;
  };

  const predictValues = (history: number[], periods: number = 3): number[] => {
    if (!history?.length) return [];
    
    // Implementação simples de previsão linear
    const growth = history.reduce((acc, val, i) => {
      if (i === 0) return acc;
      return acc + (val - history[i - 1]);
    }, 0) / (history.length - 1);

    const lastValue = history[history.length - 1];
    return Array(periods).fill(0).map((_, i) => lastValue + (growth * (i + 1)));
  };

  // Funções auxiliares
  const determineTrend = (history: number[]): 'up' | 'down' | 'stable' => {
    if (!history || history.length < 2) return 'stable';
    
    const lastValue = history[history.length - 1];
    const previousValue = history[history.length - 2];
    
    if (lastValue > previousValue) return 'up';
    if (lastValue < previousValue) return 'down';
    return 'stable';
  };

  const determineStatus = (metric: string, value: number): 'good' | 'warning' | 'critical' => {
    const thresholds = {
      conversion: { warning: 20, critical: 10 },
      responseTime: { warning: 120, critical: 240 }, // em minutos
      satisfaction: { warning: 4.0, critical: 3.0 },
      projectCompletion: { warning: 70, critical: 50 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (metric === 'responseTime') {
      return value > threshold.critical ? 'critical' 
           : value > threshold.warning ? 'warning' 
           : 'good';
    }

    return value < threshold.critical ? 'critical' 
         : value < threshold.warning ? 'warning' 
         : 'good';
  };

  const calculateSatisfaction = (data: any) => {
    return {
      value: data.ratings?.average || 0,
      trend: determineTrend(data.ratingHistory || []),
      percentage: calculateGrowthPercentage(data.ratingHistory || []),
      previousValue: data.ratingHistory?.[data.ratingHistory?.length - 2] || 0,
      status: determineStatus('satisfaction', data.ratings?.average || 0),
      history: data.ratingHistory || [],
      forecast: predictValues(data.ratingHistory || []),
      totalRatings: data.ratings?.total || 0,
      averageRating: data.ratings?.average || 0,
      ratingDistribution: data.ratings?.distribution || {}
    };
  };

  const calculateProjectCompletion = (data: any) => {
    const totalProjects = data.projects?.length || 0;
    const completedProjects = data.projects?.filter((p: any) => p.status === 'done')?.length || 0;
    const completionRate = totalProjects ? (completedProjects / totalProjects) * 100 : 0;
    const onTimeProjects = data.projects?.filter((p: any) => 
      p.status === 'done' && new Date(p.completed_at) <= new Date(p.due_date)
    )?.length || 0;

    return {
      value: completionRate,
      trend: determineTrend(data.completionHistory || []),
      percentage: calculateGrowthPercentage(data.completionHistory || []),
      previousValue: data.completionHistory?.[data.completionHistory?.length - 2] || 0,
      status: determineStatus('projectCompletion', completionRate),
      history: data.completionHistory || [],
      forecast: predictValues(data.completionHistory || []),
      totalProjects,
      completedProjects,
      onTimeCompletion: totalProjects ? (onTimeProjects / totalProjects) * 100 : 0
    };
  };

  // Efeito para análise inicial
  useEffect(() => {
    if (dashboardData && Object.keys(dashboardData).length > 0) {
      generateDetailedAnalysis();
    }
  }, [dashboardData]);

  // Efeito para calcular KPIs com verificação adicional
  useEffect(() => {
    if (dashboardData && typeof dashboardData === 'object') {
      try {
        const calculatedKpis = calculateKPIs(dashboardData);
        setKpis(calculatedKpis);
      } catch (error) {
        console.error('Erro ao calcular KPIs:', error);
        // Define valores padrão em caso de erro
        setKpis(calculateKPIs(null));
      }
    }
  }, [dashboardData, timeRange]);

  return {
    smartMetrics,
    insights: detailedInsights,
    recommendations: getPrioritizedRecommendations(),
    activeFilters,
    setActiveFilters,
    isAnalyzing: isGeneratingInsights,
    getFilteredData,
    refreshAnalysis: generateDetailedAnalysis,
    getInsightsByCategory,
    isGeneratingInsights,
    kpis,
    timeRange,
    setTimeRange,
    // Funções auxiliares
    determineTrend,
    determineStatus,
    calculateGrowthPercentage,
    predictValues
  };
}; 