import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dqkmbpgbubblrlmnxdxx.supabase.co';
const supabaseAnonKey = 'sb_publishable_d3fsJntxsNtqGW8FFRTqvg_9OB6ghIA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);