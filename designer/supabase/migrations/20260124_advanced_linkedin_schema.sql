-- Migração para arquitetura flexível de posts do LinkedIn
-- Remove colunas ad-hoc se existirem e cria estrutura baseada em JSONB

-- 1. Adiciona coluna metadata e flag de auto-geração
ALTER TABLE public.linkedin_posts 
ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Limpeza (opcional): Migrar dados das colunas antigas para o JSONB se necessário
-- UPDATE public.linkedin_posts 
-- SET ai_metadata = jsonb_build_object('image_url', image_url, 'classification_id', classification_id)
-- WHERE image_url IS NOT NULL OR classification_id IS NOT NULL;

-- 3. Comentários
COMMENT ON COLUMN public.linkedin_posts.ai_metadata IS 'Metadados flexíveis da IA (hashtags, tom, image_url, etc)';
COMMENT ON COLUMN public.linkedin_posts.auto_generated IS 'Indica se o post foi gerado automaticamente pelo sistema';

-- 4. Trigger para updated_at (caso não exista)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_linkedin_posts_updated_at') THEN
        CREATE TRIGGER update_linkedin_posts_updated_at
        BEFORE UPDATE ON public.linkedin_posts
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
