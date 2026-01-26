import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Linkedin,
    Copy,
    Check,
    Edit,
    Trash2,
    ExternalLink,
    RefreshCw,
    Loader2,
    FileText,
    Send,
    Sparkles,
    Eye,
    Brain,
    Clock,
    User,
    Globe,
    ThumbsUp,
    MessageSquare,
    Share2,
    ImageIcon,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedInPost {
    id: string;
    draft_content: string;
    image_url: string | null;
    final_content: string | null;
    ai_metadata: {
        tone?: string;
        hashtags?: string[];
        call_to_action?: string;
        provider?: string;
        generated_at?: string;
    } | null;
    auto_generated: boolean;
    status: string;
    created_at: string;
    published_at: string | null;
    alert_id: string;
    alerts: {
        id: string;
        title: string;
        description: string | null;
        clean_url: string | null;
        url: string;
        status: string;
    } | null;
}

interface PendingAlert {
    id: string;
    title: string;
    description: string | null;
    url: string;
    clean_url: string | null;
    created_at: string;
    status: string;
    ai_classifications: {
        destination: string;
        reasoning: string | null;
    }[];
}

export default function LinkedIn() {
    const [posts, setPosts] = useState<LinkedInPost[]>([]);
    const [pendingAlerts, setPendingAlerts] = useState<PendingAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"posts" | "queue">("posts");
    const [reviewingPost, setReviewingPost] = useState<LinkedInPost | null>(null);
    const [editingPost, setEditingPost] = useState<LinkedInPost | null>(null);
    const [editContent, setEditContent] = useState("");
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([fetchPosts(), fetchPendingAlerts()]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPendingAlerts = async () => {
        try {
            // Fetch alerts classified as linkedin that don't have a post yet OR are in 'approved' stage
            const { data, error } = await supabase
                .from("alerts")
                .select(`
                    *,
                    ai_classifications (
                        destination,
                        reasoning
                    ),
                    linkedin_posts (
                        id
                    )
                `)
                .eq("ai_classifications.destination", "linkedin")
                .in("status", ["classified", "approved"])
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Filter out alerts that already have a linkedin post
            const filtered = (data as any[] || []).filter(alert =>
                !alert.linkedin_posts || alert.linkedin_posts.length === 0
            );

            setPendingAlerts(filtered);
        } catch (error: any) {
            console.error("Erro ao carregar fila:", error);
        }
    };

    const fetchPosts = async () => {
        try {
            const { data, error } = await supabase
                .from("linkedin_posts")
                .select(`
          *,
          alerts (
            id,
            title,
            description,
            clean_url,
            url,
            status
          )
        `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            // Type casting to bypass incorrect generated types
            setPosts((data as any) || []);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar posts",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const copyToClipboard = async (content: string, postId: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedId(postId);
            toast({ title: "Copiado para a área de transferência!" });
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            toast({
                title: "Erro ao copiar",
                description: "Não foi possível copiar o texto",
                variant: "destructive",
            });
        }
    };

    const saveEdit = async () => {
        if (!editingPost) return;

        try {
            const { error } = await supabase
                .from("linkedin_posts")
                .update({
                    final_content: editContent,
                    // Keep metadata in sync if needed, or just rely on final_content
                } as any)
                .eq("id", editingPost.id);

            if (error) throw error;
            toast({ title: "Post atualizado!" });
            setEditingPost(null);
            fetchPosts();
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const markAsPublished = async (postId: string) => {
        try {
            const { error } = await supabase
                .from("linkedin_posts")
                .update({
                    status: "published",
                    published_at: new Date().toISOString(),
                })
                .eq("id", postId);

            if (error) throw error;
            toast({ title: "Marcado como publicado!" });
            setReviewingPost(null);
            fetchPosts();
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const generateImage = async (postId: string, alertTitle: string) => {
        setIsGeneratingImage(true);
        try {
            // Placeholder for future Image Gen Edge Function
            // For now, we'll use a high-quality Unsplash image based on keywords
            const keywords = alertTitle.split(" ").slice(0, 3).join(",");
            const imageUrl = `https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000`; // Technology fallback

            const { error } = await supabase
                .from("linkedin_posts")
                .update({ image_url: imageUrl } as any)
                .eq("id", postId);

            if (error) throw error;
            toast({ title: "Imagem sugerida adicionada!" });

            // Update local state if reviewing
            if (reviewingPost?.id === postId) {
                setReviewingPost({ ...reviewingPost, image_url: imageUrl });
            }
            fetchPosts();
        } catch (error: any) {
            toast({
                title: "Erro ao gerar imagem",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const publishToLinkedIn = (post: LinkedInPost) => {
        const content = post.final_content || post.draft_content;
        copyToClipboard(content, post.id);

        // Open LinkedIn in a new tab
        window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank");

        toast({
            title: "LinkedIn Aberto",
            description: "O texto foi copiado. Cole-o na caixa de publicação do LinkedIn.",
        });

        // After opening, we might want to prompt the user to confirm publication
    };

    const openEditDialog = (post: LinkedInPost) => {
        setReviewingPost(null); // Close review if open
        setEditingPost(post);
        setEditContent(post.final_content || post.draft_content);
    };

    const generatePost = async (alertId: string) => {
        if (!user) return;
        setIsGenerating(alertId);
        try {
            const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
                body: { alert_id: alertId, user_id: user.id },
            });

            if (error) throw error;

            toast({
                title: "Post gerado!",
                description: "O rascunho já está disponível na aba 'Posts'."
            });

            await fetchAllData();
            setActiveTab("posts");
            // Automatically open review for the new post
            const { data: newPost } = await supabase
                .from("linkedin_posts")
                .select("*, alerts(*)")
                .eq("alert_id", alertId)
                .single();
            if (newPost) setReviewingPost(newPost as any);
        } catch (error: any) {
            toast({
                title: "Erro ao gerar post",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(null);
        }
    };

    const regeneratePost = async (postId: string, alertId: string) => {
        if (!user) return;
        setIsGenerating(postId);
        try {
            const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
                body: { alert_id: alertId, user_id: user.id },
            });

            if (error) throw error;

            toast({
                title: "Post regenerado!",
                description: "O conteúdo foi atualizado pela IA."
            });

            await fetchPosts();
        } catch (error: any) {
            toast({
                title: "Erro ao regenerar post",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(null);
        }
    };

    const deletePost = async (postId: string) => {
        try {
            const { error } = await supabase
                .from("linkedin_posts")
                .delete()
                .eq("id", postId);

            if (error) throw error;
            toast({ title: "Post excluído" });
            fetchPosts();
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const statusColors: Record<string, string> = {
        draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        published: "bg-green-500/10 text-green-500 border-green-500/20",
    };

    const statusLabels: Record<string, string> = {
        draft: "Rascunho",
        published: "Publicado",
    };

    const draftPosts = posts.filter(p => p.status === "draft");
    const publishedPosts = posts.filter(p => p.status === "published");

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <Linkedin className="h-8 w-8 text-[#0A66C2]" />
                            LinkedIn Posts
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Gerencie seus rascunhos de posts para o LinkedIn
                        </p>
                    </div>
                    <Button variant="outline" onClick={fetchPosts}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-medium">Aguardando IA</span>
                                </div>
                                <span className="text-2xl font-bold">{pendingAlerts.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-500/5 border-blue-500/20">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium">Auto-gerados</span>
                                </div>
                                <span className="text-2xl font-bold">{posts.filter(p => p.auto_generated).length}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-yellow-500/5 border-yellow-500/20">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-yellow-500" />
                                    <span className="text-sm font-medium">Rascunhos</span>
                                </div>
                                <span className="text-2xl font-bold">{draftPosts.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-500/5 border-green-500/20">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium">Publicados</span>
                                </div>
                                <span className="text-2xl font-bold">{publishedPosts.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 p-1 bg-muted rounded-lg w-full max-w-md mx-auto sm:mx-0">
                    <Button
                        variant={activeTab === "posts" ? "secondary" : "ghost"}
                        className="flex-1"
                        onClick={() => setActiveTab("posts")}
                    >
                        Posts ({posts.length})
                    </Button>
                    <Button
                        variant={activeTab === "queue" ? "secondary" : "ghost"}
                        className="flex-1"
                        onClick={() => setActiveTab("queue")}
                    >
                        Fila ({pendingAlerts.length})
                    </Button>
                </div>

                {/* Content based on Active Tab */}
                {activeTab === "queue" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Artigos Classificados para LinkedIn</h2>
                        </div>

                        {pendingAlerts.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Fila vazia</h3>
                                    <p className="text-muted-foreground text-center max-w-sm">
                                        Não há artigos novos classificados para o LinkedIn no momento.
                                    </p>
                                    <Button className="mt-4" onClick={() => navigate("/pipeline")}>
                                        Explorar Pipeline
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {pendingAlerts.map((alert) => (
                                    <Card key={alert.id} className="hover:border-primary/50 transition-colors">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-base line-clamp-1">{alert.title}</CardTitle>
                                                    <CardDescription className="line-clamp-2 mt-1">
                                                        {alert.description || "Sem descrição disponível."}
                                                    </CardDescription>
                                                </div>
                                                <Badge className="bg-primary/10 text-primary border-primary/20">
                                                    {alert.status === "approved" ? "Aprovado" : "Classificado"}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardFooter className="justify-between pt-3 border-t bg-muted/20">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(alert.created_at).toLocaleDateString("pt-BR")}
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(alert.clean_url || alert.url, "_blank")}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    Ver Fonte
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => generatePost(alert.id)}
                                                    disabled={isGenerating === alert.id}
                                                >
                                                    {isGenerating === alert.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                    ) : (
                                                        <Sparkles className="h-4 w-4 mr-1" />
                                                    )}
                                                    Gerar Post
                                                </Button>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "posts" && posts.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Linkedin className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum post ainda</h3>
                            <p className="text-muted-foreground text-center max-w-sm">
                                Comece gerando um post a partir da sua fila de artigos ou classifique novos itens no Pipeline.
                            </p>
                            <Button className="mt-4" onClick={() => setActiveTab("queue")}>
                                Ver Fila de Sugestões
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "posts" && posts.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Rascunhos</h2>
                        <div className="grid gap-4">
                            {draftPosts.map((post) => (
                                <Card key={post.id} className="hover:border-primary/50 transition-colors">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base line-clamp-1">
                                                    {post.alerts?.title || "Post sem título"}
                                                </CardTitle>
                                                <CardDescription>
                                                    {new Date(post.created_at).toLocaleDateString("pt-BR", {
                                                        day: "2-digit",
                                                        month: "long",
                                                        year: "numeric",
                                                    })}
                                                </CardDescription>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="outline" className={statusColors[post.status]}>
                                                    {statusLabels[post.status]}
                                                </Badge>
                                                {post.auto_generated && (
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] h-5">
                                                        <Sparkles className="h-3 w-3 mr-1" /> Auto
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            {post.final_content || post.draft_content}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="justify-between gap-2 pt-3 border-t">
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => copyToClipboard(post.final_content || post.draft_content, post.id)}
                                            >
                                                {copiedId === post.id ? (
                                                    <Check className="h-4 w-4 mr-1" />
                                                ) : (
                                                    <Copy className="h-4 w-4 mr-1" />
                                                )}
                                                {copiedId === post.id ? "Copiado!" : "Copiar"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEditDialog(post)}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => post.alerts?.id && regeneratePost(post.id, post.alerts.id)}
                                                disabled={isGenerating === post.id}
                                                title="Regerar conteúdo com IA"
                                            >
                                                {isGenerating === post.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4 mr-1" />
                                                )}
                                                Regerar
                                            </Button>
                                            {post.alerts && (post.alerts.clean_url || post.alerts.url) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => window.open(post.alerts!.clean_url || post.alerts!.url, "_blank")}
                                                    title="Ver artigo original"
                                                    className="px-2"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setReviewingPost(post)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Revisar
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => publishToLinkedIn(post)}
                                            >
                                                <Linkedin className="h-4 w-4 mr-1" />
                                                Publicar
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Published Section */}
                {publishedPosts.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Publicados</h2>
                        <div className="grid gap-4">
                            {publishedPosts.map((post) => (
                                <Card key={post.id} className="opacity-75">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base line-clamp-1">
                                                    {post.alerts?.title || "Post sem título"}
                                                </CardTitle>
                                                <CardDescription>
                                                    Publicado em {new Date(post.published_at || post.created_at).toLocaleDateString("pt-BR")}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="outline" className={statusColors[post.status]}>
                                                {statusLabels[post.status]}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                                            {post.final_content || post.draft_content}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Edit Dialog */}
                <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Editar Post</DialogTitle>
                            <DialogDescription>
                                Ajuste o texto do post antes de publicar no LinkedIn.
                            </DialogDescription>
                        </DialogHeader>
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[300px] font-mono text-sm"
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingPost(null)}>
                                Cancelar
                            </Button>
                            <Button onClick={saveEdit}>
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Review Dialog */}
                <Dialog open={!!reviewingPost} onOpenChange={() => setReviewingPost(null)}>
                    <DialogContent className="max-w-3xl p-0 overflow-hidden bg-[#F4F2EE]">
                        <div className="p-4 bg-white border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                                <span className="font-semibold">Prévia do LinkedIn</span>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => {
                                    if (reviewingPost) openEditDialog(reviewingPost);
                                }}>
                                    <Edit className="h-4 w-4 mr-1" /> Editar Texto
                                </Button>
                                <Button size="sm" onClick={() => markAsPublished(reviewingPost!.id)}>
                                    <Check className="h-4 w-4 mr-1" /> Confirmar Publicação
                                </Button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            {/* LinkedIn Post Skeleton */}
                            <Card className="max-w-[550px] mx-auto overflow-hidden border-none shadow-sm rounded-lg bg-white">
                                <CardHeader className="p-4 pb-2 space-y-0">
                                    <div className="flex items-start gap-2">
                                        <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                            <User className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-sm hover:text-[#0A66C2] hover:underline cursor-pointer">Seu Nome</span>
                                                <span className="text-slate-400 text-xs">• 1º</span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1">Especialista em IA | Fundador Ginga & Meupainel</p>
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <span className="text-[10px]">Agora</span>
                                                <span className="text-[10px]">•</span>
                                                <Globe className="h-2.5 w-2.5" />
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed text-[#191919]">
                                        {reviewingPost?.final_content || reviewingPost?.draft_content}
                                    </div>

                                    {reviewingPost?.image_url ? (
                                        <div className="mt-3 -mx-4 border-y border-slate-100 bg-slate-50">
                                            <img src={reviewingPost.image_url} alt="Post preview" className="w-full h-auto" />
                                        </div>
                                    ) : (
                                        <div className="mt-4 p-8 border border-dashed rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center">
                                            <ImageIcon className="h-8 w-8 text-slate-300 mb-2" />
                                            <p className="text-xs text-slate-400 max-w-[200px]">Nenhuma imagem gerada ainda para este post.</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2 text-[#0A66C2] text-xs"
                                                onClick={() => generateImage(reviewingPost!.id, reviewingPost!.alerts?.title || "")}
                                                disabled={isGeneratingImage}
                                            >
                                                {isGeneratingImage ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                                Gerar Sugestão de Imagem
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                                <div className="px-4 py-2 flex items-center justify-between border-t border-slate-100 text-slate-500">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1 cursor-not-allowed"><ThumbsUp className="h-4 w-4" /><span className="text-xs font-semibold">Gostar</span></div>
                                        <div className="flex items-center gap-1 cursor-not-allowed"><MessageSquare className="h-4 w-4" /><span className="text-xs font-semibold">Comentar</span></div>
                                        <div className="flex items-center gap-1 cursor-not-allowed"><Share2 className="h-4 w-4" /><span className="text-xs font-semibold">Compartilhar</span></div>
                                    </div>
                                    <div className="flex items-center gap-1 cursor-not-allowed">
                                        <Send className="h-4 w-4" /><span className="text-xs font-semibold">Enviar</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Workflow Checklist */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-sm font-semibold">1. Conteúdo Gerado</span>
                                    </div>
                                    <p className="text-xs text-slate-500">O texto base foi criado pela IA com sucesso.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className={cn("flex items-center gap-2", reviewingPost?.image_url ? "text-green-600" : "text-slate-400")}>
                                        {reviewingPost?.image_url ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        <span className="text-sm font-semibold">2. Mídia</span>
                                    </div>
                                    <p className="text-xs text-slate-500">{reviewingPost?.image_url ? "Imagem adicionada ao post." : "Opcional: Adicione uma imagem."}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-sm font-semibold">3. Publicação</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Clique em 'Confirmar Publicação' quando terminar.</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-4 bg-white border-t flex items-center justify-between sm:justify-between">
                            <Button variant="ghost" onClick={() => setReviewingPost(null)}>Talvez mais tarde</Button>
                            <Button onClick={() => publishToLinkedIn(reviewingPost!)} className="bg-[#0A66C2] hover:bg-[#004182]">
                                <Send className="h-4 w-4 mr-2" /> Copiar & Abrir LinkedIn
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
