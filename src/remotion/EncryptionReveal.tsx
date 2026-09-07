import { useCurrentFrame, interpolate, random } from "remotion";

/**
 * "What the server actually sees."
 *
 * The section claims two things at once: we cannot read your mail, but the
 * envelope has to stay readable or nothing can be delivered. That is a hard
 * pair to hold in words, and trivial to show — so the body scrambles into
 * ciphertext while From / To / Sent stay crisp, and the two labels land on the
 * two halves.
 *
 * Rendered through @remotion/player and scrubbed by scroll position, so the
 * viewer performs the encryption themselves rather than watching a loop.
 *
 * Determinism matters here: Remotion re-renders any frame at any time, so all
 * randomness comes from remotion's seeded random(), never Math.random().
 */

const CIPHER_GLYPHS = "ABCDEF0123456789";

const BODY_LINES = [
  "Signed the lease this morning — keys on Friday.",
  "Wire the deposit to the account I sent last week,",
  "and keep the reference number off email.",
];

const ENVELOPE = [
  { label: "From", value: "7xKq…4Fm2" },
  { label: "To", value: "9dRt…8Wp1" },
  { label: "Sent", value: "09:24" },
];

/** Plaintext → scrambling → settled ciphertext, per character. */
function glyphFor(char: string, charSeed: number, progress: number): string {
  if (char === " ") return " ";
  if (progress <= 0) return char;
  // Each character starts scrambling at its own moment, so the line dissolves
  // left to right instead of flipping all at once.
  const start = random(`start-${charSeed}`) * 0.45;
  const local = (progress - start) / 0.55;
  if (local <= 0) return char;
  if (local >= 1) {
    return CIPHER_GLYPHS[Math.floor(random(`final-${charSeed}`) * CIPHER_GLYPHS.length)];
  }
  // Mid-flight: churn, using the frame bucket as part of the seed.
  const churn = Math.floor(local * 9);
  return CIPHER_GLYPHS[Math.floor(random(`churn-${charSeed}-${churn}`) * CIPHER_GLYPHS.length)];
}

export const DURATION_IN_FRAMES = 210;
export const FPS = 30;

export const EncryptionReveal: React.FC = () => {
  const frame = useCurrentFrame();

  // Typing, then encryption, then the two labels.
  const typed = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const encrypt = interpolate(frame, [36, 132], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const envelopeLabel = interpolate(frame, [132, 158], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bodyLabel = interpolate(frame, [162, 190], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const totalChars = BODY_LINES.join("").length;
  const revealedChars = Math.floor(typed * totalChars);

  // Precomputed, not accumulated during render: StrictMode renders twice and a
  // running counter would double every offset on the second pass.
  const lineOffsets = BODY_LINES.reduce<number[]>(
    (acc, line, i) => [...acc, (acc[i] ?? 0) + line.length],
    [0],
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        color: "hsl(45 12% 94%)",
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          borderRadius: 24,
          border: "1px solid hsl(0 0% 100% / 0.10)",
          background: "hsl(240 6% 7%)",
          overflow: "hidden",
        }}
      >
        {/* --- envelope: stays readable, and says so --------------------- */}
        <div
          style={{
            position: "relative",
            padding: "24px 30px",
            borderBottom: "1px solid hsl(0 0% 100% / 0.08)",
            background: `hsl(0 0% 100% / ${0.02 + envelopeLabel * 0.03})`,
          }}
        >
          {ENVELOPE.map(({ label, value }) => (
            <div
              key={label}
              style={{ display: "flex", gap: 18, fontSize: 17, lineHeight: "30px" }}
            >
              <span style={{ width: 62, color: "hsl(45 6% 60%)" }}>{label}</span>
              <span>{value}</span>
            </div>
          ))}

          <div
            style={{
              position: "absolute",
              top: 24,
              right: 30,
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "hsl(38 92% 62%)",
              opacity: envelopeLabel,
              transform: `translateX(${(1 - envelopeLabel) * 12}px)`,
            }}
          >
            visible to us
          </div>
        </div>

        {/* --- body: never readable -------------------------------------- */}
        <div style={{ position: "relative", padding: "30px" }}>
          {BODY_LINES.map((line, lineIndex) => (
            <div
              key={lineIndex}
              style={{
                fontSize: 18,
                lineHeight: "36px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {line.split("").map((char, i) => {
                const globalIndex = lineOffsets[lineIndex] + i;
                const visible = globalIndex < revealedChars;
                const rendered = glyphFor(char, globalIndex, encrypt);
                return (
                  <span
                    key={i}
                    style={{
                      opacity: visible ? 1 : 0,
                      color:
                        encrypt > 0 && rendered !== char
                          ? "hsl(45 6% 58%)"
                          : "hsl(45 12% 94%)",
                    }}
                  >
                    {rendered}
                  </span>
                );
              })}
            </div>
          ))}

          <div
            style={{
              marginTop: 24,
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "hsl(152 55% 55%)",
              opacity: bodyLabel,
              transform: `translateY(${(1 - bodyLabel) * 8}px)`,
            }}
          >
            never readable to us — not by policy, by construction
          </div>
        </div>
      </div>
    </div>
  );
};
