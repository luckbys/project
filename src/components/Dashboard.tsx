import { useSmartDashboard } from '../hooks/useSmartDashboard';
import { 
  BarChart2, TrendingUp, AlertTriangle, RefreshCw,
  ArrowUp, ArrowDown, Minus, Sparkles, Activity,
  Lightbulb, Target, Zap, Clock, CheckCircle, Star,
  Users, Award, MessageSquare, Calendar, AlertCircle,
  Filter, FolderKanban, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, BarChart, RadarChart, createChartData, chartColors } from './charts';
import AIChat from './AIChat';
import { useState, useEffect, useMemo } from 'react';

// Adicionar tipo para Insight
type InsightType = {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'pattern';
  visualization?: 'line' | 'bar' | 'radar';
  data?: {
    labels: string[];
    values: number[];
  };
};

// Adicionar função getInsightStyle
const getInsightStyle = (type: string): string => {
  const styles = {
    trend: 'border-blue-500 bg-blue-50',
    anomaly: 'border-red-500 bg-red-50',
    correlation: 'border-purple-500 bg-purple-50',
    pattern: 'border-green-500 bg-green-50'
  };
  return styles[type as keyof typeof styles] || 'border-gray-500 bg-gray-50';
};

// Adicionar função getImpactStyle
const getImpactStyle = (impact: string): string => {
  const styles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };
  return styles[impact as keyof typeof styles] || 'bg-gray-100 text-gray-700';
};

// Atualizar o tipo das props do Dashboard
type DashboardProps = {
  data: {
    totalMessages: number;
    unreadMessages: number;
    totalProjects: number;
    totalSkills: number;
    messagesByMonth: { month: string; count: number; }[];
    projectsByCategory: { category: string; count: number; }[];
    recentMessages: any[];
    recentProjects: any[];
    projects: {
      id: string;
      title: string;
      status: 'planning' | 'in_progress' | 'review' | 'done';
      priority: 'low' | 'medium' | 'high';
      progress: number;
      startDate: string;
      dueDate: string;
      team: string[];
      tasks: {
        id: string;
        title: string;
        completed: boolean;
        dueDate: string;
      }[];
    }[];
  };
};

// Definir interfaces
interface KPICardProps {
  title: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
  percentage?: number;
  icon: React.ReactNode;
  details: string[];
  bgColor: string;
  textColor: string;
  progress?: number;
}

interface TrendBadgeProps {
  trend?: 'up' | 'down' | 'stable';
  percentage?: number;
}

// Adicionar tipos para KPIs
type KPI = {
  value?: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  goal?: number;
};

type KPIs = {
  conversion: KPI;
  engagement: KPI;
  retention: KPI;
  revenue: KPI;
};

// Adicionar funções auxiliares
const getKPIColor = (key: string): string => {
  const colors = {
    conversion: 'bg-blue-100 text-blue-600',
    engagement: 'bg-green-100 text-green-600',
    retention: 'bg-purple-100 text-purple-600',
    revenue: 'bg-orange-100 text-orange-600'
  };
  return colors[key as keyof typeof colors] || 'bg-gray-100 text-gray-600';
};

const getKPIIcon = (key: string): JSX.Element => {
  const icons = {
    conversion: <TrendingUp className="w-5 h-5" />,
    engagement: <Users className="w-5 h-5" />,
    retention: <Activity className="w-5 h-5" />,
    revenue: <BarChart2 className="w-5 h-5" />
  };
  return icons[key as keyof typeof icons] || <Activity className="w-5 h-5" />;
};

const getKPILabel = (key: string): string => {
  const labels = {
    conversion: 'Taxa de Conversão',
    engagement: 'Engajamento',
    retention: 'Retenção',
    revenue: 'Receita'
  };
  return labels[key as keyof typeof labels] || key;
};

const formatKPIValue = (key: string, value: number | undefined): string => {
  if (value === undefined || value === null) return '0';
  
  switch (key) {
    case 'conversion':
      return `${value.toFixed(1)}%`;
    case 'revenue':
      return `R$ ${value.toLocaleString()}`;
    default:
      return value.toLocaleString();
  }
};

const getProgressColor = (progress: number): string => {
  if (progress >= 0.9) return 'bg-green-500';
  if (progress >= 0.7) return 'bg-yellow-500';
  return 'bg-red-500';
};

// Adicionar componente de filtro de período
const TimeRangeFilter = ({ timeRange, setTimeRange }: { 
  timeRange: string, 
  setTimeRange: (range: string) => void 
}) => (
  <div className="relative inline-block">
    <select
      value={timeRange}
      onChange={(e) => setTimeRange(e.target.value)}
      className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="7d">Últimos 7 dias</option>
      <option value="30d">Últimos 30 dias</option>
      <option value="90d">Últimos 90 dias</option>
      <option value="1y">Último ano</option>
    </select>
    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
  </div>
);

const Dashboard = ({ data }: DashboardProps) => {
  const {
    smartMetrics,
    insights,
    recommendations,
    activeFilters,
    setActiveFilters,
    isAnalyzing,
    refreshAnalysis,
    kpis,
    timeRange,
    setTimeRange
  } = useSmartDashboard(data);

  const [activeTab, setActiveTab] = useState<'insights' | 'recommendations'>('insights');

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Valores padrão para kpis
  const defaultKPIs: KPIs = {
    conversion: { value: 0, trend: 'stable', percentage: 0 },
    engagement: { value: 0, trend: 'stable', percentage: 0 },
    retention: { value: 0, trend: 'stable', percentage: 0 },
    revenue: { value: 0, trend: 'stable', percentage: 0 }
  };

  // Garantir que kpis existe e tem os valores necessários
  const safeKPIs = useMemo(() => {
    if (!kpis) return defaultKPIs;
    
    return {
      conversion: { ...defaultKPIs.conversion, ...kpis.conversion },
      engagement: { ...defaultKPIs.engagement, ...kpis.engagement },
      retention: { ...defaultKPIs.retention, ...kpis.retention },
      revenue: { ...defaultKPIs.revenue, ...kpis.revenue }
    };
  }, [kpis]);

  const renderVisualization = (insight: InsightType) => {
    // Criar dados do gráfico baseado no tipo
    const chartData = createChartData(
      insight.data?.labels || [],
      insight.data?.values || [],
      insight.title,
      chartColors[insight.type === 'trend' ? 'blue' : 
                  insight.type === 'anomaly' ? 'red' : 
                  insight.type === 'correlation' ? 'purple' : 
                  'green']
    );

    switch (insight.visualization) {
      case 'line':
        return <LineChart data={chartData} />;
      case 'bar':
        return <BarChart data={chartData} />;
      case 'radar':
        return <RadarChart data={chartData} />;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className="space-y-8 relative p-6 bg-gray-50"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header com Filtros e Estatísticas Rápidas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
          <p className="text-gray-600 mt-1">Acompanhe suas métricas principais</p>
        </div>
        
        <div className="flex items-center gap-4">
          <TimeRangeFilter timeRange={timeRange} setTimeRange={setTimeRange} />
          
          <button
            onClick={refreshAnalysis}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isAnalyzing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* KPIs em Cards Interativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(safeKPIs).map(([key, kpi]) => (
          <motion.div
            key={key}
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${getKPIColor(key)}`}>
                {getKPIIcon(key)}
              </div>
              <TrendBadge trend={kpi.trend} percentage={kpi.percentage} />
            </div>
            
            <h3 className="text-gray-600 mb-1">{getKPILabel(key)}</h3>
            <div className="text-3xl font-bold mb-2">
              {formatKPIValue(key, kpi.value)}
            </div>
            
            {/* Barra de Progresso */}
            {kpi.goal && kpi.value !== undefined && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progresso</span>
                  <span className="font-medium">
                    {Math.round((kpi.value / kpi.goal) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getProgressColor(kpi.value / kpi.goal)}`}
                    style={{ width: `${Math.min((kpi.value / kpi.goal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Seção de Insights e Recomendações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <motion.div 
          className="bg-white rounded-xl p-6 shadow-sm"
          variants={itemVariants}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insights
            </h3>
            <span className="text-sm text-gray-500">
              {insights.length} descobertas
            </span>
          </div>
          
          <div className="space-y-4">
            {insights.map((insight: InsightType, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${getInsightStyle(insight.type)}`}
              >
                <h4 className="font-medium mb-2">{insight.title}</h4>
                <p className="text-gray-600 text-sm">{insight.description}</p>
                {insight.visualization && (
                  <div className="mt-4 h-40">
                    {renderVisualization(insight)}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recomendações */}
        <motion.div 
          className="bg-white rounded-xl p-6 shadow-sm"
          variants={itemVariants}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Recomendações
            </h3>
            <span className="text-sm text-gray-500">
              {recommendations.length} ações sugeridas
            </span>
          </div>
          
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{rec.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${getImpactStyle(rec.impact)}`}>
                    {rec.impact.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{rec.description}</p>
                <div className="flex flex-wrap gap-2">
                  {rec.steps.map((step, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-white rounded-full border">
                      {step}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Assistente IA */}
      <AIChat 
        dashboardStats={data}
        aboutMe={null}
        messages={data.recentMessages}
        user={null}
      />
    </motion.div>
  );
};

// Componente TrendBadge
const TrendBadge = ({ trend, percentage }: TrendBadgeProps) => {
  if (!trend || typeof percentage === 'undefined') return null;

  const config = {
    up: {
      icon: <ArrowUp className="w-4 h-4" />,
      classes: 'bg-green-100 text-green-600'
    },
    down: {
      icon: <ArrowDown className="w-4 h-4" />,
      classes: 'bg-red-100 text-red-600'
    },
    stable: {
      icon: <Minus className="w-4 h-4" />,
      classes: 'bg-gray-100 text-gray-600'
    }
  };

  const { icon, classes } = config[trend];

  return (
    <div className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${classes}`}>
      {icon}
      <span>{percentage}%</span>
    </div>
  );
};

// Componente KPICard
const KPICard = ({ key, kpi }: { key: string, kpi: KPI }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${getKPIColor(key)}`}>
        {getKPIIcon(key)}
      </div>
      <TrendBadge trend={kpi.trend} percentage={kpi.percentage} />
    </div>
    
    <h3 className="text-gray-600 mb-1">{getKPILabel(key)}</h3>
    <div className="text-3xl font-bold mb-2">
      {formatKPIValue(key, kpi.value)}
    </div>
    
    {/* Barra de Progresso */}
    {kpi.goal && kpi.value !== undefined && (
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progresso</span>
          <span className="font-medium">
            {Math.round((kpi.value / kpi.goal) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${getProgressColor(kpi.value / kpi.goal)}`}
            style={{ width: `${Math.min((kpi.value / kpi.goal) * 100, 100)}%` }}
          />
        </div>
      </div>
    )}
  </motion.div>
);

export default Dashboard; 