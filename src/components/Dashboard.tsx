import { useSmartDashboard } from '../hooks/useSmartDashboard';
import { 
  BarChart2, TrendingUp, AlertTriangle, RefreshCw,
  ArrowUp, ArrowDown, Minus, Sparkles, Activity,
  Lightbulb, Target, Zap, Clock, CheckCircle, Star,
  Users, Award, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, BarChart, RadarChart, createChartData, chartColors } from './charts';
import AIChat from './AIChat';
import { useState } from 'react';

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

const Dashboard = ({ data }: DashboardProps) => {
  const {
    smartMetrics = {},
    insights = [],
    activeFilters = [],
    setActiveFilters,
    isAnalyzing = false,
    getFilteredData,
    refreshAnalysis,
    recommendations = [],
    detailedInsights = [],
    getInsightsByCategory,
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

  const renderVisualization = (insight: AIInsight) => {
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
      {/* Header com Clock */}
      <div className="flex justify-between items-start mb-8">
        <motion.div variants={itemVariants} className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Visão geral do seu negócio</p>
        </motion.div>
        <Clock 
          totalProjects={data.totalProjects}
          activeProjects={data.recentProjects?.filter(p => p.status === 'in_progress').length || 0}
          lastActivity={data.recentMessages?.[0]?.created_at}
          notifications={data.unreadMessages}
        />
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium">Mensagens Hoje</span>
          </div>
          <div className="text-2xl font-bold">
            {data.messagesByMonth[data.messagesByMonth.length - 1]?.count || 0}
          </div>
        </motion.div>
        {/* Adicionar mais cards de métricas rápidas */}
      </div>

      {/* KPIs Principais com Layout Melhorado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Engajamento"
          value={kpis?.conversion.value}
          trend={kpis?.conversion.trend}
          percentage={kpis?.conversion.percentage}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          details={[
            `${kpis?.conversion.convertedQuotes} conversões`,
            `Meta: ${kpis?.conversion.goal || 0}%`
          ]}
          bgColor="from-blue-50 to-blue-100"
          textColor="text-blue-600"
          progress={kpis?.conversion.value}
        />
        <KPICard
          title="Tempo Resposta"
          value={kpis?.responseTime.averageTime}
          trend={kpis?.responseTime.trend}
          percentage={kpis?.responseTime.percentage}
          icon={<Clock className="w-6 h-6 text-purple-600" />}
          details={[`${kpis?.responseTime.responseDistribution.under1h}% < 1h`]}
          bgColor="from-purple-50 to-purple-100"
          textColor="text-purple-600"
        />
        <KPICard
          title="Satisfação"
          value={kpis?.satisfaction.value}
          trend={kpis?.satisfaction.trend}
          percentage={kpis?.satisfaction.percentage}
          icon={<Target className="w-6 h-6 text-green-600" />}
          details={[`${kpis?.satisfaction.totalRatings} avaliações`]}
          bgColor="from-green-50 to-green-100"
          textColor="text-green-600"
        />
        <KPICard
          title="Performance"
          value={kpis?.projectCompletion.value}
          trend={kpis?.projectCompletion.trend}
          percentage={kpis?.projectCompletion.percentage}
          icon={<Award className="w-6 h-6 text-orange-600" />}
          details={[`${kpis?.projectCompletion.completedProjects} concluídos`]}
          bgColor="from-orange-50 to-orange-100"
          textColor="text-orange-600"
        />
      </div>

      {/* Gráficos com Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Análise Temporal</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
              Diário
            </button>
            <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
              Semanal
            </button>
            <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
              Mensal
            </button>
          </div>
        </div>
        <div className="h-80">
          <LineChart 
            data={createChartData(
              data.messagesByMonth.map(m => m.month),
              data.messagesByMonth.map(m => m.count),
              'Mensagens por Período',
              chartColors.blue
            )} 
          />
        </div>
      </div>

      {/* Insights e Recomendações em Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Insights & Recomendações</h3>
          <div className="flex gap-2">
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'insights' 
                  ? 'bg-purple-50 text-purple-600' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('insights')}
            >
              Insights
            </button>
            <button 
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'recommendations' 
                  ? 'bg-purple-50 text-purple-600' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('recommendations')}
            >
              Recomendações
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'insights' ? (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {detailedInsights?.map((insight, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-purple-700">{insight.title}</h4>
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded-full">
                        {insight.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                    {insight.visualization && (
                      <div className="h-32 mt-4">
                        {renderVisualization(insight)}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="recommendations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {recommendations?.map((rec, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-blue-700">{rec.title}</h4>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rec.impact === 'high' ? 'bg-red-100 text-red-600' :
                          rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          Impacto: {rec.impact}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                    <div className="space-y-2">
                      {rec.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            {i + 1}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AnimatePresence>
          {Object.entries(smartMetrics || {}).map(([key, metric], index) => (
            <motion.div
              key={key}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                  metric.trend === 'up' ? 'bg-green-100 text-green-600' :
                  metric.trend === 'down' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {metric.trend === 'up' ? <ArrowUp className="w-4 h-4" /> :
                   metric.trend === 'down' ? <ArrowDown className="w-4 h-4" /> :
                   <Minus className="w-4 h-4" />}
                  {metric.percentage}%
                </span>
              </div>
              <h4 className="text-gray-600 mb-2">{key}</h4>
              <div className="text-3xl font-bold mb-3">{metric.value}</div>
              <p className="text-sm text-gray-500">{metric.insight}</p>
              {metric.prediction && (
                <motion.div 
                  className="mt-4 pt-4 border-t"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">Previsão (30 dias)</span>
                  </div>
                  <div className="text-xl font-semibold text-blue-600">
                    {metric.prediction}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Alertas e Anomalias */}
      {smartMetrics?.anomalies && smartMetrics.anomalies.length > 0 && (
        <motion.div 
          className="bg-orange-50 border border-orange-200 rounded-xl p-6"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-orange-700">
              Alertas e Anomalias
            </h3>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {smartMetrics.anomalies?.map((anomaly, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white/50 rounded-lg"
                >
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <p className="text-orange-700">{anomaly}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recomendações Prioritárias */}
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold">Recomendações Prioritárias</h3>
          </div>
          <div className="space-y-4">
            <AnimatePresence>
              {recommendations?.map((rec) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-purple-700">{rec.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        rec.impact === 'high' ? 'bg-red-100 text-red-600' :
                        rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        Impacto: {rec.impact}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        rec.effort === 'high' ? 'bg-red-100 text-red-600' :
                        rec.effort === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        Esforço: {rec.effort}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                  <div className="space-y-2">
                    {rec.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* AIChat */}
      <AIChat 
        dashboardStats={{
          totalMessages: data.totalMessages,
          unreadMessages: data.unreadMessages,
          totalProjects: data.totalProjects,
          totalSkills: data.totalSkills,
          messagesByMonth: data.messagesByMonth,
          projectsByCategory: data.projectsByCategory
        }}
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
const KPICard = ({ 
  title, 
  value, 
  trend, 
  percentage, 
  icon, 
  details,
  bgColor,
  textColor,
  progress
}: KPICardProps) => {
  return (
    <motion.div
      className={`bg-gradient-to-br ${bgColor} rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-white rounded-lg">
          {icon}
        </div>
        <TrendBadge trend={trend} percentage={percentage} />
      </div>
      <h4 className={`${textColor} font-medium mb-2`}>{title}</h4>
      <div className={`text-3xl font-bold ${textColor} mb-3`}>
        {typeof value === 'number' ? value.toLocaleString() : '-'}
      </div>
      <div className="space-y-1">
        {details.map((detail, i) => (
          <div key={i} className="text-sm text-gray-600">
            {detail}
          </div>
        ))}
      </div>
      
      {progress !== undefined && (
        <div className="mt-4 w-full bg-white/50 rounded-full h-2">
          <div 
            className={`h-full rounded-full ${textColor.replace('text', 'bg')}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default Dashboard; 