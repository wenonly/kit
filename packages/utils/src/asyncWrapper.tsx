import type { ComponentType } from "react";
import React, { Suspense } from "react";

function asyncWrapper<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    fallback?: React.ComponentType;
  }
) {
  const Component = React.lazy(factory);
  const Fallback = options?.fallback;
  return React.forwardRef((props: React.PropsWithoutRef<P>, ref) => {
    return (
      <Suspense fallback={Fallback ? <Fallback /> : <></>}>
        <Component {...props} ref={ref} />
      </Suspense>
    );
  });
}

export default asyncWrapper;
