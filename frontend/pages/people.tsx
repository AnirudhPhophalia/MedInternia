import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import api from "../utils/api";

export default function PeoplePage() {
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState("cases");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  // Dummy data for posts (fallback)
  const dummyPosts = [
    {
      id: 1,
      title: "Complex Iron Deficiency Case Study",
      content:
        "A comprehensive analysis of a 21-year-old patient with severe fatigue and iron deficiency anemia. This case demonstrates innovative treatment approaches and patient recovery tracking...",
      date: "Aug 21, 2025",
      privacy: "Private",
      views: 142,
      comments: 8,
      likes: 23,
    },
    {
      id: 2,
      title: "Emergency Cardiac Arrest Protocol",
      content:
        "A unique case of sudden cardiac arrest in the emergency ward with atypical presentation. This study covers rapid response protocols and successful intervention strategies...",
      date: "Aug 20, 2025",
      privacy: "Public",
      views: 318,
      comments: 15,
      likes: 67,
    },
  ];

  useEffect(() => {
    if (!id) return;
    // Fetch profile
    api.get(`/users/${id}/profile`).then((res) => {
      setProfile(res.data?.data?.user || res.data?.user || res.data);
    });
    // Fetch posts/cases
    api.get(`/cases?authorId=${id}`).then((res) => {
      setPosts(res.data?.data?.cases || res.data?.cases || res.data || []);
    });
  }, [id]);

  const toggleLike = (postId: number) => {
    setLikedPosts((prev) => {
      const newLiked = new Set(prev);
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
      } else {
        newLiked.add(postId);
      }
      return newLiked;
    });
  };

  return (
    <div
      style={{
        padding: 32,
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 40,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Profile Section - left, 1/4 width */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "1px solid #f0f4f8",
              position: "sticky",
              top: 20,
              height: "fit-content",
              marginBottom: 40,
            }}
          >
            {/* ...profile section code... */}
            <div
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                height: 120,
                borderRadius: 12,
                position: "relative",
                marginBottom: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  role="img"
                  aria-label="heart"
                  style={{ fontSize: 45, color: "white" }}
                >
                  🥼
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: -40,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: "#e0f2fe",
                  border: "4px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#0284c7",
                }}
              >
                {profile?.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt="Profile"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  `${(profile?.firstName?.[0] || "A").toUpperCase()}${(
                    profile?.lastName?.[0] || "V"
                  ).toUpperCase()}`
                )}
              </div>
            </div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1e293b",
                  margin: "0 0 8px 0",
                }}
              >
                {profile
                  ? `Dr. ${profile.firstName} ${profile.lastName}`
                  : "Dr. Anushka Verma"}
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {profile?.specialization || "Cardiology Specialist"}
              </p>
              <button
                style={{
                  marginTop: 16,
                  padding: "10px 28px",
                  borderRadius: 8,
                  background: isConnected
                    ? "linear-gradient(90deg, #64748b 0%, #94a3b8 100%)"
                    : "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  border: "none",
                  boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
                  cursor: isConnected ? "default" : "pointer",
                  transition: "background 0.2s, box-shadow 0.2s",
                  opacity: isConnected ? 0.8 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isConnected) {
                    e.currentTarget.style.background =
                      "linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isConnected) {
                    e.currentTarget.style.background =
                      "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)";
                  }
                }}
                onClick={() => {
                  if (!isConnected) setIsConnected(true);
                }}
              >
                {isConnected ? "Connected" : "Connect"}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 24,
                marginBottom: 20,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: "#0ea5e9" }}
                >
                  {profile?.followersCount ?? "1,245"}
                </div>
                <div
                  style={{ fontSize: 12, color: "#64748b", cursor: "pointer" }}
                >
                  Followers
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}
                >
                  {profile?.followingCount ?? "90"}
                </div>
                <div
                  style={{ fontSize: 12, color: "#64748b", cursor: "pointer" }}
                >
                  Following
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 14, color: "#64748b" }}>
                  85% to next badge
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 8,
                  backgroundColor: "#e2e8f0",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "85%",
                    height: "100%",
                    background:
                      "linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)",
                    borderRadius: 4,
                  }}
                ></div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: 12,
                }}
              >
                Badges & Achievements
              </h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "center",
                }}
              >
                <img
                  src="/p1.png"
                  alt="Badge 1"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    border: "2px solid #e0e7ef",
                  }}
                />
                <img
                  src="/p4.png"
                  alt="Badge 2"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    border: "2px solid #e0e7ef",
                  }}
                />
                <img
                  src="/p2.png"
                  alt="Badge 3"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    border: "2px solid #e0e7ef",
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ fontWeight: 500, color: "#64748b", minWidth: 110 }}
                >
                  Specialization:
                </span>
                <span style={{ fontWeight: 500, color: "#1e293b" }}>
                  {profile?.specialization || "Cardiology"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ fontWeight: 500, color: "#64748b", minWidth: 110 }}
                >
                  Qualifications:
                </span>
                <span style={{ fontWeight: 500, color: "#1e293b" }}>
                  {profile?.qualifications?.join(" ") || "MBBS MD"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ fontWeight: 500, color: "#64748b", minWidth: 110 }}
                >
                  Experience:
                </span>
                <span style={{ fontWeight: 700, color: "#1e293b" }}>
                  {profile?.experience || "5+ Years"}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 16,
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}
                >
                  4.9
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Rating</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 24, fontWeight: 700, color: "#0ea5e9" }}
                >
                  2
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Cases</div>
              </div>
            </div>
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: 12,
                }}
              >
                Contact
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "#64748b" }}>
                    {profile?.email || "anushka5@gmail.com"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "#64748b" }}>
                    {profile?.phone || "+91-9876543210"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* People Page Section - right, 3/4 width */}
        <div style={{ flex: 3, minWidth: 0 }}>
          <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 24 }}>
            About
          </h1>
          <div style={{ marginBottom: 24 }}>
            <button
              style={{
                marginRight: 8,
                padding: "8px 16px",
                borderRadius: 8,
                background: activeTab === "cases" ? "#2563eb" : "#e5e7eb",
                color: activeTab === "cases" ? "#fff" : "#111827",
                border: "none",
                fontWeight: "bold",
              }}
              onClick={() => setActiveTab("cases")}
            >
              Case Studies
            </button>
            <button
              style={{
                marginRight: 8,
                padding: "8px 16px",
                borderRadius: 8,
                background: activeTab === "research" ? "#9333ea" : "#e5e7eb",
                color: activeTab === "research" ? "#fff" : "#111827",
                border: "none",
                fontWeight: "bold",
              }}
              onClick={() => setActiveTab("research")}
            >
              Research
            </button>
            <button
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background:
                  activeTab === "announcements" ? "#f59e42" : "#e5e7eb",
                color: activeTab === "announcements" ? "#fff" : "#111827",
                border: "none",
                fontWeight: "bold",
              }}
              onClick={() => setActiveTab("announcements")}
            >
              Announcements
            </button>
          </div>
          {activeTab === "cases" && (
            <div>
              {(posts.length > 0 ? posts : dummyPosts).map((post, idx) => {
                // Safely handle comments and likes
                const commentsCount = Array.isArray(post.comments)
                  ? post.comments.length
                  : typeof post.comments === "object" &&
                    post.comments !== null &&
                    post.comments.length !== undefined
                  ? post.comments.length
                  : typeof post.comments === "number"
                  ? post.comments
                  : 0;
                const likesCount = Array.isArray(post.likes)
                  ? post.likes.length
                  : typeof post.likes === "object" &&
                    post.likes !== null &&
                    post.likes.length !== undefined
                  ? post.likes.length
                  : typeof post.likes === "number"
                  ? post.likes
                  : 0;
                const caseColors = [
                  {
                    bg: "linear-gradient(90deg, #d1fae5 100%, #10b981 100%)",
                    border: "8px solid #10b981",
                  }, // green
                  {
                    bg: "linear-gradient(90deg, #e0f2fe 100%, #38bdf8 100%)",
                    border: "8px solid #38bdf8",
                  }, // blue
                  // {
                  //   bg: "linear-gradient(90deg, #ffe7c2 100%, #fb923c 100%)",
                  //   border: "8px solid #fb923c",
                  // }, // orange
                  {
                    bg: "linear-gradient(90deg, #f3e8ff 100%, #a78bfa 100%)",
                    border: "8px solid #a78bfa",
                  }, // purple
                  {
                    bg: "linear-gradient(90deg, #fef9c3 100%, #f59e42 100%)",
                    border: "8px solid #f59e42",
                  }, // yellow
                  {
                    bg: "linear-gradient(90deg, #fdd3d3ff 100%, #fa9f9fff 100%)",
                    border: "8px solid #ef4444",
                  }, // red
                  {
                    bg: "linear-gradient(90deg, #bbf7d0 100%, #22d3ee 100%)",
                    border: "8px solid #22d3ee",
                  }, // teal
                  {
                    bg: "linear-gradient(90deg, #e0e7ff 100%, #6366f1 100%)",
                    border: "8px solid #6366f1",
                  }, // indigo
                  {
                    bg: "linear-gradient(90deg, #fde2ff 100%, #a770ef 100%)",
                    border: "8px solid #a770ef",
                  }, // pink-purple
                  {
                    bg: "linear-gradient(90deg, #caffbf 100%, #9bf6ff 100%)",
                    border: "8px solid #9bf6ff",
                  }, // mint-blue
                ];
                const color = caseColors[idx % caseColors.length];
                // Format date and time
                let formattedDate = "Date unknown";
                const rawDate = post.date || post.createdAt;
                if (rawDate) {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) {
                    formattedDate = d.toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                  } else {
                    formattedDate = rawDate;
                  }
                }
                return (
                  <div
                    key={post.id || post._id}
                    style={{
                      background: color.bg,
                      borderRadius: 16,
                      padding: 24,
                      marginBottom: 16,
                      transition: "box-shadow 0.2s, transform 0.2s",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      borderLeft: color.border,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(37,99,235,0.12)";
                      e.currentTarget.style.transform =
                        "translateY(-2px) scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        marginBottom: 8,
                        color:
                          idx === 0
                            ? "#10b981"
                            : idx === 1
                            ? "#38bdf8"
                            : "#fb923c",
                      }}
                    >
                      {post.title || post.content?.title || "Untitled"}
                    </h2>
                    <p style={{ color: "#374151", marginBottom: 8 }}>
                      {post.content || post.description || "No description"}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 14,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: "#6366f1", fontWeight: 500 }}>
                        {formattedDate}
                      </span>
                      <span
                        style={{
                          color:
                            idx === 0
                              ? "#10b981"
                              : idx === 1
                              ? "#38bdf8"
                              : "#fb923c",
                          fontWeight: 500,
                        }}
                      >
                        {post.privacy || post.status || "Public"}
                      </span>
                      <span>{post.views || post.viewCount || 0} views</span>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <button
                        style={{
                          background: likedPosts.has(post.id || post._id)
                            ? "#fee2e2"
                            : "#e5e7eb",
                          color: likedPosts.has(post.id || post._id)
                            ? "#dc2626"
                            : "#374151",
                          border: "none",
                          borderRadius: 8,
                          padding: "4px 12px",
                          fontWeight: "bold",
                        }}
                        onClick={() => toggleLike(post.id || post._id)}
                      >
                        ❤️
                        {likesCount +
                          (likedPosts.has(post.id || post._id) ? 1 : 0)}
                      </button>
                      <span>📜 {commentsCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === "research" && (
            <div>
              {[
                {
                  title: "AI-Driven Cardiology: The Future of Diagnosis",
                  content:
                    "Comprehensive research exploring how artificial intelligence is revolutionizing cardiology diagnostics, with focus on machine learning algorithms for cardiac imaging analysis and early detection protocols...",
                  meta: [
                    "Published: July 2025",
                    "45 citations",
                    "1203 downloads",
                  ],
                },
                {
                  title: "Novel Cardiac Drug Trials: Phase III Results",
                  content:
                    "Breakthrough clinical trial results for next-generation cardiac medications showing remarkable efficacy in treating arrhythmias with reduced side effects compared to traditional treatments...",
                  meta: [
                    "Published: June 2025",
                    "23 citations",
                    "867 downloads",
                  ],
                },
              ].map((card, idx) => (
                <div
                  key={card.title}
                  style={{
                    background:
                      idx === 0
                        ? "linear-gradient(90deg, #e0f2fe 100%, #38bdf8 50%)" // light blue
                        : "linear-gradient(90deg, #FFE7C2 100%, #fb923c 50%)", // light orange
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 16,
                    transition: "box-shadow 0.2s, transform 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    borderLeft:
                      idx === 0 ? "8px solid #38bdf8" : "8px solid #fb923c",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(37,99,235,0.12)";
                    e.currentTarget.style.transform =
                      "translateY(-2px) scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.04)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      marginBottom: 8,
                      color: idx === 0 ? "#38bdf8" : "#fb923c",
                    }}
                  >
                    {card.title}
                  </h2>
                  <p style={{ color: "#374151", marginBottom: 8 }}>
                    {card.content}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 14,
                      color: "#6b7280",
                      marginBottom: 8,
                    }}
                  >
                    {card.meta.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === "announcements" && (
            <div>
              {[
                {
                  title: "Live Webinar: Advanced Cardiac Imaging Techniques",
                  content:
                    "Join us on August 25th for an exclusive live webinar exploring cutting-edge advancements in cardiac imaging, featuring real-time case discussions and Q&A with leading cardiologists...",
                  badge: {
                    text: "Upcoming Event",
                    style: {
                      background: "#fde68a",
                      color: "#92400e",
                      borderRadius: 8,
                      padding: "4px 12px",
                      fontWeight: "bold",
                    },
                  },
                },
                {
                  title: "Platform Update: Enhanced Collaboration Features",
                  content:
                    "Exciting new features have been added to improve collaboration between medical professionals, including advanced profile management, real-time messaging, and integrated case sharing tools.",
                  badge: {
                    text: "System Update",
                    style: {
                      background: "#6ee7b7",
                      color: "#065f46",
                      borderRadius: 8,
                      padding: "4px 12px",
                      fontWeight: "bold",
                    },
                  },
                },
              ].map((card, idx) => (
                <div
                  key={card.title}
                  style={{
                    background: idx === 0 ? "#fef3c7" : "#d1fae5",
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 16,
                    transition: "box-shadow 0.2s, transform 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(37,99,235,0.12)";
                    e.currentTarget.style.transform =
                      "translateY(-2px) scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.04)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      marginBottom: 8,
                    }}
                  >
                    {card.title}
                  </h2>
                  <p style={{ color: "#374151", marginBottom: 8 }}>
                    {card.content}
                  </p>
                  <span style={card.badge.style}>{card.badge.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
