'use client';

import { useEffect, useState } from 'react';
import './styles.css';

export default function Home() {
  const [displayText, setDisplayText] = useState('');
  const fullText = 'INNBLOCK';
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.substring(0, index + 1));
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, 150);

    return () => clearInterval(typingInterval);
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="container">
      <div className="glitch-wrapper">
        <h1 className="glitch" data-text={displayText}>
          {displayText}
          {showCursor && <span className="cursor">_</span>}
        </h1>
      </div>
      <div className="matrix-bg"></div>
    </div>
  );
}
