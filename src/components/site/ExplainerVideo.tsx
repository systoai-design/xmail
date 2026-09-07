import { useRef, useState } from "react";
import { Play, Clapperboard } from "lucide-react";
import { SectionField } from "./SectionField";

/**
 * The explainer, sitting before the layers section.
 *
 * `preload="none"` because this is six megabytes and most visitors scroll past
 * it. The poster frame is a real frame of the video rather than a graphic, so
 * what you see before pressing play is what you get after.
 *
 * The overlay is a real button rather than a click handler on the video: the
 * video only gains native controls once it has started, and until then there
 * has to be something the keyboard can reach.
 */
export function ExplainerVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = () => {
    setStarted(true);
    void video.current?.play();
  };

  return (
    <section
      className="relative py-20 sm:py-24"
      aria-labelledby="explainer-heading"
    >
      <SectionField variant="center" bleed />

      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="panel pill inline-flex items-center gap-2 px-3 py-1 text-xs text-l4">
            <Clapperboard className="h-3.5 w-3.5" />
            Watch
          </span>
          <h2
            id="explainer-heading"
            className="mt-5 text-balance text-3xl sm:text-4xl"
          >
            What xmail does, in half a minute
          </h2>
        </div>

        <div className="relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[hsl(var(--surface-sunken))] sm:rounded-[36px]">
          <video
            ref={video}
            className="block aspect-video w-full"
            poster="/xmail-explainer-poster.jpg"
            preload="none"
            playsInline
            controls={started}
            onEnded={() => setStarted(false)}
          >
            <source src="/xmail-explainer.mp4" type="video/mp4" />
          </video>

          {!started && (
            <button
              type="button"
              onClick={start}
              aria-label="Play the xmail explainer"
              className="absolute inset-0 flex items-center justify-center transition-colors hover:bg-black/[0.06]"
            >
              {/* Dark on light rather than the other way round: the poster is
                  a near-white frame, so a white control would have nothing to
                  sit against. */}
              <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-black/85 text-white shadow-[var(--shadow-xl)] backdrop-blur-sm sm:h-20 sm:w-20">
                {/* Nudged right because a triangle's optical centre is left of
                    its bounding box, and centred geometry reads as off-centre. */}
                <Play className="ml-1 h-6 w-6 fill-current sm:h-7 sm:w-7" />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
