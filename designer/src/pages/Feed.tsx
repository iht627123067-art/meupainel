import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Clock, Tag, Linkedin, GraduationCap, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  publisher: string | null;
  url: string;
  created_at: string;
  keywords: string[] | null;
  status: string;
}

export default function Feed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchNews();
  }, [filter]);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const baseQuery = supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const query = filter !== "all" 
        ? baseQuery.eq("status", filter as "pending" | "extracted" | "classified" | "approved" | "rejected" | "published")
        : baseQuery;

      const { data, error } = await query;
      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setIsLoading(false);
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

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
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
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Nenhuma notícia encontrada</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item, index) => (
              <article
                key={item.id}
                className="glass-card p-5 hover:border-primary/50 transition-all duration-300 animate-fade-in group"
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
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Linkedin className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <GraduationCap className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
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
