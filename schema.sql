
-- 1. Garantir que a tabela existe com a restrição de exclusão em cascata
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  json_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar duplicidade ou conflitos
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.user_data;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios dados" ON public.user_data;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON public.user_data;
DROP POLICY IF EXISTS "Permitir tudo para o próprio usuário" ON public.user_data;

-- 4. Criar política unificada e robusta para usuários autenticados
-- O Supabase usa 'authenticated' como role padrão para usuários logados
CREATE POLICY "Permitir tudo para o próprio usuário" 
ON public.user_data 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Garantir permissões de acesso ao schema public
GRANT ALL ON TABLE public.user_data TO authenticated;
GRANT ALL ON TABLE public.user_data TO service_role;
