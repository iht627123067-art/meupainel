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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedInPost {
    id: string;
    draft_content: string;
    final_content: string | null;
    status: string;
    created_at: string;
    published_at: string | null;
    alert_id: string;
    alerts: {
        title: string;
        clean_url: string | null;
        url: string;
    } | null;
}

export default function LinkedIn() {
    const [posts, setPosts] = useState<LinkedInPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPost, setEditingPost] = useState<LinkedInPost | null>(null);
    const [editContent, setEditContent] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("linkedin_posts")
                .select(`
          *,
          alerts (
            title,
            clean_url,
            url
          )
        `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar posts",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
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

    const openEditDialog = (post: LinkedInPost) => {
        setEditingPost(post);
        setEditContent(post.final_content || post.draft_content);
    };

    const saveEdit = async () => {
        if (!editingPost) return;

        try {
            const { error } = await supabase
                .from("linkedin_posts")
                .update({ final_content: editContent })
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
            fetchPosts();
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
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
                <div className="grid grid-cols-2 gap-4">
                    <Card>
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
                    <Card>
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

                {/* Empty State */}
                {posts.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Linkedin className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum post ainda</h3>
                            <p className="text-muted-foreground text-center max-w-sm">
                                Classifique alertas como "LinkedIn" no Pipeline para gerar rascunhos de posts automaticamente.
                            </p>
                            <Button className="mt-4" onClick={() => navigate("/pipeline")}>
                                Ir para Pipeline
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Drafts Section */}
                {draftPosts.length > 0 && (
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
                                            <Badge variant="outline" className={statusColors[post.status]}>
                                                {statusLabels[post.status]}
                                            </Badge>
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
                                                variant="destructive"
                                                onClick={() => deletePost(post.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => markAsPublished(post.id)}
                                            >
                                                <Send className="h-4 w-4 mr-1" />
                                                Marcar Publicado
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
            </div>
        </DashboardLayout>
    );
}
