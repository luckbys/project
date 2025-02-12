import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LinkedInService } from '../services/linkedin';
import { toast } from 'react-hot-toast';

export function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        if (!code) {
          throw new Error('Código de autorização não encontrado');
        }

        // Determina se estamos em desenvolvimento ou produção
        const isProduction = window.location.hostname !== 'localhost';
        const redirectUri = isProduction 
          ? 'https://hvokwanpdpfmyvcfeccf.supabase.co/linkedin-callback'
          : 'http://localhost:5173/linkedin-callback';

        await LinkedInService.handleAuthCode(code);
        toast.success('Conectado ao LinkedIn com sucesso!');
        // Redireciona para a página correta baseado no ambiente
        window.location.href = isProduction 
          ? '/admin'
          : 'http://localhost:5173/admin';
      } catch (error) {
        console.error('Erro no callback:', error);
        toast.error('Erro ao conectar com LinkedIn');
        navigate('/admin');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Conectando ao LinkedIn...</p>
      </div>
    </div>
  );
} 