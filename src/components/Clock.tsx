import { useState, useEffect } from 'react';

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  return (
    <div className="flex flex-col items-end">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 shadow-lg backdrop-blur-sm border border-white/20">
        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-mono tracking-wider animate-pulse">
          {time.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        <div className="text-sm text-gray-600 mt-1 capitalize">
          {formatDate(time)}
        </div>
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