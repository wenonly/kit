import { useRefData } from "@wenonly/react-hooks";
import { useMemoizedFn } from "ahooks";
import React, { useEffect, useRef, useState } from "react";
import styles from "./index.module.less";

interface SlickTextItemProps {
  play?: boolean;
  children?: string | React.ReactNode;
  className?: string;
  onScrollStop?: () => void;
}

const SlickTextItem: React.FunctionComponent<SlickTextItemProps> = (props) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const refData = useRefData(() => ({
    onScrollStop: props.onScrollStop,
  }));

  useEffect(() => {
    let time0: ReturnType<typeof setTimeout>;
    let stop = false;

    function getOffset() {
      if (itemRef.current) {
        const clientWidth = itemRef.current.clientWidth;
        const scrollWidth = itemRef.current.scrollWidth;
        const offset = scrollWidth - clientWidth;
        return offset;
      }
      return 0;
    }

    if (props.children && itemRef.current && props.play) {
      if (getOffset() > 0) {
        function scrollLeft() {
          if (itemRef.current && !stop) {
            if (itemRef.current.scrollLeft < getOffset()) {
              itemRef.current?.scrollTo({
                left: itemRef.current.scrollLeft + 1,
              });
              requestAnimationFrame(scrollLeft);
            } else {
              time0 = setTimeout(() => {
                if (stop) return;
                refData.current.onScrollStop?.();
                // 1s后再次开始
                time0 = setTimeout(() => {
                  itemRef.current?.scrollTo({
                    left: 0,
                  });
                  requestAnimationFrame(scrollLeft);
                }, 1000);
              }, 1000);
            }
          }
        }
        time0 = setTimeout(() => {
          scrollLeft();
        }, 500);
      } else {
        time0 = setTimeout(() => {
          refData.current.onScrollStop?.();
        }, 1000);
      }
    }

    return () => {
      clearTimeout(time0);
      stop = true;
    };
  }, [props.children, props.play, refData]);

  return (
    <div
      ref={itemRef}
      className={`${styles.slickItem} ${props.className ?? ""}`}
    >
      {props.children}
    </div>
  );
};

interface SlickTextProps {
  texts?: (string | React.ReactNode)[]; // 需要滚动显示的文本
  className?: string;
  style?: React.CSSProperties;
}

const SlickText: React.FunctionComponent<SlickTextProps> = (props) => {
  const [index, setIndex] = useState(0);
  const [animationPlaying, setAnimationPlaying] = useState(false);

  const nextIndex = useMemoizedFn((i: number) => {
    const len = props.texts?.length ?? 0;
    if (index < len - 1) {
      return i + 1;
    } else {
      return 0;
    }
  });

  const onScrollStop = useMemoizedFn(() => {
    if ((props.texts?.length ?? 0) > 1) {
      setAnimationPlaying(true);
      setTimeout(() => {
        setAnimationPlaying(false);
        setIndex((i) => nextIndex(i));
      }, 1000);
    }
  });

  return (
    <div
      className={`${styles.slickText} ${props.className ?? ""}`}
      style={props.style}
    >
      <SlickTextItem
        className={animationPlaying ? styles.slickItemTrans : undefined}
        key={index}
        play
        onScrollStop={onScrollStop}
      >
        {props.texts?.[index]}
      </SlickTextItem>
      <SlickTextItem
        key={nextIndex(index) || "x"}
        className={animationPlaying ? styles.slickItemTrans : undefined}
      >
        {props.texts?.[nextIndex(index)]}
      </SlickTextItem>
    </div>
  );
};

export default SlickText;
