interface AmbientFieldProps {
  count?: number;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return function nextRandom() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function AmbientField({ count = 18 }: AmbientFieldProps) {
  const dots = Array.from({ length: count }, (_, i) => {
    const random = createSeededRandom(count * 1009 + i * 9176 + 12345);

    return {
      id: i,
      x: random() * 100,
      y: random() * 100,
      s: 1 + random() * 2.5,
      d: 14 + random() * 24,
      delay: -random() * 24,
      o: 0.18 + random() * 0.32,
    };
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {dots.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.s, height: p.s, borderRadius: 999,
            background: "currentColor",
            opacity: p.o,
            animation: `drift ${p.d}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
