import { useEffect, useState } from "react";

function useCountUp(target, duration = 1800, start = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    let animationFrame;
    const startTime = performance.now();
    const endValue = Number(target || 0);

    function step(timestamp) {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(endValue * eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    }

    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, start]);

  return value;
}

export default useCountUp;