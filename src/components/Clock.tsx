import { useState, useEffect } from 'react';

interface ClockProps {
  totalProjects: number;
  activeProjects: number;
  lastActivity?: string;
  notifications?: number;
}

const Clock = ({ totalProjects, activeProjects, lastActivity, notifications = 0 }: ClockProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  const formatLastActivity = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Nenhuma atividade recente';
    
    try {
      const date = new Date(timestamp);
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }

      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Agora mesmo';
      if (diffMinutes < 60) return `${diffMinutes} minutos atrás`;
      if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
      }
      if (diffMinutes < 10080) { // 7 dias
        const days = Math.floor(diffMinutes / 1440);
        return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
      }

      return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  return (
    <div className="flex flex-col items-end">
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-4 backdrop-blur-lg border border-white/30">
        <div className="flex items-center gap-4">
          {/* Tempo */}
          <div>
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-mono">
              {time.toLocaleTimeString('pt-BR')}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {formatDate(time)}
            </div>
          </div>

          {/* Separador */}
          <div className="h-12 w-px bg-gray-200"></div>

          {/* Estatísticas */}
          <div className="flex gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Projetos</div>
              <div className="text-lg font-semibold text-blue-600">{totalProjects}</div>
            </div>
            <div>
              <div className="text-gray-500">Em Andamento</div>
              <div className="text-lg font-semibold text-indigo-600">{activeProjects}</div>
            </div>
          </div>
        </div>

        {/* Última Atividade */}
        {lastActivity && (
          <div className="text-xs text-gray-500 mt-2 border-t pt-2">
            Última atividade: {formatLastActivity(lastActivity)}
          </div>
        )}
      </div>
      
      {/* Indicador de Status */}
      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
};

export default Clock; 