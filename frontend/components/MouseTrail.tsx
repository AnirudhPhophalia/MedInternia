import React, { useEffect, useRef } from "react";

const MouseTrail = () => {
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const trail = trailRef.current;
      if (!trail) return;
      const droplet = document.createElement("div");
      droplet.className = "mouse-droplet";
      droplet.style.left = `${e.clientX - 8}px`;
      droplet.style.top = `${e.clientY - 8}px`;
      trail.appendChild(droplet);
      setTimeout(() => {
        droplet.remove();
      }, 400); // Faster fade
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={trailRef}
      className="mouse-trail"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
};

export default MouseTrail;
