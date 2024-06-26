import { useRefData } from "@wenonly/react-hooks";
import { useHover } from "ahooks";
import { throttle } from "lodash-es";
import React, { useEffect, useMemo, useRef } from "react";
import styles from "./index.module.less";

interface AutoScrollBoxProps {
  className?: string;
  style?: React.CSSProperties;
  items?: React.ReactNode[];
  scrollCount?: number; // 滚动展示数量，默认为1，超过一条才会滚动
}

const AutoScrollBox: React.FunctionComponent<AutoScrollBoxProps> = (props) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const centerWrapRef = useRef<HTMLDivElement>(null);
  const isHover = useHover(wrapRef);

  const dataRef = useRefData(() => ({
    isHover,
  }));

  const scrollActive = useMemo(() => {
    const max = props.scrollCount ?? 1;
    const currentLen = props.items?.length ?? 0;
    return currentLen > max;
  }, [props.items?.length, props.scrollCount]);

  useEffect(() => {
    let stopScroll = false;
    const startScroll = () => {
      if (!dataRef.current.isHover) {
        wrapRef.current?.scrollTo({
          top: wrapRef.current.scrollTop + 1,
        });
      }
      if (!stopScroll) {
        requestAnimationFrame(startScroll);
      }
    };
    wrapRef.current?.scrollTo({ top: centerWrapRef.current?.offsetTop });
    startScroll();
    return () => {
      stopScroll = true;
    };
  }, [dataRef, scrollActive]);

  useEffect(() => {
    // 添加滚动监听，控制模块显示
    const scrollListenHandler = throttle(() => {
      if (wrapRef.current && wrapRef.current?.scrollTop <= 1) {
        wrapRef.current.scrollTo({ top: centerWrapRef.current?.offsetTop });
      }
      if (
        wrapRef.current &&
        centerWrapRef.current &&
        wrapRef.current.scrollHeight - wrapRef.current.offsetHeight <=
          wrapRef.current.scrollTop
      ) {
        wrapRef.current.scrollTo({
          top:
            centerWrapRef.current.offsetTop +
            centerWrapRef.current.offsetHeight -
            wrapRef.current.offsetHeight,
        });
      }
    }, 20);
    const wrap = wrapRef.current;
    wrap?.addEventListener("scroll", scrollListenHandler);
    return () => {
      wrap?.removeEventListener("scroll", scrollListenHandler);
    };
  }, [dataRef]);

  return (
    <div className={styles.autoScroll} style={props.style}>
      <div ref={wrapRef} className={`${styles.wrap} ${props.className ?? ""}`}>
        {scrollActive &&
          props.items?.map((item, index) => (
            <div className={`${styles.scrollItem}`} key={`1_${index}`}>
              {item}
            </div>
          ))}
        <div ref={centerWrapRef} className={styles.scrollCenterContent}>
          {props.items?.map((item, index) => (
            <div
              ref={boxRef}
              className={`${styles.scrollItem}`}
              style={{ animation: scrollActive ? undefined : "none" }}
              key={index}
            >
              {item}
            </div>
          ))}
        </div>
        {scrollActive &&
          props.items?.map((item, index) => (
            <div className={`${styles.scrollItem}`} key={`2_${index}`}>
              {item}
            </div>
          ))}
      </div>
    </div>
  );
};

export default AutoScrollBox;
