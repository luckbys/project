import { useSmartDashboard } from '../hooks/useSmartDashboard';
import { 
  BarChart2, TrendingUp, AlertTriangle, RefreshCw,
  ArrowUp, ArrowDown, Minus, Sparkles, Activity,
  Lightbulb, Target, Zap, Clock, CheckCircle, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, BarChart, RadarChart, createChartData, chartColors } from './charts';

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
  chart?: React.ReactNode;
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
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Seletor de Período */}
      <div className="flex justify-end">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="day">Hoje</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mês</option>
          <option value="quarter">Este Trimestre</option>
          <option value="year">Este Ano</option>
        </select>
      </div>

      {/* Filtros Inteligentes */}
      <motion.div 
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold">Filtros Inteligentes</h3>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshAnalysis}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Atualizar Análise
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeFilters?.map(filter => (
            <motion.div 
              key={filter.id}
              variants={itemVariants}
              className="bg-gray-50 p-4 rounded-lg border border-gray-100"
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {filter.label}
              </label>
              <select
                value={filter.value}
                onChange={e => {
                  const newFilters = activeFilters.map(f =>
                    f.id === filter.id ? { ...f, value: e.target.value } : f
                  );
                  setActiveFilters(newFilters);
                }}
                className="w-full px-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="all">Todos</option>
                {filter.options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Taxa de Conversão */}
        <KPICard
          title="Taxa de Conversão"
          value={kpis?.conversion.value}
          trend={kpis?.conversion.trend}
          percentage={kpis?.conversion.percentage}
          icon={<TrendingUp />}
          details={[
            `${kpis?.conversion.convertedQuotes} de ${kpis?.conversion.totalQuotes} orçamentos`
          ]}
          chart={<LineChart data={createChartData(kpis?.conversion.history)} />}
        />

        {/* Tempo de Resposta */}
        <KPICard
          title="Tempo Médio de Resposta"
          value={kpis?.responseTime.averageTime}
          trend={kpis?.responseTime.trend}
          percentage={kpis?.responseTime.percentage}
          icon={<Clock />}
          details={[
            `${kpis?.responseTime.responseDistribution.under1h}% em < 1h`,
            `${kpis?.responseTime.responseDistribution.under24h}% em < 24h`
          ]}
          chart={<LineChart data={createChartData(kpis?.responseTime.history)} />}
        />

        {/* ... outros KPIs ... */}
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

      {/* Insights da IA */}
      <motion.div 
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        variants={itemVariants}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Insights da IA</h3>
        </div>
        <div className="space-y-4">
          <AnimatePresence>
            {detailedInsights?.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800">{insight.title}</h4>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                    {insight.confidence}% confiança
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                {insight.visualization && (
                  <div className="h-40 mt-4">
                    {renderVisualization(insight)}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {insight.relatedMetrics.map((metric, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Alertas e Anomalias */}
      {smartMetrics?.anomalies && smartMetrics.anomalies.length > 0 && (
        <motion.div 
          className="bg-orange-50 border border-orange-200 rounded-xl p-6"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
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
              <Lightbulb className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold">Recomendações Prioritárias</h3>
          </div>
          <div className="space-y-4">
            <AnimatePresence>
              {recommendations?.slice(0, 5).map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
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

        {/* Insights Detalhados */}
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold">Insights Detalhados</h3>
          </div>
          <div className="space-y-4">
            <AnimatePresence>
              {detailedInsights?.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-700">{insight.title}</h4>
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-600">
                      Confiança: {insight.confidence}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  {insight.visualization && (
                    <div className="h-40 mt-4">
                      {renderVisualization(insight)}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
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
  chart 
}: KPICardProps) => {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg p-6"
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            {icon}
          </div>
          <h3 className="font-medium text-gray-700">{title}</h3>
        </div>
        <TrendBadge trend={trend} percentage={percentage} />
      </div>

      <div className="text-3xl font-bold mb-4">
        {typeof value === 'number' ? value.toLocaleString() : '-'}
      </div>

      <div className="space-y-2 mb-4">
        {details.map((detail, i) => (
          <div key={i} className="text-sm text-gray-500">
            {detail}
          </div>
        ))}
      </div>

      {chart && (
        <div className="h-32">
          {chart}
        </div>
      )}
    </motion.div>
  );
};

export default Dashboard; 