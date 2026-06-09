import { useEffect, useRef, useState } from "react";

function AnimatedNumber({
  value = 0,
  duration = 700,
  formatter,
  prefix = "",
  suffix = "",
  decimals = 0,
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = startRef.current;
    const end = Number(value || 0);
    const startTime = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  if (formatter) {
    return formatter(display);
  }

  return `${prefix}${Number(display || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

export default AnimatedNumber;