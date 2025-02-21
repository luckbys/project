import { useState } from 'react';
import { 
  Activity, Clock, TrendingUp, DollarSign,
  RefreshCw, Lightbulb, Target
} from 'lucide-react';
import { LineChart, BarChart } from './charts';

type DashboardProps = {
  data: {
    totalMessages: number;
    unreadMessages: number;
    totalProjects: number;
    messagesByMonth: { month: string; count: number; }[];
    projectsByCategory: { category: string; count: number; }[];
    quotes?: {
      id: string;
      status: string;
      total?: number;
    }[];
  };
};

const Dashboard = ({ data }: DashboardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');

  // Métricas básicas
  const metrics = [
    {
      title: 'Total de Projetos',
      value: data?.totalProjects || 0,
      icon: <Activity className="w-6 h-6" />,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      title: 'Mensagens Não Lidas',
      value: data?.unreadMessages || 0,
      icon: <Clock className="w-6 h-6" />,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Taxa de Resposta',
      value: data?.totalMessages ? 
        `${Math.round((1 - data.unreadMessages / data.totalMessages) * 100)}%` : '0%',
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      title: 'Orçamentos Aprovados',
      value: data?.quotes?.filter(q => q.status === 'approved')?.length || 0,
      subtext: 'Total: R$ ' + (data?.quotes
        ?.filter(q => q.status === 'approved')
        ?.reduce((acc, q) => acc + (q.total || 0), 0)
        ?.toLocaleString('pt-BR') || '0'),
      icon: <DollarSign className="w-6 h-6" />,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    }
  ];

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      // Implementar lógica de atualização
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Visão geral do seu negócio</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2"
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="1y">1 ano</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <div className={metric.textColor}>{metric.icon}</div>
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-1">{metric.title}</h3>
            <div className="text-2xl font-bold mb-1">{metric.value}</div>
            {metric.subtext && (
              <div className="text-sm text-gray-500">{metric.subtext}</div>
            )}
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mensagens */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Mensagens por Período</h3>
          <div className="h-64">
            <LineChart 
              data={{
                labels: data?.messagesByMonth?.map(m => m.month) || [],
                datasets: [{
                  label: 'Mensagens',
                  data: data?.messagesByMonth?.map(m => m.count) || [],
                  borderColor: '#3B82F6',
                  backgroundColor: '#3B82F620'
                }]
              }}
            />
          </div>
        </div>

        {/* Projetos */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Projetos por Categoria</h3>
          <div className="h-64">
            <BarChart 
              data={{
                labels: data?.projectsByCategory?.map(p => p.category) || [],
                datasets: [{
                  label: 'Projetos',
                  data: data?.projectsByCategory?.map(p => p.count) || [],
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
                }]
              }}
            />
          </div>
        </div>
      </div>

      {/* Insights e Recomendações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Insights
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
              <h4 className="font-medium mb-1">Aumento no Engajamento</h4>
              <p className="text-sm text-gray-600">
                Houve um aumento de 15% nas interações este mês.
              </p>
            </div>
          </div>
        </div>

        {/* Recomendações */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-500" />
            Recomendações
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50">
              <h4 className="font-medium mb-2">Otimizar Respostas</h4>
              <p className="text-sm text-gray-600">
                Considere implementar respostas automáticas para perguntas frequentes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 