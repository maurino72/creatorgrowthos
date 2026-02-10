const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

const intensityConfig = {
  full: { blob1: "opacity-60", blob2: "opacity-40", blob3: "opacity-30", grain: "opacity-[0.03]" },
  subtle: { blob1: "opacity-20", blob2: "opacity-15", blob3: "opacity-10", grain: "opacity-[0.02]" },
  minimal: { blob1: "opacity-10", blob2: "opacity-8", blob3: "opacity-5", grain: "opacity-[0.015]" },
} as const;

export function AtmosphericBackground({
  intensity,
}: {
  intensity: "full" | "subtle" | "minimal";
}) {
  const config = intensityConfig[intensity];

  return (
    <div
      data-testid="atmospheric-bg"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Gradient mesh blobs */}
      <div
        data-testid="atmospheric-blob"
        className={`absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-mesh-1 ${config.blob1} blur-[120px]`}
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      />
      <div
        data-testid="atmospheric-blob"
        className={`absolute -right-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-mesh-2 ${config.blob2} blur-[100px]`}
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      />
      <div
        data-testid="atmospheric-blob"
        className={`absolute -bottom-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-mesh-3 ${config.blob3} blur-[80px]`}
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      />

      {/* Grain overlay */}
      <div
        className={`absolute inset-0 ${config.grain}`}
        style={{
          backgroundImage: GRAIN_SVG,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
    </div>
  );
}
