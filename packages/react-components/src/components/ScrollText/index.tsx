import { useUpdate } from "ahooks";
import React, { useEffect, useRef } from "react";
import styles from "./index.module.less";

interface ScrollTextProps {
  text?: string;
  style?: React.CSSProperties;
  className?: string;
  textGap?: number;
}

const ScrollText: React.FunctionComponent<ScrollTextProps> = (props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef(0);
  const update = useUpdate();

  useEffect(() => {
    const width = wrapRef.current?.scrollWidth;
    let stop = false;
    if (width) {
      const toLeft = () => {
        if (!wrapRef.current || stop) return;
        const left = leftRef.current + 1;
        if (left > width / 2 + (props.textGap ?? 30) / 2) {
          leftRef.current = 0;
        } else {
          leftRef.current = left;
        }
        update();
        requestAnimationFrame(toLeft);
      };
      toLeft();
    }
    return () => {
      stop = true;
    };
  }, [props.text, leftRef]);

  return (
    <div
      ref={wrapRef}
      style={props.style}
      className={`${styles.textWrap} ${props.className ?? ""}`}
    >
      <div style={{ transform: `translateX(-${leftRef.current}px)` }}>
        <span>{props.text}</span>
        <span
          style={{ display: "inline-block", width: props.textGap ?? 30 }}
        ></span>
        <span>{props.text}</span>
      </div>
    </div>
  );
};

export default ScrollText;
