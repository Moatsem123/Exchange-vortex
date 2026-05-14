import useCountUp from "../hooks/useCountUp";

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  inView = true,
}) {
  const number = useCountUp(value, 1800, inView);

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);

  return (
    <span className="tabular-nums tracking-tight">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default AnimatedNumber;