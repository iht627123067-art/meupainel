/**
 * Gmail OAuth Hook
 * Manages OAuth flow, connection status, and manual sync
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const OAUTH_REDIRECT_URI = `${window.location.origin}/oauth/callback`;
const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface OAuthState {
    emailAccountId: string;
    userId: string;
}

export interface SyncStatus {
    isLoading: boolean;
    lastSync: Date | null;
    error: string | null;
}

export function useGmailOAuth() {
    const { toast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    /**
     * Initiates Google OAuth flow for connecting a Gmail account
     */
    const initiateOAuth = useCallback(async (emailAccountId: string) => {
        try {
            setIsConnecting(true);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            if (!GOOGLE_CLIENT_ID) {
                throw new Error('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to .env');
            }

            // Store state for callback
            const state: OAuthState = {
                emailAccountId,
                userId: user.id,
            };
            sessionStorage.setItem('gmail_oauth_state', JSON.stringify(state));

            // Build OAuth URL
            const params = new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                redirect_uri: OAUTH_REDIRECT_URI,
                response_type: 'code',
                scope: GMAIL_SCOPES,
                access_type: 'offline',  // Required for refresh token
                prompt: 'consent',        // Force consent to get refresh token
                state: emailAccountId,
            });

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

            // Open OAuth popup
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'gmail-oauth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            if (!popup) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }

            // Poll for popup close and check for success
            const pollInterval = setInterval(() => {
                if (popup.closed) {
                    clearInterval(pollInterval);
                    setIsConnecting(false);

                    // Check if OAuth was successful by checking the account status
                    checkConnectionStatus(emailAccountId).then(connected => {
                        if (connected) {
                            toast({
                                title: 'Gmail conectado!',
                                description: 'Conta Gmail vinculada com sucesso.',
                            });
                        }
                    });
                }
            }, 500);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('OAuth initiation failed:', message);
            toast({
                title: 'Erro',
                description: message,
                variant: 'destructive',
            });
            setIsConnecting(false);
        }
    }, [toast]);

    /**
     * Handles the OAuth callback with authorization code
     */
    const handleCallback = useCallback(async (code: string) => {
        try {
            const stateStr = sessionStorage.getItem('gmail_oauth_state');
            if (!stateStr) {
                throw new Error('OAuth state not found');
            }

            const state: OAuthState = JSON.parse(stateStr);
            sessionStorage.removeItem('gmail_oauth_state');

            // Exchange code for tokens via Edge Function
            const { data, error } = await supabase.functions.invoke('exchange-gmail-token', {
                body: {
                    code,
                    redirect_uri: OAUTH_REDIRECT_URI,
                    email_account_id: state.emailAccountId,
                    user_id: state.userId,
                },
            });

            if (error) throw error;

            return { success: true, email: data.email };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('OAuth callback failed:', message);
            return { success: false, error: message };
        }
    }, []);

    /**
     * Checks if an email account is connected via OAuth
     */
    const checkConnectionStatus = useCallback(async (emailAccountId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('email_accounts')
                .select('oauth_connected')
                .eq('id', emailAccountId)
                .single();

            if (error) throw error;
            return data?.oauth_connected || false;

        } catch (error) {
            console.error('Failed to check connection status:', error);
            return false;
        }
    }, []);

    /**
     * Disconnects a Gmail account (removes OAuth tokens)
     */
    const disconnectAccount = useCallback(async (emailAccountId: string) => {
        try {
            // Delete OAuth tokens
            const { error: tokenError } = await supabase
                .from('gmail_oauth_tokens')
                .delete()
                .eq('email_account_id', emailAccountId);

            if (tokenError) throw tokenError;

            // Update account status
            const { error: accountError } = await supabase
                .from('email_accounts')
                .update({ oauth_connected: false })
                .eq('id', emailAccountId);

            if (accountError) throw accountError;

            toast({
                title: 'Conta desconectada',
                description: 'Conexão com Gmail removida com sucesso.',
            });

            return true;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast({
                title: 'Erro',
                description: message,
                variant: 'destructive',
            });
            return false;
        }
    }, [toast]);

    /**
     * Triggers manual sync for a specific account or all accounts
     */
    const triggerSync = useCallback(async (emailAccountId?: string) => {
        try {
            setIsSyncing(true);

            const { data, error } = await supabase.functions.invoke('sync-gmail', {
                body: emailAccountId ? { email_account_id: emailAccountId } : {},
            });

            if (error) throw error;

            const articlesCount = data.results?.reduce(
                (sum: number, r: { articles_extracted?: number }) => sum + (r.articles_extracted || 0),
                0
            ) || 0;

            toast({
                title: 'Sincronização concluída!',
                description: `${articlesCount} artigos extraídos.`,
            });

            return data;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast({
                title: 'Erro na sincronização',
                description: message,
                variant: 'destructive',
            });
            return null;

        } finally {
            setIsSyncing(false);
        }
    }, [toast]);

    /**
     * Gets the sync history for an account
     */
    const getSyncHistory = useCallback(async (emailAccountId: string, limit = 10) => {
        try {
            const { data, error } = await supabase
                .from('email_sync_logs')
                .select('*')
                .eq('email_account_id', emailAccountId)
                .order('sync_started_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Failed to get sync history:', error);
            return [];
        }
    }, []);

    return {
        // Actions
        initiateOAuth,
        handleCallback,
        disconnectAccount,
        triggerSync,

        // Query functions
        checkConnectionStatus,
        getSyncHistory,

        // State
        isConnecting,
        isSyncing,
    };
}
