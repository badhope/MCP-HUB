import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card = React.memo<CardProps>(({ 
  children, 
  className = '', 
  hoverable = true, 
  onClick,
  style
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden
        ${hoverable ? 'transition-all duration-400 ease-smooth cursor-pointer' : ''}
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
});

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader = React.memo<CardHeaderProps>(({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`p-5 sm:p-6 border-b border-slate-100 ${className}`}>
      {children}
    </div>
  );
});

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent = React.memo<CardContentProps>(({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
});

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter = React.memo<CardFooterProps>(({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50 ${className}`}>
      {children}
    </div>
  );
});
