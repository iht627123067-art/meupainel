import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Mic,
    Play,
    Download,
    ThumbsUp,
    ThumbsDown,
    Sparkles,
    History,
    Settings2,
    Calendar,
    Clock,
    ExternalLink,
    ChevronRight,
    BrainCircuit,
    Dna,
    Zap,
    ChevronDown,
    Bot
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PodcastEpisode {
    id: string;
    title: string;
    description: string;
    script_markdown: string;
    episode_date: string;
    total_articles: number;
    estimated_duration_minutes: number;
    user_personalization_score: number;
    user_feedback: string | null;
}

interface UserDNA {
    dna_score: number;
    preferred_categories: string[];
    total_published: number;
    total_podcasts_generated: number;
    last_updated_at: string;
}

const Podcast = () => {
    const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
    const [history, setHistory] = useState<PodcastEpisode[]>([]);
    const [dna, setDna] = useState<UserDNA | null>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Latest Episode
            const { data: latest } = await supabase
                .from("podcast_episodes")
                .select("*")
                .eq("user_id", user.id)
                .order("episode_date", { ascending: false })
                .limit(1)
                .maybeSingle();

            setEpisode(latest);

            // Fetch History
            const { data: past } = await supabase
                .from("podcast_episodes")
                .select("*")
                .eq("user_id", user.id)
                .order("episode_date", { ascending: false })
                .limit(10);

            setHistory(past || []);

            // Fetch DNA
            const { data: userDna } = await supabase
                .from("user_content_dna")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

            setDna(userDna);

        } catch (error) {
            console.error("Error fetching podcast data:", error);
        } finally {
            setLoading(false);
        }
    };

    const generatePodcast = async (mode: 'deep' | 'quick' | 'chatgpt-full' | 'chatgpt-quick' = 'deep') => {
        setGenerating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sessão não encontrada. Por favor, faça login novamente.");

            const response = await supabase.functions.invoke("generate-personalized-podcast", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
                body: {
                    user_id: user.id,
                    mode
                }
            });

            if (response.error) throw new Error(response.error.message);

            if (response.data && response.data.success && response.data.episode) {
                setEpisode(response.data.episode as PodcastEpisode);
                toast.success(
                    mode === 'quick' ? "Podcast rápido gerado!" :
                        mode === 'chatgpt-full' ? "Podcast Premium (Completo) gerado!" :
                            mode === 'chatgpt-quick' ? "Podcast Premium (Rápido) gerado!" :
                                "Podcast personalizado gerado!"
                );
                // Refresh history in background
                fetchData();
            } else {
                throw new Error("Resposta inválida do servidor");
            }
        } catch (error: any) {
            toast.error(`Erro ao gerar podcast: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleFeedback = async (id: string, feedback: 'liked' | 'disliked') => {
        try {
            const { error } = await supabase
                .from("podcast_episodes")
                .update({ user_feedback: feedback })
                .eq("id", id);

            if (error) throw error;

            toast.success("Obrigado pelo feedback! Isso ajuda meu aprendizado.");
            setEpisode(prev => prev?.id === id ? { ...prev, user_feedback: feedback } : prev);
        } catch (error: any) {
            toast.error("Erro ao salvar feedback");
        }
    };

    const downloadMarkdown = () => {
        if (!episode || !episode.script_markdown) {
            toast.error("Nenhum roteiro disponível para baixar");
            return;
        }

        try {
            // Add BOM for better UTF-8 support in some editors
            const blob = new Blob(["\ufeff" + episode.script_markdown], { type: "text/markdown;charset=utf-8" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            // Format name: replace spaces with underscores and remove special characters
            const safeTitle = episode.title.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 30);
            const fileName = `podcast_${episode.episode_date}_${safeTitle}.md`;

            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            // Cleanup and Feedback
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

            toast.success("Download iniciado: " + fileName);
        } catch (error) {
            console.error("Download failed:", error);
            toast.error("Falha ao gerar o download");
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
            <Sidebar />
            <main className="flex-1 pl-16 lg:pl-64 transition-all duration-300">
                <div className="h-full p-4 lg:p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                Podcast Diário Personalizado
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Sua curadoria inteligente transformada em roteiros profissionais.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        disabled={generating}
                                        className="relative overflow-hidden group px-6"
                                    >
                                        {generating ? (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                                Gerando...
                                            </>
                                        ) : (
                                            <>
                                                <Mic className="mr-2 h-4 w-4" />
                                                Gerar Podcast
                                                <ChevronDown className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => generatePodcast('deep')}>
                                        <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                                        <span>Personalizado (Completo)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => generatePodcast('quick')}>
                                        <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                                        <span>Rápido (Alertas do Gmail)</span>
                                    </DropdownMenuItem>

                                    <div className="h-px bg-muted my-1" />

                                    <DropdownMenuItem onClick={() => generatePodcast('chatgpt-full')} className="bg-primary/5 focus:bg-primary/10">
                                        <Bot className="mr-2 h-4 w-4 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">ChatGPT Premium (Completo)</span>
                                            <span className="text-[10px] text-muted-foreground">Usa cota do OpenAI (Pago)</span>
                                        </div>
                                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1 bg-primary/10 text-primary border-none text-amber-500 font-bold">
                                            PRO
                                        </Badge>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => generatePodcast('chatgpt-quick')} className="bg-primary/5 focus:bg-primary/10">
                                        <Bot className="mr-2 h-4 w-4 text-primary" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">ChatGPT Premium (Rápido)</span>
                                            <span className="text-[10px] text-muted-foreground">Resumo rápido Gmail (Pago)</span>
                                        </div>
                                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1 bg-primary/10 text-primary border-none text-amber-500 font-bold">
                                            PRO
                                        </Badge>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* DNA Progress Card */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Dna className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">Maturidade do DNA de Conteúdo</span>
                                            <Badge variant="outline" className="text-xs">
                                                {Math.round((dna?.dna_score || 0) * 100)}%
                                            </Badge>
                                        </div>
                                        <div className="w-64 h-2 bg-muted rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${Math.round((dna?.dna_score || 0) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-8 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Publicações</span>
                                        <span className="font-bold text-xl">{dna?.total_published || 0}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Podcasts</span>
                                        <span className="font-bold text-xl">{dna?.total_podcasts_generated || 0}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Último Aprendizado</span>
                                        <span className="font-bold">
                                            {dna?.last_updated_at ? format(new Date(dna.last_updated_at), "dd MMM", { locale: ptBR }) : "---"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="latest" className="w-full">
                        <TabsList className="grid w-[400px] grid-cols-2 mb-8">
                            <TabsTrigger value="latest">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Episódio Atual
                            </TabsTrigger>
                            <TabsTrigger value="history">
                                <History className="h-4 w-4 mr-2" />
                                Histórico
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="latest" className="space-y-6">
                            {episode ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left: Script Preview */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <Card className="h-[700px] flex flex-col overflow-hidden">
                                            <CardHeader className="border-b bg-muted/30">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle>{episode.title}</CardTitle>
                                                        <CardDescription className="flex items-center gap-4 mt-2">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(episode.episode_date), "dd 'de' MMMM", { locale: ptBR })}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {episode.estimated_duration_minutes} min
                                                            </span>
                                                        </CardDescription>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Markdown
                                                        </Button>
                                                        <Button variant="secondary" size="sm" className="bg-purple-500 hover:bg-purple-600 text-white" disabled>
                                                            <Play className="h-4 w-4 mr-2" />
                                                            Ouvir (NotebookLM)
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <ScrollArea className="flex-1 p-6 bg-muted/5">
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown>{episode.script_markdown}</ReactMarkdown>
                                                </div>
                                            </ScrollArea>
                                        </Card>
                                    </div>

                                    {/* Right: Insights & Personalization */}
                                    <div className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <BrainCircuit className="h-5 w-5 text-primary" />
                                                    Insights de Personalização
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-primary/10">
                                                    <span className="text-sm">Nível de Personalização</span>
                                                    <Badge className="bg-primary/20 text-primary border-none">
                                                        {Math.round(episode.user_personalization_score * 100)}%
                                                    </Badge>
                                                </div>

                                                <p className="text-sm text-muted-foreground italic">
                                                    "Este roteiro foi otimizado baseando-se no seu interesse frequente por
                                                    <strong> {dna?.preferred_categories?.join(", ") || "IA e Tecnologia"}</strong>.
                                                    Os rationale explicam o valor estratégico para sua rede no LinkedIn."
                                                </p>

                                                <div className="pt-4 border-t">
                                                    <h4 className="text-sm font-medium mb-3">O que você achou?</h4>
                                                    <div className="flex gap-3">
                                                        <Button
                                                            variant={episode.user_feedback === 'liked' ? 'default' : 'outline'}
                                                            className="flex-1 gap-2"
                                                            onClick={() => handleFeedback(episode.id, 'liked')}
                                                        >
                                                            <ThumbsUp className="h-4 w-4" />
                                                            Útil
                                                        </Button>
                                                        <Button
                                                            variant={episode.user_feedback === 'disliked' ? 'destructive' : 'outline'}
                                                            className="flex-1 gap-2"
                                                            onClick={() => handleFeedback(episode.id, 'disliked')}
                                                        >
                                                            <ThumbsDown className="h-4 w-4" />
                                                            Irrelevante
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                                            <CardHeader>
                                                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Tutorial Rápido
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-3">
                                                <p>1. ⬇️ Baixe o arquivo Markdown acima.</p>
                                                <p>2. 🌐 Acesse o <strong>NotebookLM</strong>.</p>
                                                <p>3. 📤 Faça o upload do arquivo.</p>
                                                <p>4. 🎙️ Gere o "Audio Overview" para ouvir.</p>
                                                <Button variant="link" className="p-0 h-auto text-primary" asChild>
                                                    <a href="https://notebooklm.google.com" target="_blank" rel="noreferrer">
                                                        Abrir NotebookLM <ExternalLink className="h-3 w-3 ml-1" />
                                                    </a>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            ) : (
                                <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Mic className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <CardTitle>Nenhum episódio gerado</CardTitle>
                                    <CardDescription className="max-w-md mx-auto mt-2">
                                        Você ainda não gerou o podcast personalizado de hoje. Clique no botão acima para processar os alertas e criar seu roteiro exclusivo.
                                    </CardDescription>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="history">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {history.map((ep) => (
                                    <Card key={ep.id} className="group hover:border-primary/50 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                                {ep.title}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(ep.episode_date), "dd MMM yyyy", { locale: ptBR })}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {ep.description || "Sem descrição disponível."}
                                            </p>
                                            <div className="mt-4 flex items-center gap-3">
                                                <Badge variant="secondary">{ep.total_articles} artigos</Badge>
                                                <Badge variant="outline">{ep.estimated_duration_minutes} min</Badge>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="pt-0">
                                            <Button variant="ghost" className="w-full justify-between group" onClick={() => setEpisode(ep)}>
                                                Ver roteiro
                                                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default Podcast;
