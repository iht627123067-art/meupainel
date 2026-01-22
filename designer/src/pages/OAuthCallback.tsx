/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGmailOAuth } from '@/hooks/useGmailOAuth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleCallback } = useGmailOAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processando autenticação...');

    useEffect(() => {
        const processCallback = async () => {
            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                setStatus('error');
                setMessage(`Autenticação cancelada: ${error}`);
                setTimeout(() => window.close(), 2000);
                return;
            }

            if (!code) {
                setStatus('error');
                setMessage('Código de autorização não encontrado');
                setTimeout(() => window.close(), 2000);
                return;
            }

            const result = await handleCallback(code);

            if (result.success) {
                setStatus('success');
                setMessage(`Conta ${result.email} conectada com sucesso!`);
            } else {
                setStatus('error');
                setMessage(result.error || 'Falha na autenticação');
            }

            // Close popup after 2 seconds
            setTimeout(() => {
                if (window.opener) {
                    window.close();
                } else {
                    navigate('/settings');
                }
            }, 2000);
        };

        processCallback();
    }, [searchParams, handleCallback, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4 p-8">
                {status === 'loading' && (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="text-green-600 font-medium">{message}</p>
                        <p className="text-sm text-muted-foreground">Esta janela será fechada automaticamente...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                        <p className="text-red-600 font-medium">{message}</p>
                        <p className="text-sm text-muted-foreground">Esta janela será fechada automaticamente...</p>
                    </>
                )}
            </div>
        </div>
    );
}
