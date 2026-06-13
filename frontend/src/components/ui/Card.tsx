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
  hoverable = false, 
  onClick,
  style
}) => {
  return (
    <div 
      onClick={onClick}
      className={`rounded-lg border bg-card text-card-foreground ${hoverable ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''} ${className}`}
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
  className = '',
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
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
  className = '',
}) => {
  return (
    <div className={`p-6 pt-0 ${className}`}>
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
  className = '',
}) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
});
