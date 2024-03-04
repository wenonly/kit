const loadMap: Record<string, HTMLElement | Promise<HTMLElement>> = {};

export function loadJs(path: string, attrs?: Partial<HTMLElement>) {
  const loadPromise = new Promise<HTMLElement>((resolve, reject) => {
    if (!loadMap[path]) {
      const script = document.createElement('script');

      Object.entries(attrs ?? {}).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number')
          script?.setAttribute(key, String(value));
      });

      script.onload = () => {
        loadMap[path] = script;
        resolve(script);
      };

      script.onerror = (e) => {
        delete loadMap[path];
        reject(e);
      };

      script.setAttribute('src', path);
      document.body.appendChild(script);
    } else {
      const script = loadMap[path];
      Promise.resolve(script).then(resolve).catch(reject);
    }
  });
  if (!loadMap[path]) {
    loadMap[path] = loadPromise;
  }
  return loadPromise;
}

export function loadCss(path: string, attrs?: Partial<HTMLElement>) {
  const loadPromise = new Promise<HTMLElement>((resolve, reject) => {
    if (!loadMap[path]) {
      const link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('type', 'text/css');

      Object.entries(attrs ?? {}).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number')
          link?.setAttribute(key, String(value));
      });

      link.onload = () => {
        loadMap[path] = link;
        resolve(link);
      };

      link.onerror = (e) => {
        delete loadMap[path];
        reject(e);
      };

      link.setAttribute('href', path);
      document.head.appendChild(link);
    } else {
      const script = loadMap[path];
      Promise.resolve(script).then(resolve).catch(reject);
    }
  });
  if (!loadMap[path]) {
    loadMap[path] = loadPromise;
  }
  return loadPromise;
}

const prefetchMap: Record<string, HTMLLinkElement> = {};
export function prefetchScript(path: string, as: string = 'script') {
  if (prefetchMap[path]) return prefetchMap[path];
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = as;
  link.href = path;
  document.head.appendChild(link);
  prefetchMap[path] = link;
  return link;
}

const preloadMap: Record<string, HTMLLinkElement> = {};
export function preloadScript(path: string, as = "script") {
  if (preloadMap[path]) return preloadMap[path];
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = as;
  link.href = path;
  document.head.appendChild(link);
  preloadMap[path] = link;
  return link;
}

// 将字体文件preload
const preloadFontMap: Record<string, HTMLLinkElement> = {};
export function preloadFont(path: string) {
  if (preloadFontMap[path]) return preloadFontMap[path];
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/ttf';
  link.setAttribute('crossorigin', '');
  link.href = path;
  document.head.appendChild(link);
  preloadFontMap[path] = link;
  return link;
}
