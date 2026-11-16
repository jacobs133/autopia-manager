import React from 'react';
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

/**
 * Token visivi condivisi Autopia Manager
 * Piani visivi multipli: telaio desktop grafite, workspace ardesia chiaro, card stratificate ad alta precisione.
 */
export const uiClasses = {
  input:
    'w-full bg-white border border-[#CFDAD7] rounded-lg px-3 py-2 text-xs text-[#131C1B] placeholder-[#82938F] shadow-[inset_0_1px_1px_rgba(15,28,26,0.03)] transition-all duration-150 focus:outline-none focus:border-[#074E44] focus:ring-2 focus:ring-[#074E44]/15 disabled:bg-[#F2F5F4] disabled:text-[#6B7C78] disabled:cursor-not-allowed',
  select:
    'w-full bg-white border border-[#CFDAD7] rounded-lg px-3 py-2 text-xs text-[#131C1B] shadow-[inset_0_1px_1px_rgba(15,28,26,0.03)] transition-all duration-150 focus:outline-none focus:border-[#074E44] focus:ring-2 focus:ring-[#074E44]/15 cursor-pointer disabled:bg-[#F2F5F4] disabled:text-[#6B7C78] disabled:cursor-not-allowed',
  textarea:
    'w-full bg-white border border-[#CFDAD7] rounded-lg px-3 py-2 text-xs text-[#131C1B] placeholder-[#82938F] shadow-[inset_0_1px_1px_rgba(15,28,26,0.03)] transition-all duration-150 focus:outline-none focus:border-[#074E44] focus:ring-2 focus:ring-[#074E44]/15 disabled:bg-[#F2F5F4] disabled:text-[#6B7C78]',
  label: 'block text-[11px] font-semibold text-[#334441] mb-1.5 tracking-wide',
  card: 'bg-white border border-[#DCE4E2] rounded-xl shadow-[0_1px_2px_rgba(15,28,26,0.04),0_6px_16px_-10px_rgba(15,28,26,0.06)]',
  cardWell: 'bg-[#F6F8F8] border border-[#E1E8E6] rounded-xl',
  tableWrapper:
    'bg-white border border-[#DCE4E2] rounded-xl shadow-[0_1px_2px_rgba(15,28,26,0.04),0_6px_16px_-10px_rgba(15,28,26,0.06)] overflow-hidden',
  tableHeadRow:
    'bg-[#F4F7F6] border-b border-[#DCE4E2] text-[10.5px] font-bold text-[#52625F] uppercase tracking-[0.06em]',
};

/**
 * Logo ufficiale Autopia Manager — marchio geometrico tecnico per ambiente desktop
 */
export const AutopiaLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  theme?: 'light' | 'dark';
}> = ({ size = 'md', subtitle = 'MANAGER', theme = 'light' }) => {
  const iconBoxSize =
    size === 'sm' ? 'w-7 h-7 rounded-lg' : size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-xl';
  const svgSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-[16px]';

  const isDark = theme === 'dark';

  return (
    <div className="flex items-center space-x-2.5 select-none shrink-0">
      <div
        className={`${iconBoxSize} flex items-center justify-center shrink-0 relative overflow-hidden ${
          isDark
            ? 'bg-[#0A6256] text-white border border-[#198575]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
            : 'bg-[#074E44] text-white border border-[#053B33] shadow-[0_2px_6px_rgba(7,78,68,0.24),inset_0_1px_0_rgba(255,255,255,0.15)]'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={svgSize}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 17H4a2 2 0 0 1-2-2v-3.5a2 2 0 0 1 .6-1.4l2.1-2.1A2 2 0 0 1 6.1 7.4h7.3a2 2 0 0 1 1.6.8l2 2.6h2.2a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-1" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M9 17h6" />
        </svg>
      </div>
      <div className="leading-none">
        <div
          className={`${titleSize} font-extrabold tracking-tight flex items-center gap-1.5 ${
            isDark ? 'text-[#F3F7F6]' : 'text-[#131C1B]'
          }`}
        >
          <span>Autopia</span>
        </div>
        {subtitle && (
          <div
            className={`text-[9.5px] font-bold uppercase tracking-[0.16em] mt-0.5 ${
              isDark ? 'text-[#5EEAD4]' : 'text-[#074E44]'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-[#EAF3F1] text-[#074E44] border-[#C1DAD5]',
  success: 'bg-emerald-50/90 text-emerald-800 border-emerald-200/90',
  warning: 'bg-amber-50/90 text-amber-800 border-amber-200/90',
  danger: 'bg-red-50/90 text-red-700 border-red-200/90',
  info: 'bg-cyan-50/90 text-cyan-800 border-cyan-200/90',
  neutral: 'bg-[#F2F5F4] text-[#455451] border-[#D8E1DF]',
};

export const StatusBadge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap shrink-0 ${badgeTones[tone]} ${className}`}
  >
    {children}
  </span>
);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark';
export type ButtonSize = 'xs' | 'sm' | 'md';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[#074E44] hover:bg-[#053B33] text-white border border-[#053B33] shadow-[0_1px_2px_rgba(7,78,68,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]',
  secondary:
    'bg-white hover:bg-[#F5F8F7] text-[#131C1B] border border-[#CFDAD7] shadow-[0_1px_2px_rgba(15,28,26,0.04)]',
  ghost:
    'bg-transparent hover:bg-[#E8EFED] text-[#3F4E4B] border border-transparent',
  danger:
    'bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-[0_1px_2px_rgba(185,28,28,0.2)]',
  success:
    'bg-[#0D9488] hover:bg-[#0B7C72] text-white border border-[#0B7C72] shadow-[0_1px_2px_rgba(13,148,136,0.2)]',
  dark:
    'bg-[#182220] hover:bg-[#22302D] text-[#EEF4F2] border border-[#2D3D3A] shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
};

const buttonSizes: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] rounded-md',
  sm: 'px-3.5 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-xs rounded-lg',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    {...props}
  >
    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
    {children}
  </button>
);

export const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  accent?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'cyan';
  onClick?: () => void;
}> = ({ label, value, icon, hint, accent = 'default', onClick }) => {
  const valueColor =
    accent === 'brand'
      ? 'text-[#074E44]'
      : accent === 'success'
      ? 'text-emerald-700'
      : accent === 'warning'
      ? 'text-amber-700'
      : accent === 'danger'
      ? 'text-red-700'
      : accent === 'cyan'
      ? 'text-cyan-800'
      : 'text-[#131C1B]';

  const iconBg =
    accent === 'brand'
      ? 'bg-[#EAF3F1] text-[#074E44] border-[#C6DFDA]'
      : accent === 'success'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : accent === 'warning'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : accent === 'danger'
      ? 'bg-red-50 text-red-700 border-red-200'
      : accent === 'cyan'
      ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
      : 'bg-[#F2F5F4] text-[#455451] border-[#DCE4E2]';

  const Container = onClick ? 'button' : 'div';

  return (
    <Container
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`text-left w-full bg-white border border-[#DCE4E2] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,28,26,0.04),0_6px_14px_-10px_rgba(15,28,26,0.06)] flex flex-col justify-between transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-[#074E44]/45 hover:shadow-[0_4px_12px_rgba(7,78,68,0.08)]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#566663]">
          {label}
        </span>
        {icon && (
          <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </span>
        )}
      </div>
      <div className={`text-2xl font-extrabold tracking-tight mt-2 tabular-nums font-mono ${valueColor}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-[#667774] mt-1.5 truncate">{hint}</div>}
    </Container>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, description, icon, actions }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
    <div className="flex items-start gap-3 min-w-0">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-[#131C1B] text-[#5EEAD4] border border-[#243230] flex items-center justify-center shrink-0 shadow-xs">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-lg font-extrabold text-[#131C1B] tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-xs text-[#566663] mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const AlertBanner: React.FC<{
  tone: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}> = ({ tone, title, children, action, onDismiss }) => {
  const styles = {
    info: 'bg-cyan-50/70 border-cyan-200 text-cyan-950',
    success: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
    warning: 'bg-amber-50/70 border-amber-200 text-amber-950',
    danger: 'bg-red-50/80 border-red-200 text-red-950',
  };
  const icons = {
    info: <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />,
    danger: <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${styles[tone]}`}
    >
      <div className="flex items-start gap-2.5">
        {icons[tone]}
        <div className="leading-relaxed">
          {title && <div className="font-bold mb-0.5">{title}</div>}
          <div>{children}</div>
        </div>
      </div>
      {(action || onDismiss) && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-medium opacity-75 hover:opacity-100 px-2 py-1 rounded hover:bg-black/5 cursor-pointer"
            >
              Chiudi
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Sincronizzazione dati in corso...',
}) => (
  <div className="py-16 flex flex-col items-center justify-center space-y-3 text-[#566663]">
    <Loader2 className="w-7 h-7 animate-spin text-[#074E44]" />
    <p className="text-xs font-medium">{message}</p>
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="py-14 px-6 flex flex-col items-center justify-center text-center bg-white border border-dashed border-[#CEDAD7] rounded-xl space-y-3 shadow-[0_1px_2px_rgba(15,28,26,0.03)]">
    <div className="w-11 h-11 rounded-xl bg-[#EEF3F2] border border-[#DCE4E2] text-[#074E44] flex items-center justify-center">
      {icon}
    </div>
    <div className="space-y-1 max-w-md">
      <h3 className="text-sm font-bold text-[#131C1B]">{title}</h3>
      {description && <p className="text-xs text-[#566663] leading-relaxed">{description}</p>}
    </div>
    {action && <div className="pt-1">{action}</div>}
  </div>
);
