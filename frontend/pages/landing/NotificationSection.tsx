import React from "react";

const NotificationSection = ({
  postFormHeight,
}: {
  postFormHeight?: number;
}) => {
  const notificationCategories = [
    { label: "All", count: 8 },
    { label: "Comments", count: 4 },
    { label: "Likes", count: 2 },
    { label: "Collaboration", count: 1 },
    { label: "Mentions", count: 1 },
  ];
  const notificationItems = [
    {
      category: "Comments",
      color: "#10b981",
      bg: "#f0fdf4",
      text: "Dr. Martinez replied to your comment on 'Pediatric Arrhythmia Case'",
      time: "2 min ago",
    },
    {
      category: "Collaboration",
      color: "#0ea5e9",
      bg: "#f0f9ff",
      text: "Dr. Loo sent you a collaboration request for cardiac research",
      time: "15 min ago",
    },
    {
      category: "Likes",
      color: "#f59e0b",
      bg: "#fffbeb",
      text: "Your case study received 25 new likes",
      time: "1 hour ago",
    },
  ];
  const [activeCategory, setActiveCategory] = React.useState("All");
  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "1px solid #f0f4f8",
        maxHeight: postFormHeight ? postFormHeight : 480,
        minHeight: postFormHeight ? postFormHeight : 240,
        overflowY: "auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
            }}
          >
            Notifications
            <span
              style={{
                backgroundColor: "#ef4444",
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 10,
                marginLeft: 8,
              }}
            >
              3
            </span>
          </h3>
        </div>
        <button
          style={{
            color: "#0ea5e9",
            fontSize: 14,
            fontWeight: 600,
            background: "none",
            border: "none",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          More →
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        {notificationCategories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(cat.label)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border:
                activeCategory === cat.label
                  ? "2px solid #10b981"
                  : "1px solid #e2e8f0",
              backgroundColor:
                activeCategory === cat.label ? "#10b98120" : "#fff",
              color: activeCategory === cat.label ? "#10b981" : "#64748b",
              fontSize: 13,
              fontWeight: activeCategory === cat.label ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {cat.label}
            <span
              style={{
                backgroundColor:
                  activeCategory === cat.label ? "#10b981" : "#e2e8f0",
                color: activeCategory === cat.label ? "#fff" : "#64748b",
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 10,
                marginLeft: 4,
              }}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notificationItems
          .filter(
            (item) =>
              activeCategory === "All" || item.category === activeCategory,
          )
          .map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: 12,
                borderLeft: `3px solid ${item.color}`,
                backgroundColor: item.bg,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#1e293b",
                  margin: "0 0 4px 0",
                  fontWeight: 500,
                }}
              >
                {item.text}
              </p>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                ⏰ {item.time}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default NotificationSection;
