import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InteractiveHoverButton from "./magicui/interactive-hover-button";
import { Particles } from "./magicui/particles";
import { TextAnimate } from "./magicui/text-animate";

export default function LandingPage() {
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    setColor(resolvedTheme === "dark" ? "#ffffff" : "#000000");
  }, [resolvedTheme]);
  return (
    <div className="bg-background relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-none">
      <span className="pointer-events-none bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10">
        Zap
      </span>
      <Particles
        className="absolute inset-0 z-0"
        quantity={200}
        ease={100}
        color={color}
        refresh
      />
      <main flex-1 justify-center z-10>
        <div className="mt-2 mb-10 w-[650px]">
          <TextAnimate
            animation="blurInUp"
            by="character"
            once={false}
            delay={0}
            className="py-4 text-xl text-stone-800"
          >
            Transfer files in a flash with Zap — no cables, no cloud, just
            speed.
          </TextAnimate>
        </div>

        <div className="mt-2 flex flex-col justify-center gap-2 min-[400px]:flex-row">
          <Link to="/home">
            <InteractiveHoverButton>
              Get Started to Share{" "}
            </InteractiveHoverButton>
          </Link>
        </div>
      </main>
    </div>
  );
}
