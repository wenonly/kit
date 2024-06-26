import React, { useEffect, useRef } from "react";
import type PlayerType from "xgplayer";
import type { IPlayerOptions } from "xgplayer";
import Player from "xgplayer";
import 'xgplayer/dist/index.min.css';

export interface XgPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string; // 视频源的 URL
  options?: Partial<IPlayerOptions>; // 一个对象，包含了 xgplayer 的配置选项。这些选项会被传递给 xgplayer 实例。查看 xgplayer 文档以了解所有可用的选项。
}

const XgPlayer: React.FunctionComponent<XgPlayerProps> = ({
  src,
  options,
  ...props
}) => {
  const domRef = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerType>();
  const optionsRef = useRef<Partial<IPlayerOptions>>(options || {});

  useEffect(() => {
    player.current = new Player({
      url: src,
      fluid: true,
      videoInit: true,
      autoplay: true,
      el: domRef.current as HTMLElement,
      lang: "zh-cn",
      ...optionsRef.current,
    });
    return () => {
      player.current?.destroy();
    };
  }, [optionsRef, src]);

  return (
    <div ref={domRef} {...props}>
      {/* {loading && (
        <Spin
          tip="loading..."
          style={{ margin: '0 auto', display: 'block', marginTop: '45%' }}
        />
      )} */}
    </div>
  );
};

export default XgPlayer;
