import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AlertsTable } from "@/components/dashboard/AlertsTable";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Mail, FileText, Linkedin, GraduationCap, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    extracted: 0,
    classified: 0,
    approved: 0,
    total: 0,
    linkedin: 0,
    research: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Calculate stats
      const { data: allAlerts } = await supabase
        .from("alerts")
        .select("status");

      const pending = allAlerts?.filter((a) => a.status === "pending").length || 0;
      const extracted = allAlerts?.filter((a) => a.status === "extracted").length || 0;
      const classified = allAlerts?.filter((a) => a.status === "classified").length || 0;
      const approved = allAlerts?.filter((a) => a.status === "approved").length || 0;

      const { count: linkedinCount } = await supabase
        .from("linkedin_posts")
        .select("*", { count: "exact", head: true });

      const { count: researchCount } = await supabase
        .from("research_materials")
        .select("*", { count: "exact", head: true });

      setStats({
        pending,
        extracted,
        classified,
        approved,
        total: allAlerts?.length || 0,
        linkedin: linkedinCount || 0,
        research: researchCount || 0,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;
      
      toast({ title: "Alerta aprovado!" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;
      
      toast({ title: "Alerta rejeitado" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const pipelineStages = [
    { id: "pending", label: "Pendentes", count: stats.pending, isActive: true },
    { id: "extracted", label: "Extraídos", count: stats.extracted },
    { id: "classified", label: "Classificados", count: stats.classified },
    { id: "approved", label: "Aprovados", count: stats.approved, isCompleted: stats.approved > 0 },
  ];

  const activities = [
    { id: "1", type: "email" as const, title: "Novo alerta recebido", description: "Google Alerts - Tecnologia", time: "há 5 min" },
    { id: "2", type: "approved" as const, title: "Artigo aprovado", description: "IA na Educação", time: "há 15 min" },
    { id: "3", type: "linkedin" as const, title: "Post criado", description: "Rascunho para LinkedIn", time: "há 1h" },
    { id: "4", type: "research" as const, title: "Material arquivado", description: "Adicionado à tese", time: "há 2h" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral dos seus alertas e conteúdos
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Alertas Pendentes"
            value={stats.pending}
            icon={Clock}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Total Processado"
            value={stats.total}
            icon={CheckCircle}
          />
          <StatsCard
            title="Posts LinkedIn"
            value={stats.linkedin}
            icon={Linkedin}
          />
          <StatsCard
            title="Material Pesquisa"
            value={stats.research}
            icon={GraduationCap}
          />
        </div>

        {/* Pipeline */}
        <PipelineCard stages={pipelineStages} />

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Alertas Recentes</h2>
            </div>
            <AlertsTable
              alerts={alerts}
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={isLoading}
            />
          </div>
          <div>
            <RecentActivity activities={activities} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
