import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Quote } from '../types';
import Loading from '../components/Loading';
import { CheckCircle, XCircle } from 'lucide-react';

export function QuoteApproval() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadQuote();
  }, [id]);

  const loadQuote = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, clients(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuote(data);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setStatus(approved ? 'approved' : 'rejected');
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" color="blue" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Orçamento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-8">
          Aprovação de Orçamento
        </h1>

        {status !== 'pending' ? (
          <div className="text-center space-y-4">
            {status === 'approved' ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <p className="text-lg font-medium text-green-600">
                  Orçamento aprovado com sucesso!
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <p className="text-lg font-medium text-red-600">
                  Orçamento rejeitado
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="font-medium mb-4">Detalhes do Orçamento</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-medium">{quote.client?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo de Projeto:</span>
                    <span className="font-medium">{quote.project_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">
                      R$ {quote.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleApproval(false)}
                  disabled={submitting}
                  className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  Rejeitar Orçamento
                </button>
                <button
                  onClick={() => handleApproval(true)}
                  disabled={submitting}
                  className="px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  Aprovar Orçamento
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 