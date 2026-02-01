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
    ClipboardEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { cleanUrl } from "@/utils/urlUtils";
import { BulkActionsBar } from "@/components/shared/BulkActionsBar";
import { GenerationProgressModal } from "@/components/shared/GenerationProgressModal";
import { detectSimilarArticles, DisplayEntry, sortDisplayListByScore } from "@/utils/clusterUtils";
import { ClusterRssCard } from "@/components/rss/ClusterRssCard";

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
    duplicate_group_id?: string | number;
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressStage, setProgressStage] = useState<'preparing' | 'generating' | 'saving' | 'complete' | 'error'>('preparing');
    const [generationError, setGenerationError] = useState<string>();
    const [importedAlertIds, setImportedAlertIds] = useState<string[]>([]);
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const fetchFeeds = async () => {
        setIsLoadingFeeds(true);
        try {
            const { data, error } = await supabase
                .from("rss_feeds")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setFeeds(data || []);
        } catch (error) {
            toast({
                title: "Erro ao carregar feeds",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsLoadingFeeds(false);
        }
    };

    useEffect(() => {
        fetchFeeds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

            const fetchedArticles: RssArticle[] = data.articles || [];

            // Detect similar articles and create clusters
            // Only process articles that are not already marked as duplicates
            const newArticles = fetchedArticles.filter(a => !a.is_duplicate);
            const duplicateArticles = fetchedArticles.filter(a => a.is_duplicate);

            // Detect similar articles and group them
            // Increased thresholds to avoid "broad" clustering (misgrouping distinct news)
            const displayList = detectSimilarArticles(newArticles, {
                titleSimilarityThreshold: 0.85,
                urlSimilarityThreshold: 0.9,
                requireBothSimilar: false,
                prioritizeCleanUrl: true,
            });

            // Flatten display list back to articles array with duplicate_group_id
            const clusteredArticles: RssArticle[] = [];
            displayList.forEach(entry => {
                if (entry.type === 'cluster') {
                    entry.items.forEach(article => {
                        clusteredArticles.push({
                            ...article,
                            duplicate_group_id: entry.groupId,
                        });
                    });
                } else {
                    clusteredArticles.push(entry.item);
                }
            });

            // Add duplicate articles back (they don't need clustering)
            const allArticles = [...clusteredArticles, ...duplicateArticles];

            setArticles(allArticles);
            setFeedTitle(data.feed_title || "Feed RSS");

            if (data.articles.length === 0) {
                toast({
                    title: "Nenhum artigo encontrado",
                    description: `Não há artigos nas últimas ${hoursFilter} horas`,
                });
            } else {
                const clusterCount = displayList.filter(e => e.type === 'cluster').length;
                toast({
                    title: `${data.total} artigos encontrados`,
                    description: data.duplicates > 0
                        ? `${data.duplicates} já importados${clusterCount > 0 ? ` • ${clusterCount} clusters de similares` : ''}`
                        : clusterCount > 0
                            ? `${clusterCount} clusters de artigos similares detectados`
                            : "Todos são novos!",
                });
            }
        } catch (error) {
            toast({
                title: "Erro ao buscar artigos",
                description: error instanceof Error ? error.message : "Erro desconhecido",
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

    const importArticles = async (targetStatus: 'pending' | 'needs_review' = 'pending') => {
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
                    status: targetStatus,
                    is_valid: cleaningResult.valid,
                    keywords: [],
                };
            });

            const { error } = await supabase
                .from("alerts")
                .insert(alertsToInsert);

            if (error) throw error;

            if (targetStatus === 'needs_review') {
                toast({
                    title: `${alertsToInsert.length} artigos enviados para revisão!`,
                    description: "Redirecionando para a página de revisão...",
                });
                setTimeout(() => navigate("/review"), 1000);
            } else {
                toast({
                    title: `${alertsToInsert.length} artigos importados!`,
                    description: "Veja no Pipeline → Pendentes",
                });
            }

            // Mark imported articles as duplicates
            setArticles(prev => prev.map(a =>
                selectedArticles.has(a.guid) ? { ...a, is_duplicate: true } : a
            ));
            setSelectedArticles(new Set());
        } catch (error) {
            toast({
                title: "Erro ao importar",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
        }
    };

    // Handle cluster import: import only selected article, mark others as duplicates
    const handleClusterImport = async (
        selectedGuid: string,
        allGuids: string[],
        targetStatus: 'pending' | 'needs_review'
    ) => {
        if (!user) return;

        setIsImporting(true);
        try {
            // Find the selected article
            const selectedArticle = articles.find(a => a.guid === selectedGuid);
            if (!selectedArticle) {
                throw new Error("Artigo selecionado não encontrado");
            }

            // Import only the selected article
            const cleaningResult = cleanUrl(selectedArticle.url);
            const alertToInsert = {
                user_id: user.id,
                source_type: "rss" as const,
                rss_feed_id: activeFeedId,
                title: selectedArticle.title,
                description: selectedArticle.description,
                url: selectedArticle.url,
                clean_url: cleaningResult.cleanUrl || null,
                source_url: selectedArticle.source_url,
                publisher: selectedArticle.publisher,
                status: targetStatus,
                is_valid: cleaningResult.valid,
                keywords: [],
            };

            const { error } = await supabase
                .from("alerts")
                .insert(alertToInsert);

            if (error) throw error;

            // Mark all articles in the cluster as duplicates (including the selected one)
            setArticles(prev => prev.map(a =>
                allGuids.includes(a.guid) ? { ...a, is_duplicate: true } : a
            ));

            // Remove from selection
            setSelectedArticles(prev => {
                const newSet = new Set(prev);
                allGuids.forEach(guid => newSet.delete(guid));
                return newSet;
            });

            if (targetStatus === 'needs_review') {
                toast({
                    title: "Artigo importado para revisão!",
                    description: "Redirecionando para a página de revisão...",
                });
                setTimeout(() => navigate("/review"), 1000);
            } else {
                toast({
                    title: "Artigo importado!",
                    description: `${allGuids.length - 1} artigos similares foram descartados`,
                });
            }
        } catch (error) {
            toast({
                title: "Erro ao importar cluster",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
        }
    };

    // Handle cluster discard: mark all articles as duplicates without importing
    const handleClusterDiscard = async (selectedGuid: string, allGuids: string[]) => {
        // Just mark all as duplicates without importing
        setArticles(prev => prev.map(a =>
            allGuids.includes(a.guid) ? { ...a, is_duplicate: true } : a
        ));

        // Remove from selection
        setSelectedArticles(prev => {
            const newSet = new Set(prev);
            allGuids.forEach(guid => newSet.delete(guid));
            return newSet;
        });

        toast({
            title: "Cluster descartado",
            description: `${allGuids.length} artigos marcados como duplicatas`,
        });
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
                {articles.length > 0 && (() => {
                    // Create display list: group articles by duplicate_group_id
                    // Filter out already imported articles from display (but keep count)
                    const newArticles = articles.filter(a => !a.is_duplicate);
                    const duplicateCount = articles.filter(a => a.is_duplicate).length;

                    const displayList: DisplayEntry<RssArticle>[] = [];

                    // Group articles by duplicate_group_id
                    const grouped = new Map<string | number, RssArticle[]>();
                    const singles: RssArticle[] = [];

                    newArticles.forEach(article => {
                        if (article.duplicate_group_id) {
                            const groupId = article.duplicate_group_id;
                            if (!grouped.has(groupId)) {
                                grouped.set(groupId, []);
                            }
                            grouped.get(groupId)!.push(article);
                        } else {
                            singles.push(article);
                        }
                    });

                    // Add clusters
                    grouped.forEach((items, groupId) => {
                        if (items.length > 1) {
                            displayList.push({
                                type: 'cluster',
                                items,
                                groupId,
                            });
                        } else {
                            // Single item with duplicate_group_id but no cluster
                            singles.push(items[0]);
                        }
                    });

                    // Add single articles
                    singles.forEach(article => {
                        displayList.push({
                            type: 'single',
                            item: article,
                        });
                    });

                    // Sort by published date (newest first)
                    displayList.sort((a, b) => {
                        const dateA = a.type === 'single'
                            ? new Date(a.item.published_at).getTime()
                            : Math.max(...a.items.map(i => new Date(i.published_at).getTime()));
                        const dateB = b.type === 'single'
                            ? new Date(b.item.published_at).getTime()
                            : Math.max(...b.items.map(i => new Date(i.published_at).getTime()));
                        return dateB - dateA;
                    });

                    const totalNew = newArticles.length;
                    const clusterCount = displayList.filter(e => e.type === 'cluster').length;

                    return (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold flex items-center gap-2">
                                        {feedTitle}
                                        <Badge variant="secondary">{totalNew} novos</Badge>
                                        {duplicateCount > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                {duplicateCount} já importados
                                            </Badge>
                                        )}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedArticles.size} selecionados
                                        {clusterCount > 0 && ` • ${clusterCount} clusters de similares`}
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
                                        onClick={() => importArticles('needs_review')}
                                        disabled={selectedArticles.size === 0 || isImporting}
                                        className="bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 dark:bg-orange-950/20 dark:border-orange-900/40"
                                    >
                                        <ClipboardEdit className="h-4 w-4 mr-2" />
                                        Revisar ({selectedArticles.size})
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => importArticles('pending')}
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
                                {displayList.map((entry, idx) => {
                                    if (entry.type === 'cluster') {
                                        const clusterArticles = entry.items;
                                        return (
                                            <div
                                                key={`cluster-${entry.groupId}`}
                                                className="relative animate-in fade-in slide-in-from-bottom-4"
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <ClusterRssCard
                                                    articles={clusterArticles}
                                                    onImport={handleClusterImport}
                                                    onDiscard={handleClusterDiscard}
                                                    isImporting={isImporting}
                                                />
                                            </div>
                                        );
                                    } else {
                                        const article = entry.item;
                                        return (
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
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </DashboardLayout>
    );
}
