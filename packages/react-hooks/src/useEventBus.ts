import EventEmitter from 'eventemitter3';
import { useEffect } from 'react';

export const eventBus = new EventEmitter();

export const useEventBus = (key?: string, emitter?: (...args: any[]) => void) => {
  useEffect(() => {
    if (key && emitter) eventBus.on(key, emitter);
    return () => {
      if (key && emitter) eventBus.removeListener(key, emitter);
    };
  }, [emitter, key]);

  return eventBus;
};
