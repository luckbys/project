import React from 'react';

type LoadingProps = {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white';
  text?: string;
};

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  color = 'blue',
  text
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className={`
          animate-spin rounded-full border-2
          ${sizeClasses[size]}
          ${colorClasses[color]}
        `}
      />
      {text && (
        <span className={`text-sm font-medium ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default Loading; 