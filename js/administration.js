import { supabase } from './supabase.js'
import {
  bookStatusLabel,
  escapeHtml,
  formatDate,
  formatMoney,
  loanStatusLabel,
  renderLayout,
  requireAdmin,
  showMessage,
} from './commun.js'
import {
  DEFAULT_DAILY_RATE,
  DEFAULT_GRACE_DAYS,
} from './config.js'
