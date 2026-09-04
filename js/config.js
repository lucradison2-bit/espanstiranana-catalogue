// config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ylcezajxsqhuwdhocvqt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VkmNVJEfohGbSBg7HZzQ0w_3R6QTPNQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
