import React, { useState, useEffect } from "react";
import { Fab, Zoom, Tooltip } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

interface ScrollToTopProps {
  threshold?: number;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ threshold = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <Zoom in={isVisible}>
      <Tooltip title="Scroll to top" placement="left">
        <Fab
          color="primary"
          size="medium"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          sx={{
            position: "fixed",
            bottom: 85,
            right: 20,
            zIndex: 9990,
            background: "linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)",
            color: "#ffffff",
            boxShadow: "0 4px 14px rgba(0, 114, 255, 0.35)",
            transition: "transform 0.2s ease-in-out, background 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
            "&:hover": {
              background: "linear-gradient(135deg, #0056cc 0%, #0072ff 100%)",
              transform: "scale(1.08) translateY(-2px)",
              boxShadow: "0 6px 20px rgba(0, 114, 255, 0.5)",
            },
            "&:active": {
              transform: "scale(0.95)",
            },
          }}
        >
          <KeyboardArrowUpIcon fontSize="medium" />
        </Fab>
      </Tooltip>
    </Zoom>
  );
};

export default ScrollToTop;
