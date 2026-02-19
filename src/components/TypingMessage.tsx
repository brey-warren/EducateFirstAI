import React, { useState, useEffect } from 'react';

interface TypingMessageProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

const TypingMessage: React.FC<TypingMessageProps> = ({ 
  content, 
  speed = 15,
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let index = 0;

    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedText(content.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [content, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span style={styles.cursor}>|</span>}
    </span>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  cursor: {
    display: 'inline-block',
    marginLeft: '2px',
    animation: 'blink 1s infinite',
    color: '#10B981',
    fontWeight: 'bold',
  },
};

export default TypingMessage;
