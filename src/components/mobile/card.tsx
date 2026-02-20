import { cn } from '@/lib/utils';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCard({ children, className, onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl p-4 shadow-sm border border-gray-100',
        onClick && 'active:bg-gray-50 transition-colors cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}