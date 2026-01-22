import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGmailOAuth } from "@/hooks/useGmailOAuth";
import {
  Mail,
  Rss,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Link2,
  Link2Off,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

interface EmailAccount {
  id: string;
  email: string;
  label: string;
  is_active: boolean;
  oauth_connected?: boolean;
  last_sync_at?: string;
  sync_enabled?: boolean;
}

interface RssFeed {
  id: string;
  url: string;
  title: string | null;
  is_active: boolean;
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { initiateOAuth, disconnectAccount, triggerSync, isConnecting, isSyncing } = useGmailOAuth();

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState({ email: "", label: "" });
  const [newRss, setNewRss] = useState({ url: "", title: "" });
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchSettings();
    } else {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const fetchSettings = async () => {
    try {
      const [emailRes, rssRes] = await Promise.all([
        supabase.from("email_accounts").select("*").order("created_at"),
        supabase.from("rss_feeds").select("*").order("created_at"),
      ]);

      if (emailRes.error) throw emailRes.error;
      if (rssRes.error) throw rssRes.error;

      setEmailAccounts(emailRes.data || []);
      setRssFeeds(rssRes.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addEmailAccount = async () => {
    if (!newEmail.email || !newEmail.label) return;

    try {
      const { error } = await supabase.from("email_accounts").insert({
        user_id: user?.id,
        email: newEmail.email,
        label: newEmail.label,
      });

      if (error) throw error;
      toast({ title: "Conta de email adicionada!" });
      setNewEmail({ email: "", label: "" });
      fetchSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  };

  const deleteEmailAccount = async (id: string) => {
    try {
      const { error } = await supabase.from("email_accounts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Conta removida" });
      fetchSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  };

  const addRssFeed = async () => {
    if (!newRss.url) return;

    try {
      const { error } = await supabase.from("rss_feeds").insert({
        user_id: user?.id,
        url: newRss.url,
        title: newRss.title || null,
      });

      if (error) throw error;
      toast({ title: "Feed RSS adicionado!" });
      setNewRss({ url: "", title: "" });
      fetchSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  };

  const deleteRssFeed = async (id: string) => {
    try {
      const { error } = await supabase.from("rss_feeds").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Feed removido" });
      fetchSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleConnect = async (accountId: string) => {
    await initiateOAuth(accountId);
    // Refresh after a delay to check for changes
    setTimeout(() => fetchSettings(), 3000);
  };

  const handleDisconnect = async (accountId: string) => {
    const success = await disconnectAccount(accountId);
    if (success) {
      fetchSettings();
    }
  };

  const handleManualSync = async (accountId: string) => {
    setSyncingAccountId(accountId);
    await triggerSync(accountId);
    setSyncingAccountId(null);
    fetchSettings();
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return "Nunca sincronizado";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    return `Há ${diffDays} dias`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas fontes de dados e preferências
          </p>
        </div>

        <Tabs defaultValue="email" className="space-y-6">
          <TabsList>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Contas Gmail
            </TabsTrigger>
            <TabsTrigger value="rss" className="gap-2">
              <Rss className="h-4 w-4" />
              Feeds RSS
            </TabsTrigger>
            <TabsTrigger value="instructions" className="gap-2">
              <Mail className="h-4 w-4" />
              Instruções
            </TabsTrigger>
          </TabsList>

          {/* Instructions Tab */}
          <TabsContent value="instructions" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Como Conectar sua Conta Gmail</CardTitle>
                <CardDescription>
                  Conecte sua conta Gmail para sincronização automática de Google Alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Adicione uma conta Gmail</h4>
                      <p className="text-sm text-muted-foreground">
                        Na aba "Contas Gmail", adicione o email e um label identificador.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Conecte via Google OAuth</h4>
                      <p className="text-sm text-muted-foreground">
                        Clique em "Conectar Gmail" e autorize o acesso aos seus emails do Google Alerts.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Sincronização Automática</h4>
                      <p className="text-sm text-muted-foreground">
                        Seus emails serão sincronizados automaticamente 2x ao dia (06:00 e 18:00 UTC).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold">Sincronização Manual</h4>
                      <p className="text-sm text-muted-foreground">
                        Use o botão "Sincronizar" a qualquer momento para forçar uma atualização.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                  <h4 className="font-semibold text-green-600 mb-2">✨ Automação Ativa</h4>
                  <p className="text-sm text-muted-foreground">
                    Com a conexão OAuth, não é mais necessário copiar HTML manualmente.
                    Os artigos do Google Alerts são extraídos automaticamente!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Adicionar Conta Gmail</CardTitle>
                <CardDescription>
                  Configure as contas do Gmail para extrair Google Alerts automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="seu@gmail.com"
                      value={newEmail.email}
                      onChange={(e) => setNewEmail({ ...newEmail, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      placeholder="Ex: Conta Principal"
                      value={newEmail.label}
                      onChange={(e) => setNewEmail({ ...newEmail, label: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={addEmailAccount}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </CardContent>
            </Card>

            {/* Email List */}
            <div className="space-y-3">
              {emailAccounts.map((account) => (
                <Card key={account.id} className="glass-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${account.oauth_connected ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                          <Mail className={`h-5 w-5 ${account.oauth_connected ? 'text-green-500' : 'text-primary'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{account.email}</p>
                            {account.oauth_connected ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Conectado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Não Conectado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{account.label}</span>
                            {account.oauth_connected && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatLastSync(account.last_sync_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {account.oauth_connected ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualSync(account.id)}
                              disabled={isSyncing || syncingAccountId === account.id}
                            >
                              {syncingAccountId === account.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              <span className="ml-2 hidden sm:inline">Sincronizar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisconnect(account.id)}
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              <Link2Off className="h-4 w-4" />
                              <span className="ml-2 hidden sm:inline">Desconectar</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConnect(account.id)}
                            disabled={isConnecting}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isConnecting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                            <span className="ml-2">Conectar Gmail</span>
                          </Button>
                        )}
                        <Switch checked={account.is_active} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEmailAccount(account.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {emailAccounts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conta configurada
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rss" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Adicionar Feed RSS</CardTitle>
                <CardDescription>
                  Configure feeds RSS do Google ou outras fontes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>URL do Feed</Label>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={newRss.url}
                      onChange={(e) => setNewRss({ ...newRss, url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Título (opcional)</Label>
                    <Input
                      placeholder="Ex: Notícias Tech"
                      value={newRss.title}
                      onChange={(e) => setNewRss({ ...newRss, title: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={addRssFeed}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </CardContent>
            </Card>

            {/* RSS List */}
            <div className="space-y-3">
              {rssFeeds.map((feed) => (
                <Card key={feed.id} className="glass-card border-border/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Rss className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">{feed.title || "Feed RSS"}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {feed.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch checked={feed.is_active} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRssFeed(feed.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {rssFeeds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum feed configurado
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
