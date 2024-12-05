import { useState, useEffect } from "react";

type Breakpoint = "mobile" | "tablet" | "desktop";

const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    const width = window.innerWidth;
    if (width <= 599) return "mobile";
    if (width <= 910) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    let timeout: number;

    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const width = window.innerWidth;
        if (width <= 599) {
          setBreakpoint("mobile");
        } else if (width <= 910) {
          setBreakpoint("tablet");
        } else {
          setBreakpoint("desktop");
        }
      }, 100); // Adjust debounce time as needed
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return breakpoint;
};

export default useBreakpoint;
