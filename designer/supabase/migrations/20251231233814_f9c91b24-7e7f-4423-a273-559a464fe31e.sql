-- Enum para status do pipeline
CREATE TYPE public.alert_status AS ENUM ('pending', 'extracted', 'classified', 'approved', 'rejected', 'published');

-- Enum para classificação de destino
CREATE TYPE public.content_destination AS ENUM ('linkedin', 'thesis', 'debate', 'archive');

-- Enum para tipo de fonte
CREATE TYPE public.source_type AS ENUM ('gmail_alert', 'rss');

-- Tabela de contas de email configuradas
CREATE TABLE public.email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    label TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de feeds RSS
CREATE TABLE public.rss_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    is_active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela principal de alertas extraídos
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    source_type source_type NOT NULL DEFAULT 'gmail_alert',
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE SET NULL,
    rss_feed_id UUID REFERENCES public.rss_feeds(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    publisher TEXT,
    url TEXT NOT NULL,
    clean_url TEXT,
    email_subject TEXT,
    email_date TIMESTAMPTZ,
    email_id TEXT,
    status alert_status DEFAULT 'pending',
    is_valid BOOLEAN DEFAULT true,
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_group_id UUID,
    keywords TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de conteúdo extraído (markdown)
CREATE TABLE public.extracted_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE NOT NULL UNIQUE,
    markdown_content TEXT,
    cleaned_content TEXT,
    word_count INTEGER,
    quality_score DECIMAL(3,2),
    extraction_status TEXT DEFAULT 'pending',
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de classificações por IA
CREATE TABLE public.ai_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE NOT NULL,
    destination content_destination NOT NULL,
    confidence_score DECIMAL(3,2),
    reasoning TEXT,
    suggested_text TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de posts do LinkedIn
CREATE TABLE public.linkedin_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
    draft_content TEXT NOT NULL,
    final_content TEXT,
    status TEXT DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de materiais para tese/debate
CREATE TABLE public.research_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    tags TEXT[],
    notes TEXT,
    is_thesis BOOLEAN DEFAULT false,
    is_debate BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies para email_accounts
CREATE POLICY "Users can view their own email accounts"
ON public.email_accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email accounts"
ON public.email_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email accounts"
ON public.email_accounts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email accounts"
ON public.email_accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para rss_feeds
CREATE POLICY "Users can view their own rss feeds"
ON public.rss_feeds FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rss feeds"
ON public.rss_feeds FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rss feeds"
ON public.rss_feeds FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rss feeds"
ON public.rss_feeds FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para alerts
CREATE POLICY "Users can view their own alerts"
ON public.alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para extracted_content (via alert ownership)
CREATE POLICY "Users can view their extracted content"
ON public.extracted_content FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.alerts WHERE alerts.id = extracted_content.alert_id AND alerts.user_id = auth.uid()));

CREATE POLICY "Users can insert their extracted content"
ON public.extracted_content FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.alerts WHERE alerts.id = extracted_content.alert_id AND alerts.user_id = auth.uid()));

CREATE POLICY "Users can update their extracted content"
ON public.extracted_content FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.alerts WHERE alerts.id = extracted_content.alert_id AND alerts.user_id = auth.uid()));

-- RLS Policies para ai_classifications
CREATE POLICY "Users can view their ai classifications"
ON public.ai_classifications FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.alerts WHERE alerts.id = ai_classifications.alert_id AND alerts.user_id = auth.uid()));

CREATE POLICY "Users can insert their ai classifications"
ON public.ai_classifications FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.alerts WHERE alerts.id = ai_classifications.alert_id AND alerts.user_id = auth.uid()));

CREATE POLICY "Users can update their ai classifications"
ON public.ai_classifications FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.alerts WHERE alerts.id = ai_classifications.alert_id AND alerts.user_id = auth.uid()));

-- RLS Policies para linkedin_posts
CREATE POLICY "Users can view their linkedin posts"
ON public.linkedin_posts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their linkedin posts"
ON public.linkedin_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their linkedin posts"
ON public.linkedin_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their linkedin posts"
ON public.linkedin_posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para research_materials
CREATE POLICY "Users can view their research materials"
ON public.research_materials FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their research materials"
ON public.research_materials FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their research materials"
ON public.research_materials FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their research materials"
ON public.research_materials FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_accounts_updated_at
BEFORE UPDATE ON public.email_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linkedin_posts_updated_at
BEFORE UPDATE ON public.linkedin_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_alerts_user_status ON public.alerts(user_id, status);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX idx_alerts_keywords ON public.alerts USING GIN(keywords);