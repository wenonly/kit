import { useHover } from 'ahooks';
import React, { useEffect, useRef, useState } from 'react';
import styles from './index.module.less';

interface ScrollTextProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  textGap?: number;
}

const ScrollText: React.FunctionComponent<ScrollTextProps> = (props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isHover = useHover(wrapRef.current);
  const [isRunning, setIsRunning] = useState(false);

  const translateWidth = contentRef.current?.offsetWidth ?? 0;
  const wrapWidth = wrapRef.current?.offsetWidth ?? 0;
  const gap = props.textGap ?? 30;
  const isOverWidth = translateWidth > wrapWidth;
  const timeLen = isOverWidth
    ? Math.max(2, Math.floor((translateWidth + gap) / 100)) + 's'
    : '';

  useEffect(() => {
    setIsRunning(false);
    const time = setTimeout(() => {
      setIsRunning(true);
    }, 200);
    return () => {
      clearTimeout(time);
      setIsRunning(false);
    };
  }, [translateWidth]);

  return (
    <div
      ref={wrapRef}
      style={
        {
          ...(props.style ?? {}),
          '--scroll-speed': timeLen,
          '--translate-width': translateWidth + gap,
        } as any
      }
      className={`${styles.textWrap} ${props.className ?? ''}`}
    >
      <div
        className={styles.aniWrap}
        style={{
          animationPlayState: isHover || !isRunning ? 'paused' : 'running',
          width: translateWidth * 2 + gap,
        }}
      >
        <span ref={contentRef}>{props.children}</span>
        {isOverWidth && (
          <>
            <span style={{ display: 'inline-block', width: gap }}></span>
            <span>{props.children}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ScrollText;
