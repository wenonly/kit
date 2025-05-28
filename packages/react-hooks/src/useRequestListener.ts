import { AxiosRequestConfig, AxiosResponse } from "axios";
import Eventemitter from "eventemitter3";
import { useEffect } from "react";
import useRefData from "./useRefData";

const event = new Eventemitter();

const ReqHookName = "hook:request";
const ResHookName = "hook:response";

// 需要放到 app.tsx 中的request.requestInterceptors中，进行拦截
export const requestHooksInterceptor = (
  url: string,
  options: AxiosRequestConfig
) => {
  event.emit(ReqHookName, { url, options });
  return { url, options };
};

// 需要放到 app.tsx 中的request.responseInterceptors中，进行拦截
export const responseHooksInterceptor = (response: AxiosResponse<any>) => {
  event.emit(ResHookName, { response });
  return response;
};

// useRequestListener 监听url调用
export default (options: {
  onReq?: (url: string, options: AxiosRequestConfig) => void;
  onRes?: (response: AxiosResponse<any>) => void;
}) => {
  const refData = useRefData(() => ({
    options,
  }));

  // 监听 request
  useEffect(() => {
    const listenReqHandler = (hookVal: {
      url: string;
      options: AxiosRequestConfig;
    }) => {
      refData.current.options.onReq?.(hookVal.url, hookVal.options);
    };
    event.on(ReqHookName, listenReqHandler);
    return () => {
      event.off(ReqHookName, listenReqHandler);
    };
  }, [refData]);

  // 监听 response
  useEffect(() => {
    const listenResHandler = (hookVal: { response: AxiosResponse<any> }) => {
      refData.current.options.onRes?.(hookVal.response);
    };
    event.on(ResHookName, listenResHandler);
    return () => {
      event.off(ResHookName, listenResHandler);
    };
  }, [refData]);
};
