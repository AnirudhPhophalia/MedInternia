import { useEffect, useState } from "react";
import { Chip, ChipProps } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { getDeadlineStatus, DeadlineUrgency } from "../utils/deadlineCountdown";

const URGENCY_COLOR_MAP: Record<DeadlineUrgency, ChipProps["color"]> = {
  low: "success",
  medium: "warning",
  high: "error",
  closed: "default",
  unknown: "default",
};

// Recompute every minute so the countdown stays fresh without hammering
// the CPU (no need for second-level precision on a deadline chip).
const REFRESH_INTERVAL_MS = 60 * 1000;

interface DeadlineCountdownProps {
  deadline?: string | number | Date | null;
  size?: ChipProps["size"];
}

export default function DeadlineCountdown({
  deadline,
  size = "small",
}: DeadlineCountdownProps) {
  const [status, setStatus] = useState(() => getDeadlineStatus(deadline));

  useEffect(() => {
    setStatus(getDeadlineStatus(deadline));

    const interval = setInterval(() => {
      setStatus(getDeadlineStatus(deadline));
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [deadline]);

  if (status.isUnknown) {
    return null;
  }

  return (
    <Chip
      icon={status.isClosed ? <EventBusyIcon /> : <AccessTimeIcon />}
      label={status.label}
      size={size}
      color={URGENCY_COLOR_MAP[status.urgency]}
      variant={status.isClosed ? "outlined" : "filled"}
      sx={{ fontWeight: 700 }}
    />
  );
}

