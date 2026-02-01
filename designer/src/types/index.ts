// Shared TypeScript types for the application

export type AlertStatus = "pending" | "extracted" | "classified" | "approved" | "rejected" | "published" | "needs_review";

export interface Alert {
    id: string;
    title: string;
    description: string | null;
    publisher: string | null;
    url: string;
    source_url: string | null;
    clean_url: string | null;
    email_subject: string | null;
    email_date: string | null;
    email_id: string | null;
    status: AlertStatus;
    is_valid: boolean;
    keywords: string[] | null;
    created_at: string;
    duplicate_group_id?: string | null;
    personalization_score?: number | null;
}

export interface PipelineItem {
    id: string;
    title: string;
    description: string | null;
    publisher: string | null;
    status: string;
    created_at: string;
    url: string;
    source_url?: string | null;
    clean_url: string | null;
    is_valid: boolean;
    email_date?: string | null;
    personalization_score?: number | null;
    keywords?: string[] | null;
    classification?: string | null;
    duplicate_group_id?: string | null;
    linkedin_posts?: {
        id: string;
        status: string;
        created_at: string;
    }[];
}

export type StageId = "pending" | "extracted" | "classified" | "approved" | "published" | "needs_review";

export interface Stage {
    id: StageId;
    label: string;
    description: string;
    icon: any; // LucideIcon type
    color: string;
    bgColor: string;
}

// Handler types
export type AlertHandler = (id: string) => void | Promise<void>;
export type VoidHandler = () => void | Promise<void>;

// API Response types
export interface ExtractionResult {
    word_count: number;
    quality_score: number;
}

export interface ClassificationResult {
    success: boolean;
    destination?: string;
    confidence_score?: number;
    reasoning?: string;
    error?: string;
}
