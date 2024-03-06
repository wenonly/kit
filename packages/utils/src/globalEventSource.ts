import { EventSourcePolyfill } from "event-source-polyfill";
import { EventEmitter } from "eventemitter3";

interface GlobalEventSourceOptions {
  headersCreater?: () => Record<string, string>;
}

export class GlobalEventSource extends EventEmitter {
  private path: string;
  private eventSourceInstance: EventSource | undefined;
  private options: GlobalEventSourceOptions = {};

  constructor(path: string, options: GlobalEventSourceOptions) {
    super();
    this.path = path;
    this.options = options;
  }

  private checkVisibility = () => {
    if (document.visibilityState === "visible") {
      this.startEventSource();
    }
    if (document.visibilityState === "hidden") {
      this.closeEventSource();
    }
  };

  private startEventSource = () => {
    if (this.eventSourceInstance) return;
    /**
     * 设置header
     * =======================
     */
    const headers = this.options.headersCreater?.() ?? {};
    /**
     * =======================
     */
    // EventSourcePolyfill 使用是为了传递header，缺点是无法在network看到返回信息
    this.eventSourceInstance = new EventSourcePolyfill(this.path, {
      headers,
    });
    this.eventSourceInstance.addEventListener("message", this.onMessageChange);
  };

  private closeEventSource = () => {
    this.eventSourceInstance?.removeEventListener(
      "message",
      this.onMessageChange
    );
    this.eventSourceInstance?.close();
    this.eventSourceInstance = undefined;
  };

  public start() {
    this.startEventSource();
    document.addEventListener("visibilitychange", this.checkVisibility);
  }

  public close() {
    this.closeEventSource();
    document.removeEventListener("visibilitychange", this.checkVisibility);
  }

  private onMessageChange = (ev: MessageEvent) => {
    try {
      const messageData = JSON.parse(ev.data ?? "{}");
      if (messageData?.type) {
        // scope
        this.emit(messageData.type, messageData);
      }
      // global
      this.emit("message", messageData);
    } catch (error) {
      console.error(error);
    }
  };
}

// const globalEventSource = new GlobalEventSource(
//   "/comprehensive-assessment-system/eventSource/global"
// );

// export default globalEventSource;
