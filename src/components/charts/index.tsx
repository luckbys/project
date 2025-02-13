import { Line, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Tipos comuns
type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }[];
};

// Configurações base
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};

// Componente LineChart
export const LineChart = ({ data }: { data: ChartData }) => {
  const options = {
    ...baseOptions,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={data} options={options} />
    </div>
  );
};

// Componente BarChart
export const BarChart = ({ data }: { data: ChartData }) => {
  const options = {
    ...baseOptions,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Bar data={data} options={options} />
    </div>
  );
};

// Componente RadarChart
export const RadarChart = ({ data }: { data: ChartData }) => {
  const options = {
    ...baseOptions,
    scales: {
      r: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Radar data={data} options={options} />
    </div>
  );
};

// Helpers para criar dados de gráfico
export const createChartData = (
  labels: string[],
  values: number[],
  label: string,
  color: string
): ChartData => ({
  labels,
  datasets: [
    {
      label,
      data: values,
      backgroundColor: color + '20', // cor com 20% de opacidade
      borderColor: color,
      fill: true,
    },
  ],
});

// Paleta de cores para gráficos
export const chartColors = {
  blue: '#3B82F6',
  indigo: '#6366F1',
  purple: '#8B5CF6',
  pink: '#EC4899',
  red: '#EF4444',
  orange: '#F97316',
  green: '#22C55E',
  teal: '#14B8A6',
}; 