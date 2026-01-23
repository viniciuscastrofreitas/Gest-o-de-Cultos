
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
// Nota: A chave sb_publishable é válida em ambientes específicos de desenvolvimento rápido.
const supabaseUrl = 'https://suciiybkjxhbldwfwgnq.supabase.co';
const supabaseKey = 'sb_publishable_Qm1_2UMd2Y0lTKMR6jgpSA_Dd4taZOh';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Verifica se a conexão com o banco de dados está ativa e se a tabela user_data existe.
 */
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('user_data').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: "Conexão estabelecida com sucesso." };
  } catch (err: any) {
    return { 
      success: false, 
      message: err.message || "Erro desconhecido ao conectar com Supabase." 
    };
  }
};
