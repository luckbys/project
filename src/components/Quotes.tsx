import { useState, useEffect, useMemo } from 'react';
import { 
  Eye, SquarePen, Trash2, CodeXml,
  Search, Filter, Plus, Download,
  ArrowUpDown, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type Quote = {
  id: string;
  client_name: string;
  project_title: string;
  description: string;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  valid_until: string;
  project_type: 'web' | 'mobile' | 'desktop';
  items: {
    id: string;
    description: string;
    quantity: number;
    price: number;
  }[];
};

const Quotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    client: 'all',
    date: 'all',
    search: ''
  });

  // Buscar orçamentos com verificação de duplicatas
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Remover possíveis duplicatas por ID
      const uniqueQuotes = data ? Array.from(
        new Map(data.map(item => [item.id, item])).values()
      ) : [];

      // Aplicar filtros
      let filteredQuotes = uniqueQuotes;
      
      if (filters.status !== 'all') {
        filteredQuotes = filteredQuotes.filter(q => q.status === filters.status);
      }

      if (filters.client !== 'all') {
        filteredQuotes = filteredQuotes.filter(q => q.client_name === filters.client);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredQuotes = filteredQuotes.filter(q => 
          q.client_name.toLowerCase().includes(searchTerm) ||
          q.project_title.toLowerCase().includes(searchTerm) ||
          q.description.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.date !== 'all') {
        const now = new Date();
        const cutoff = new Date();
        
        switch (filters.date) {
          case 'week':
            cutoff.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoff.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            cutoff.setMonth(now.getMonth() - 3);
            break;
        }

        filteredQuotes = filteredQuotes.filter(q => 
          new Date(q.created_at) >= cutoff
        );
      }

      setQuotes(filteredQuotes);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar quando os filtros mudarem
  useEffect(() => {
    fetchQuotes();
  }, [filters]);

  // Memoizar estatísticas para evitar recálculos desnecessários
  const stats = useMemo(() => ({
    total: quotes.reduce((acc, q) => acc + q.total, 0),
    approved: quotes.filter(q => q.status === 'accepted').length,
    pending: quotes.filter(q => q.status === 'draft' || q.status === 'sent').length,
    converted: quotes.filter(q => q.status === 'accepted').length
  }), [quotes]);

  // Memoizar lista de clientes únicos
  const uniqueClients = useMemo(() => 
    Array.from(new Set(quotes.map(q => q.client_name))),
    [quotes]
  );

  // Funções auxiliares
  const getStatusBadge = (status: string) => {
    const badges = {
      draft: '📝 Rascunho',
      sent: '📤 Enviado',
      accepted: '✅ Aceito', 
      rejected: '❌ Rejeitado'
    };
    const colors = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-600',
      accepted: 'bg-green-100 text-green-600',
      rejected: 'bg-red-100 text-red-600'
    };
    return {
      text: badges[status as keyof typeof badges],
      color: colors[status as keyof typeof colors]
    };
  };

  const getProjectIcon = (type: string) => {
    const icons = {
      web: '💻',
      mobile: '📱',
      desktop: '🖥️'
    };
    return icons[type as keyof typeof icons] || '💻';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="space-y-8">
        {/* Header com Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 bg-opacity-10 rounded-xl">
                <ArrowUpDown className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total</p>
                <h3 className="text-2xl font-bold text-blue-900">
                  R$ {stats.total.toLocaleString('pt-BR')}
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 bg-opacity-10 rounded-xl">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Aprovados</p>
                <h3 className="text-2xl font-bold text-green-900">
                  {stats.approved}
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500 bg-opacity-10 rounded-xl">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pendentes</p>
                <h3 className="text-2xl font-bold text-yellow-900">
                  {stats.pending}
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500 bg-opacity-10 rounded-xl">
                <CodeXml className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Convertidos</p>
                <h3 className="text-2xl font-bold text-purple-900">
                  {stats.converted}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Header com Ações */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Orçamentos</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar orçamentos..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>

            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="all">Todos Status</option>
              <option value="draft">📝 Rascunho</option>
              <option value="sent">📤 Enviado</option>
              <option value="accepted">✅ Aceito</option>
              <option value="rejected">❌ Rejeitado</option>
            </select>

            <select
              value={filters.client}
              onChange={e => setFilters(f => ({ ...f, client: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="all">Todos Clientes</option>
              {/* Mapear clientes únicos */}
              {uniqueClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>

            <select
              value={filters.date}
              onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="all">Todas Datas</option>
              <option value="week">Última Semana</option>
              <option value="month">Último Mês</option>
              <option value="quarter">Último Trimestre</option>
            </select>
          </div>
        </div>

        {/* Lista de Orçamentos */}
        <div className="grid gap-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum orçamento encontrado
            </div>
          ) : (
            quotes.map(quote => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{quote.client_name}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(quote.status).color}`}>
                        {getStatusBadge(quote.status).text}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(quote.valid_until).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">
                      R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {quote.items.length} {quote.items.length === 1 ? 'item' : 'itens'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getProjectIcon(quote.project_type)}
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {quote.project_type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 text-gray-600 text-sm">
                    {quote.description}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button 
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                    title="Visualizar"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                    title="Editar"
                  >
                    <SquarePen className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Converter em Projeto"
                  >
                    <CodeXml className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Quotes; 