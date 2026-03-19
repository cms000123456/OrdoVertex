import React, { useState, ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import './Tooltip.css';

interface TooltipProps {
  content: string;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top',
  showIcon = false 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (showIcon && <HelpCircle size={16} className="tooltip-icon" />)}
      {isVisible && (
        <div className={`tooltip tooltip-${position}`}>
          {content}
        </div>
      )}
    </div>
  );
}

interface HelpTextProps {
  text: string;
  children: ReactNode;
}

export function HelpText({ text, children }: HelpTextProps) {
  return (
    <div className="help-text-container">
      {children}
      <Tooltip content={text} position="top">
        <HelpCircle size={14} className="help-text-icon" />
      </Tooltip>
    </div>
  );
}
