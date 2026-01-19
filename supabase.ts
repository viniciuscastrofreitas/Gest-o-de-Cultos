
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://suciiybkjxhbldwfwgnq.supabase.co';
const supabaseKey = 'sb_publishable_Qm1_2UMd2Y0lTKMR6jgpSA_Dd4taZOh';

export const supabase = createClient(supabaseUrl, supabaseKey);
