import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value = 0, duration = 700, formatter }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);

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
        requestAnimationFrame(animate);
      } else {
        startRef.current = end;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return formatter ? formatter(display) : Math.round(display).toLocaleString("en-US");
}

export default AnimatedNumber;