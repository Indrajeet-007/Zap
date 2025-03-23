import { InteractiveHoverButton } from "./magicui/interactive-hover-button";
import { TextAnimate } from "./magicui/text-animate";
import { Link } from "react-router-dom";

("use client");

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Particles } from "./magicui/particles";
function LandingPage() {
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    setColor(resolvedTheme === "dark" ? "#ffffff" : "#000000");
  }, [resolvedTheme]);
  return (
    <div className="relative flex h-[500px] border-none w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background">
      <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
        SwiftShare
      </span>
      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={color}
        refresh
      />
      <main flex-1 justify-center z-10>
        <div className="w-[650px] mt-2 mb-10">
          <TextAnimate
            animation="blurInUp"
            by="character"
            once={false}
            delay={0}
            className="text-xl py-4 text-stone-800"
          >
            DropUI is a powerful visual builder that lets you create stunning
            websites without writing a single line of code. Just drag and drop.
          </TextAnimate>
        </div>

        <div className="flex mt-2 flex-col gap-2 min-[400px]:flex-row justify-center">
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

export default LandingPage;
