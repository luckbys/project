import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Loading } from '../components/Loading';

type QuotePreviewProps = {
  quote: Quote;
  client: Client;
  developer: AboutMe;
};

export default function QuotePreview() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuotePreviewProps | null>(null);

  useEffect(() => {
    if (!id) {
      setError('ID do orçamento não fornecido');
      setLoading(false);
      return;
    }
    loadQuoteData();
  }, [id]);

  const loadQuoteData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar orçamento
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (quoteError) {
        if (quoteError.code === 'PGRST116') {
          throw new Error('Orçamento não encontrado');
        }
        throw quoteError;
      }

      // Buscar cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', quote.client_id)
        .single();

      if (clientError) throw clientError;

      // Buscar informações do desenvolvedor
      const { data: developer, error: developerError } = await supabase
        .from('about_me')
        .select('*')
        .eq('user_id', quote.user_id)
        .single();

      if (developerError) throw developerError;

      setData({ quote, client, developer });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (accepted: boolean) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status: accepted ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(
        accepted ? 'Orçamento aceito com sucesso!' : 'Orçamento rejeitado'
      );

      // Recarregar dados
      loadQuoteData();
    } catch (error) {
      console.error('Erro ao responder orçamento:', error);
      toast.error('Erro ao processar resposta');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" color="blue" text="Carregando orçamento..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Orçamento não encontrado</h1>
          <p className="text-gray-600 mt-2">O orçamento solicitado não está disponível</p>
        </div>
      </div>
    );
  }

  const { quote, client, developer } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg">
        {/* Cabeçalho */}
        <div className="bg-blue-600 text-white p-6 rounded-t-xl">
          <h1 className="text-2xl font-bold text-center">Orçamento</h1>
          <p className="text-center mt-2">#{quote.id.substring(0, 8).toUpperCase()}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-bold mb-2">Desenvolvedor</h2>
              <p>{developer.developer_name}</p>
              <p>{developer.contacts.email}</p>
              <p>{developer.contacts.whatsapp}</p>
            </div>
            <div>
              <h2 className="font-bold mb-2">Cliente</h2>
              <p>{client.name}</p>
              <p>{client.email}</p>
              <p>{client.phone}</p>
              {client.company && <p>{client.company}</p>}
            </div>
          </div>

          {/* Detalhes do Projeto */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="font-bold mb-2">Detalhes do Projeto</h2>
            <p>Tipo: {quote.project_type.toUpperCase()}</p>
            <p>Data: {new Date(quote.created_at).toLocaleDateString()}</p>
            <p>Validade: {new Date(quote.valid_until).toLocaleDateString()}</p>
          </div>

          {/* Itens */}
          <div>
            <h2 className="font-bold mb-4">Itens do Orçamento</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Descrição</th>
                    <th className="px-4 py-2 text-center">Qtd</th>
                    <th className="px-4 py-2 text-right">Valor Unit.</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2 text-center">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">
                        R$ {item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        R$ {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais */}
          <div className="bg-gray-50 p-4 rounded-lg flex justify-end">
            <div className="space-y-2">
              <div className="flex justify-between gap-8">
                <span>Subtotal:</span>
                <span>R$ {quote.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>Taxa ({quote.tax}%):</span>
                <span>R$ {(quote.subtotal * quote.tax / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-8 font-bold">
                <span>Total:</span>
                <span>R$ {quote.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          {quote.notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="font-bold mb-2">Observações</h2>
              <p className="whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Botões de Ação */}
          {quote.status === 'sent' && (
            <div className="flex justify-center gap-4 pt-6">
              <button
                onClick={() => handleResponse(false)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Rejeitar Orçamento
              </button>
              <button
                onClick={() => handleResponse(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Aceitar Orçamento
              </button>
            </div>
          )}

          {quote.status !== 'sent' && (
            <div className="text-center pt-6">
              <p className={`text-lg font-medium ${
                quote.status === 'accepted' ? 'text-green-600' : 'text-red-600'
              }`}>
                Orçamento {quote.status === 'accepted' ? 'aceito' : 'rejeitado'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Em {new Date(quote.responded_at!).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 