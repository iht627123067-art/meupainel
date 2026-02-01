import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Clock, Tag, Linkedin, GraduationCap, Archive, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn, getDisplayUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  publisher: string | null;
  url: string;
  clean_url?: string | null;
  created_at: string;
  keywords: string[] | null;
  status: string;
}

export default function Feed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchNews();
  }, [filter]);

  // Filter news based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setNews(allNews);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = allNews.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = item.description?.toLowerCase().includes(searchLower);
      const publisherMatch = item.publisher?.toLowerCase().includes(searchLower);
      const keywordsMatch = item.keywords?.some((kw) => kw.toLowerCase().includes(searchLower));
      
      return titleMatch || descriptionMatch || publisherMatch || keywordsMatch;
    });

    setNews(filtered);
  }, [searchTerm, allNews]);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const baseQuery = supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100); // Increased limit to allow better search results

      const query = filter !== "all"
        ? baseQuery.eq("status", filter as "pending" | "extracted" | "classified" | "approved" | "rejected" | "published")
        : baseQuery;

      const { data, error } = await query;
      if (error) throw error;
      
      const fetchedData = data || [];
      setAllNews(fetchedData);
      // The useEffect will handle filtering based on searchTerm
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "Erro ao carregar notícias",
        description: "Não foi possível carregar as notícias. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDestination = async (alertId: string, destination: "linkedin" | "thesis" | "archive") => {
    if (processingId === alertId) return; // Prevent double clicks
    
    setProcessingId(alertId);
    try {
      // Upsert classification with destination
      const { error: classificationError } = await supabase
        .from("ai_classifications")
        .upsert(
          {
            alert_id: alertId,
            destination,
            confidence_score: 1.0,
            reasoning: `Classificado manualmente como ${destination}`,
            created_at: new Date().toISOString(),
          },
          { onConflict: "alert_id" }
        );

      if (classificationError) throw classificationError;

      // Update alert status based on destination
      let newStatus = "classified";
      if (destination === "linkedin") {
        newStatus = "approved";
      } else if (destination === "archive") {
        newStatus = "rejected";
      }

      const { error: statusError } = await supabase
        .from("alerts")
        .update({ status: newStatus })
        .eq("id", alertId);

      if (statusError) throw statusError;

      const destinationLabels: Record<string, string> = {
        linkedin: "LinkedIn",
        thesis: "Pesquisa/Tese",
        archive: "Arquivo",
      };

      toast({
        title: "Classificação atualizada",
        description: `Item direcionado para ${destinationLabels[destination]}`,
      });

      // Refresh the list
      await fetchNews();
    } catch (error: any) {
      console.error("Error setting destination:", error);
      toast({
        title: "Erro ao classificar",
        description: error.message || "Não foi possível atualizar a classificação",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filters = [
    { id: "all", label: "Todos" },
    { id: "approved", label: "Aprovados" },
    { id: "pending", label: "Pendentes" },
    { id: "classified", label: "Classificados" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feed de Notícias</h1>
          <p className="text-muted-foreground mt-1">
            Conteúdos curados e direcionados para você
          </p>
        </div>

        {/* Search Bar */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, descrição, fonte ou palavras-chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 h-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchTerm("")}
                    title="Limpar pesquisa"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {searchTerm && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {news.length === 0 
                    ? "Nenhum resultado encontrado" 
                    : `${news.length} ${news.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}`
                  }
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar por status:</span>
          {filters.map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* News Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : news.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-4">
            <p className="text-muted-foreground text-lg">
              {searchTerm 
                ? "Nenhuma notícia encontrada para sua pesquisa" 
                : "Nenhuma notícia encontrada"}
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar pesquisa
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item, index) => (
              <article
                key={item.id}
                className="glass-card p-5 hover:border-primary/50 transition-all duration-300 animate-fade-in group cursor-default"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="space-y-3">
                  {/* Publisher & Date */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{item.publisher || "Fonte desconhecida"}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Keywords */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {item.keywords.slice(0, 3).map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <Tag className="h-2.5 w-2.5 mr-1" />
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDestination(item.id, "linkedin");
                        }}
                        disabled={processingId === item.id}
                        title="Direcionar para LinkedIn"
                      >
                        {processingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Linkedin className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 hover:bg-purple-500/10 hover:text-purple-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDestination(item.id, "thesis");
                        }}
                        disabled={processingId === item.id}
                        title="Direcionar para Pesquisa/Tese"
                      >
                        {processingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <GraduationCap className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 hover:bg-gray-500/10 hover:text-gray-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDestination(item.id, "archive");
                        }}
                        disabled={processingId === item.id}
                        title="Arquivar"
                      >
                        {processingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <a
                      href={getDisplayUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                      title="Abrir artigo original"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
