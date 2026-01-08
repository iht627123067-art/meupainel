import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Rss, Plus, Trash2, Loader2 } from "lucide-react";

interface EmailAccount {
  id: string;
  email: string;
  label: string;
  is_active: boolean;
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
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState({ email: "", label: "" });
  const [newRss, setNewRss] = useState({ url: "", title: "" });

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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
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
                <CardTitle>Como Importar Alertas do Google</CardTitle>
                <CardDescription>
                  Siga os passos abaixo para extrair alertas do Gmail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Abra o email do Google Alerts no Gmail</h4>
                      <p className="text-sm text-muted-foreground">
                        Acesse gmail.com e localize o email do Google Alerts que deseja importar.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Acesse "Mostrar original"</h4>
                      <p className="text-sm text-muted-foreground">
                        Clique nos 3 pontos (⋮) no canto superior direito do email → "Mostrar original".
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Copie o conteúdo HTML</h4>
                      <p className="text-sm text-muted-foreground">
                        Na nova aba, copie todo o conteúdo do email (Ctrl+A, Ctrl+C).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold">Use o botão "Importar" na página Alertas</h4>
                      <p className="text-sm text-muted-foreground">
                        Vá para a página "Alertas", clique em "Importar" e cole o HTML copiado.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      5
                    </div>
                    <div>
                      <h4 className="font-semibold">Revise e confirme</h4>
                      <p className="text-sm text-muted-foreground">
                        O sistema extrairá automaticamente os artigos. Revise o preview e confirme a importação.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-semibold mb-2">💡 Dica</h4>
                  <p className="text-sm text-muted-foreground">
                    A lógica de extração é baseada no formato schema.org/Article usado pelo Google Alerts.
                    URLs do Google são automaticamente limpas, removendo parâmetros de tracking.
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
                  Configure as contas do Gmail para extrair Google Alerts
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
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.email}</p>
                        <p className="text-sm text-muted-foreground">{account.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
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
