import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Rss,
    RefreshCw,
    ExternalLink,
    Clock,
    Check,
    AlertCircle,
    Loader2,
    Download,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { cleanUrl } from "@/utils/urlUtils";

interface RssFeed {
    id: string;
    url: string;
    title: string | null;
    is_active: boolean;
    last_fetched_at: string | null;
}

interface RssArticle {
    title: string;
    description: string | null;
    url: string;
    source_url: string | null;
    publisher: string | null;
    published_at: string;
    guid: string;
    image_url: string | null;
    categories: string[];
    is_duplicate: boolean;
}

export default function RssPage() {
    const [feeds, setFeeds] = useState<RssFeed[]>([]);
    const [articles, setArticles] = useState<RssArticle[]>([]);
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
    const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
    const [hoursFilter, setHoursFilter] = useState("12");
    const [feedTitle, setFeedTitle] = useState("");
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        fetchFeeds();
    }, []);

    const fetchFeeds = async () => {
        setIsLoadingFeeds(true);
        try {
            const { data, error } = await supabase
                .from("rss_feeds")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setFeeds(data || []);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar feeds",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoadingFeeds(false);
        }
    };

    const fetchArticles = async (feedId: string) => {
        setIsFetching(true);
        setActiveFeedId(feedId);
        setArticles([]);
        setSelectedArticles(new Set());

        try {
            const { data, error } = await supabase.functions.invoke("fetch-rss", {
                body: {
                    feed_id: feedId,
                    hours_filter: parseInt(hoursFilter),
                    user_id: user?.id,
                    check_duplicates: true,
                },
            });

            if (error) throw error;

            setArticles(data.articles || []);
            setFeedTitle(data.feed_title || "Feed RSS");

            if (data.articles.length === 0) {
                toast({
                    title: "Nenhum artigo encontrado",
                    description: `Não há artigos nas últimas ${hoursFilter} horas`,
                });
            } else {
                toast({
                    title: `${data.total} artigos encontrados`,
                    description: data.duplicates > 0
                        ? `${data.duplicates} já importados anteriormente`
                        : "Todos são novos!",
                });
            }
        } catch (error: any) {
            toast({
                title: "Erro ao buscar artigos",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsFetching(false);
        }
    };

    const toggleArticle = (guid: string) => {
        const newSelected = new Set(selectedArticles);
        if (newSelected.has(guid)) {
            newSelected.delete(guid);
        } else {
            newSelected.add(guid);
        }
        setSelectedArticles(newSelected);
    };

    const selectAllNew = () => {
        const newArticles = articles.filter(a => !a.is_duplicate);
        setSelectedArticles(new Set(newArticles.map(a => a.guid)));
    };

    const selectNone = () => {
        setSelectedArticles(new Set());
    };

    const importSelected = async () => {
        if (selectedArticles.size === 0 || !user) return;

        setIsImporting(true);
        try {
            const articlesToImport = articles.filter(a => selectedArticles.has(a.guid));

            const alertsToInsert = articlesToImport.map(article => {
                const cleaningResult = cleanUrl(article.url);
                return {
                    user_id: user.id,
                    source_type: "rss" as const,
                    rss_feed_id: activeFeedId,
                    title: article.title,
                    description: article.description,
                    url: article.url,
                    clean_url: cleaningResult.cleanUrl || null,
                    source_url: article.source_url,
                    publisher: article.publisher,
                    status: "pending" as const,
                    is_valid: cleaningResult.valid,
                    keywords: [],
                };
            });

            const { error } = await supabase
                .from("alerts")
                .insert(alertsToInsert);

            if (error) throw error;

            toast({
                title: `${alertsToInsert.length} artigos importados!`,
                description: "Veja no Pipeline → Pendentes",
            });

            // Mark imported articles as duplicates
            setArticles(prev => prev.map(a =>
                selectedArticles.has(a.guid) ? { ...a, is_duplicate: true } : a
            ));
            setSelectedArticles(new Set());
        } catch (error: any) {
            toast({
                title: "Erro ao importar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
        }
    };

    const formatTimeAgo = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 60) return `há ${diffMins} min`;
        if (diffHours < 24) return `há ${diffHours}h`;
        return `há ${Math.floor(diffHours / 24)} dias`;
    };

    if (isLoadingFeeds) {
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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <Rss className="h-8 w-8 text-orange-500" />
                            Feeds RSS
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Acompanhe notícias de diversas fontes
                        </p>
                    </div>
                    <Link to="/settings">
                        <Button variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Gerenciar Feeds
                        </Button>
                    </Link>
                </div>

                {/* No Feeds State */}
                {feeds.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Rss className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum feed cadastrado</h3>
                            <p className="text-muted-foreground text-center max-w-sm mb-4">
                                Adicione feeds RSS em Configurações para começar a acompanhar notícias.
                            </p>
                            <Link to="/settings">
                                <Button>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Adicionar Feed
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Feeds List */}
                {feeds.length > 0 && (
                    <div className="space-y-4">
                        {/* Filter */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">Buscar artigos das últimas:</span>
                            <Select value={hoursFilter} onValueChange={setHoursFilter}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6">6 horas</SelectItem>
                                    <SelectItem value="12">12 horas</SelectItem>
                                    <SelectItem value="24">24 horas</SelectItem>
                                    <SelectItem value="48">48 horas</SelectItem>
                                    <SelectItem value="72">72 horas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Feed Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {feeds.map((feed) => (
                                <Card
                                    key={feed.id}
                                    className={cn(
                                        "hover:border-primary/50 transition-colors",
                                        activeFeedId === feed.id && "border-primary"
                                    )}
                                >
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Rss className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                            <span className="truncate">{feed.title || "Feed RSS"}</span>
                                        </CardTitle>
                                        <CardDescription className="truncate text-xs">
                                            {feed.url}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {feed.last_fetched_at
                                                ? `Última busca: ${formatTimeAgo(feed.last_fetched_at)}`
                                                : "Nunca buscado"}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            className="w-full"
                                            onClick={() => fetchArticles(feed.id)}
                                            disabled={isFetching}
                                        >
                                            {isFetching && activeFeedId === feed.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Buscando...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                    Buscar Notícias
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Articles Preview */}
                {articles.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    {feedTitle}
                                    <Badge variant="secondary">{articles.length} artigos</Badge>
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {selectedArticles.size} selecionados • {articles.filter(a => a.is_duplicate).length} já importados
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={selectAllNew}>
                                    Selecionar Novos
                                </Button>
                                <Button variant="outline" size="sm" onClick={selectNone}>
                                    Limpar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={importSelected}
                                    disabled={selectedArticles.size === 0 || isImporting}
                                >
                                    {isImporting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4 mr-2" />
                                    )}
                                    Importar ({selectedArticles.size})
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {articles.map((article) => (
                                <Card
                                    key={article.guid}
                                    className={cn(
                                        "transition-all cursor-pointer hover:shadow-md",
                                        selectedArticles.has(article.guid) && "border-primary bg-primary/5",
                                        article.is_duplicate && "opacity-60 bg-muted/50"
                                    )}
                                    onClick={() => !article.is_duplicate && toggleArticle(article.guid)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={selectedArticles.has(article.guid)}
                                                disabled={article.is_duplicate}
                                                onCheckedChange={() => toggleArticle(article.guid)}
                                                className="mt-1 shrink-0"
                                            />

                                            {/* Article Image */}
                                            {article.image_url && (
                                                <div className="hidden sm:block shrink-0">
                                                    <img
                                                        src={article.image_url}
                                                        alt=""
                                                        className="h-24 w-32 object-cover rounded-md border bg-muted"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-semibold text-base line-clamp-2 leading-tight">
                                                        {article.title}
                                                    </h3>
                                                    {article.is_duplicate && (
                                                        <Badge variant="secondary" className="shrink-0 text-xs">
                                                            <Check className="h-3 w-3 mr-1" />
                                                            Importado
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">{article.publisher}</span>
                                                    <span>•</span>
                                                    <span>{formatTimeAgo(article.published_at)}</span>
                                                </div>

                                                {/* Categories */}
                                                {article.categories && article.categories.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {article.categories.map((cat, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                                {cat}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                {article.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {article.description}
                                                    </p>
                                                )}

                                                <a
                                                    href={article.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Ler notícia original
                                                </a>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
