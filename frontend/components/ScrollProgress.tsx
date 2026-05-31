"use client";

import { useEffect, useState } from "react";

const ScrollProgress = () => {
    const [scroll, setScroll] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight =
                document.documentElement.scrollHeight -
                document.documentElement.clientHeight;

            const scrollPosition = window.scrollY;

            const progress = (scrollPosition / totalHeight) * 100;

            setScroll(progress);
        };

        window.addEventListener("scroll", handleScroll);

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: `${scroll}%`,
                height: "4px",
                background: "linear-gradient(to right, #7c3aed, #06b6d4, #3b82f6)",
                boxShadow: "0 0 10px rgba(59,130,246,0.7)",
                zIndex: 9999,
                transition: "width 0.1s ease",
            }}
        />
    );
};

export default ScrollProgress;