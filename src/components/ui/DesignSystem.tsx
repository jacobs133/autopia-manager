import React from 'react';
import { Car, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

/**
 * Token visivi condivisi Autopia Manager (allineati all'identità Autopia Shop)
 */
export const uiClasses = {
  input:
    'w-full bg-white border border-[#D7E0DE] rounded-lg px-3 py-2 text-xs text-[#1A2322] placeholder-[#8A9895] transition-colors focus:outline-none focus:border-[#074E44] focus:ring-2 focus:ring-[#074E44]/15 disabled:bg-[#F3F6F5] disabled:text-[#6E7D7A] disabled:cursor-not-allowed',
  select:
    'w-full bg-white border border-[#D7E0DE] rounded-lg px-3 py-2 text-xs text-[#1A2322] transition-colors focus:outline-none focus:border-[#074E44] focus:ring-2 focus:ring-[#074E44]/15 cursor-pointer disabled:bg-[#F3F6F5] disabled:text-[#6E7D7A] disabled:cursor-not-allowed',
  textarea:
    'w-full bg-white border border-[#D7E0DE] rounded-lg px-3 py-2 text-xs text-[#1A2322] placeholder-[#8A9895] transition-colors focus:outline-none focus:border-[#074E44] focus:ring-2 focus:ring-[#074E44]/15 disabled:bg-[#F3F6F5] disabled:text-[#6E7D7A]',
  label: 'block text-xs font-semibold text-[#2E3C3A] mb-1.5',
  card: 'bg-white border border-[#E2E8E7] rounded-xl shadow-[0_1px_2px_rgba(7,78,68,0.04)]',
  tableWrapper: 'bg-white border border-[#E2E8E7] rounded-xl shadow-[0_1px_2px_rgba(7,78,68,0.04)] overflow-hidden',
  tableHeadRow: 'bg-[#F7FAF9] border-b border-[#E2E8E7] text-[11px] font-semibold text-[#5C6B68] uppercase tracking-wider',
};

/**
 * Logo ufficiale Autopia Manager coerente con l'identità grafica Autopia Shop
 */
export const AutopiaLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}> = ({ size = 'md', subtitle = 'MANAGER' }) => {
  const iconBoxSize =
    size === 'sm' ? 'w-7 h-7 rounded-lg' : size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-xl';
  const carSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-[17px]';

  return (
    <div className="flex items-center space-x-2.5 select-none">
      <div
        className={`${iconBoxSize} bg-[#074E44] text-white flex items-center justify-center shrink-0 shadow-xs`}
      >
        <Car className={carSize} strokeWidth={2.1} />
      </div>
      <div className="leading-tight">
        <div className={`${titleSize} font-extrabold tracking-tight text-[#162220]`}>
          Autopia
        </div>
        {subtitle && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5C6B68]">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-[#EAF3F1] text-[#074E44] border-[#C6DFDA]',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const StatusBadge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${badgeTones[tone]} ${className}`}
  >
    {children}
  </span>
);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[#074E44] hover:bg-[#053B33] text-white border border-transparent shadow-xs',
  secondary:
    'bg-white hover:bg-[#F4F7F6] text-[#1A2322] border border-[#D7E0DE] shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
  ghost:
    'bg-transparent hover:bg-[#EDF2F1] text-[#455451] border border-transparent',
  danger:
    'bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-xs',
  success:
    'bg-[#0D9488] hover:bg-[#0B7C72] text-white border border-transparent shadow-xs',
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
    className={`inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
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
  accent?: 'default' | 'brand' | 'success' | 'warning';
}> = ({ label, value, icon, hint, accent = 'default' }) => {
  const valueColor =
    accent === 'brand'
      ? 'text-[#074E44]'
      : accent === 'success'
      ? 'text-emerald-700'
      : accent === 'warning'
      ? 'text-amber-700'
      : 'text-[#1A2322]';

  return (
    <div className="bg-white border border-[#E2E8E7] rounded-xl p-4 shadow-[0_1px_2px_rgba(7,78,68,0.03)]">
      <div className="flex items-center justify-between text-xs font-medium text-[#5C6B68]">
        <span>{label}</span>
        {icon && <span className="text-[#074E44]/80">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold tracking-tight mt-1.5 tabular-nums ${valueColor}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-[#748481] mt-1">{hint}</div>}
    </div>
  );
};

export const AlertBanner: React.FC<{
  tone: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}> = ({ tone, title, children, action, onDismiss }) => {
  const styles = {
    info: 'bg-sky-50 border-sky-200 text-sky-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
  };
  const icons = {
    info: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    danger: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${styles[tone]}`}
    >
      <div className="flex items-start gap-2.5">
        {icons[tone]}
        <div className="leading-relaxed">
          {title && <div className="font-semibold mb-0.5">{title}</div>}
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
  message = 'Caricamento dati in corso...',
}) => (
  <div className="py-16 flex flex-col items-center justify-center space-y-3 text-[#5C6B68]">
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
  <div className="py-14 px-6 flex flex-col items-center justify-center text-center bg-white border border-dashed border-[#D3DFDD] rounded-xl space-y-3">
    <div className="w-11 h-11 rounded-xl bg-[#F0F5F4] text-[#074E44] flex items-center justify-center">
      {icon}
    </div>
    <div className="space-y-1 max-w-md">
      <h3 className="text-sm font-bold text-[#1A2322]">{title}</h3>
      {description && <p className="text-xs text-[#5C6B68] leading-relaxed">{description}</p>}
    </div>
    {action && <div className="pt-1">{action}</div>}
  </div>
);
