import {
    Clock,
    FileText,
    Brain,
    CheckCircle,
    Send,
    AlertTriangle
} from "lucide-react";
import type { Stage, StageId, AlertStatus } from "@/types";

// Alert Status Labels
export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
    pending: "Pendente",
    extracted: "Extraído",
    classified: "Classificado",
    approved: "Aprovado",
    rejected: "Rejeitado",
    published: "Publicado",
    needs_review: "Revisão Manual",
};

// Pipeline Stages Configuration
export const PIPELINE_STAGES: Stage[] = [
    {
        id: "pending",
        label: "Pendentes",
        description: "Aguardando revisão",
        icon: Clock,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10 border-yellow-500/20",
    },
    {
        id: "extracted",
        label: "Extraídos",
        description: "Conteúdo extraído",
        icon: FileText,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10 border-blue-500/20",
    },
    {
        id: "classified",
        label: "Classificados",
        description: "Classificado por IA",
        icon: Brain,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10 border-purple-500/20",
    },
    {
        id: "approved",
        label: "Aprovados",
        description: "Pronto para publicar",
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-500/10 border-green-500/20",
    },
    {
        id: "published",
        label: "Publicados",
        description: "Finalizado",
        icon: Send,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
        id: "needs_review",
        label: "Revisão Manual",
        description: "Requer atenção",
        icon: AlertTriangle,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10 border-orange-500/20",
    },
];

// Stage Labels for transitions
export const STAGE_LABELS: Record<StageId, string> = {
    pending: "Pendentes",
    extracted: "Extraídos",
    classified: "Classificados",
    approved: "Aprovados",
    published: "Publicados",
    needs_review: "Revisão Manual",
};

// Action Labels by Stage
export const ACTION_LABELS: Record<StageId, string> = {
    pending: "Extrair",
    extracted: "Classificar",
    classified: "Aprovar",
    approved: "Publicar",
    published: "Avançar",
    needs_review: "Revisar",
};

// Classification Destination Labels
export const CLASSIFICATION_LABELS: Record<string, string> = {
    linkedin: "LinkedIn",
    thesis: "Tese/Pesquisa",
    debate: "Debate",
    archive: "Arquivo",
};

// Toast Messages
export const TOAST_MESSAGES = {
    ALERT_APPROVED: "Alerta aprovado!",
    ALERT_REJECTED: "Alerta rejeitado",
    ITEM_REJECTED: "Item rejeitado",
    ITEM_DELETED: "Item excluído",
    CONTENT_EXTRACTED: "Conteúdo extraído!",
    POST_GENERATED: "Post gerado!",
    POST_GENERATED_DESC: "Rascunho criado. Acesse a página LinkedIn para revisar.",
    ERROR_LOAD_ALERTS: "Erro ao carregar alertas",
    ERROR_LOAD_PIPELINE: "Erro ao carregar pipeline",
    ERROR_EXTRACTION: "Erro na extração",
    ERROR_CLASSIFICATION: "Erro na classificação",
    ERROR_GENERATE_POST: "Erro ao gerar post",
    ERROR_GENERIC: "Erro",
    ERROR_USER_NOT_AUTH: "User not authenticated",
} as const;

// Stage Order for navigation
export const STAGE_ORDER: StageId[] = ["pending", "extracted", "classified", "approved", "published", "needs_review"];

// Available status filters
export const STATUS_FILTERS: AlertStatus[] = [
    "pending",
    "extracted",
    "classified",
    "approved",
    "rejected",
    "published",
    "needs_review",
];
