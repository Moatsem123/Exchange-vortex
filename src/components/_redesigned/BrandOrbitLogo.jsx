import { motion } from "framer-motion";

function BrandOrbitLogo({ size = 96, withGlow = true }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {withGlow && (
        <div
          className="absolute rounded-full bg-teal-400/12 blur-2xl"
          style={{
            width: size * 0.72,
            height: size * 0.72,
          }}
        />
      )}

      {/* outer soft ring */}
      <div
        className="absolute rounded-full border border-teal-400/25"
        style={{
          width: size * 0.88,
          height: size * 0.88,
        }}
      />

      {/* rotating orbit ring */}
      <motion.div
        className="absolute rounded-full border border-teal-400/40"
        style={{
          width: size,
          height: size,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      >
        <span
          className="absolute rounded-full bg-teal-300 shadow-[0_0_14px_rgba(45,212,191,0.9)]"
          style={{
            width: size * 0.07,
            height: size * 0.07,
            right: size * 0.04,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      </motion.div>

      {/* rotating arrows */}
      <motion.svg
        viewBox="0 0 120 120"
        className="absolute"
        style={{ width: size * 0.76, height: size * 0.76 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <linearGradient id="orbitBlue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>

        {/* top-left arrow arc */}
        <path
          d="M61 20
             C40 20, 24 36, 24 57"
          fill="none"
          stroke="url(#orbitBlue)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M21 55 L33 47 L31 61 Z"
          fill="url(#orbitBlue)"
        />

        {/* bottom-right arrow arc */}
        <path
          d="M59 100
             C80 100, 96 84, 96 63"
          fill="none"
          stroke="url(#orbitBlue)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M99 65 L87 73 L89 59 Z"
          fill="url(#orbitBlue)"
        />
      </motion.svg>

      {/* center fixed core */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full border border-teal-400/30 bg-[#1e293b]"
        style={{
          width: size * 0.52,
          height: size * 0.52,
          boxShadow: "0 0 30px rgba(45,212,191,0.18)",
        }}
      >
        <div
          className="relative rounded-2xl border border-teal-300/55 bg-gradient-to-b from-[#0f766e] to-[#134e4a]"
          style={{
            width: size * 0.22,
            height: size * 0.22,
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[45%] rounded-t-2xl bg-teal-300/15" />
        </div>
      </div>
    </div>
  );
}

export default BrandOrbitLogo;
