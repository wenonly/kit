import { useRefData } from "@wenonly/react-hooks";
import lot from "lottie-web";
import React, { useEffect, useRef } from "react";
import styles from "./index.module.less";

interface ClipOptions {
  originalWidth: React.CSSProperties["width"];
  originalHeight: React.CSSProperties["height"];
  clipLeft: React.CSSProperties["left"];
  clipTop: React.CSSProperties["top"];
}

interface LottieProps {
  path?: string; // 动画地址
  style?: React.CSSProperties; // style
  className?: string; // class
  clip?: ClipOptions; // 裁剪
  onLoopComplete?: () => void; // loopComplete 事件监听
}

// lottie 动画
const LottieWrapper: React.FunctionComponent<LottieProps> = (props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRefData(() => ({
    onLoopComplete: props.onLoopComplete ?? (() => {}),
  }));

  useEffect(() => {
    const wrap = wrapRef.current;
    let ani: ReturnType<typeof lot.loadAnimation> | undefined;
    if (wrap && props.path) {
      ani = lot.loadAnimation({
        container: wrap,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: props.path,
      });
    }
    const callback = callbackRef.current;
    ani?.addEventListener("loopComplete", callback.onLoopComplete);
    return () => {
      ani?.removeEventListener("loopComplete", callback.onLoopComplete);
      ani?.destroy();
    };
  }, [callbackRef, props.path]);

  return (
    <div
      className={`${styles.lottieWrap} ${props.className ?? ""}`}
      style={props.style}
    >
      <div
        style={
          props.clip
            ? {
                width: props.clip.originalWidth,
                height: props.clip.originalHeight,
                transform: `translateX(-${props.clip.clipLeft}) translateY(-${props.clip.clipTop})`,
              }
            : {}
        }
      >
        <div ref={wrapRef} />
      </div>
    </div>
  );
};

export default LottieWrapper;
