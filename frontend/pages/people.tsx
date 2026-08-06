import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function PeoplePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnectionLoading, setIsConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const router = useRouter();
  const { id } = router.query;
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState("cases");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [badges, setBadges] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    caseCount: number;
    averageRating: number;
    profileScore: number;
    badgesEarned: number;
  } | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [researchPapers, setResearchPapers] = useState<any[]>([]);
  const [webinars, setWebinars] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    setProfileLoading(true);
    setProfileError("");
    api
      .get(`/users/${id}/public`)
      .then((res) => {
        const data = res.data?.data || {};
        setProfile(data.user || null);
        setBadges(Array.isArray(data.badges) ? data.badges : []);
        setStats(
          data.stats || {
            caseCount: Array.isArray(data.cases) ? data.cases.length : 0,
            averageRating: 0,
            profileScore: 0,
            badgesEarned: 0,
          },
        );
        setPosts(Array.isArray(data.cases) ? data.cases : []);
      })
      .catch(() => {
        setProfile(null);
        setBadges([]);
        setStats(null);
        setPosts([]);
        setProfileError("Could not load this profile.");
      })
      .finally(() => setProfileLoading(false));

    api
      .get(`/research-papers?author=${id}`)
      .then((res) => {
        setResearchPapers(
          res.data?.data?.papers || res.data?.papers || res.data || [],
        );
      })
      .catch(() => setResearchPapers([]));

    api
      .get(`/webinars?hosted=${id}`)
      .then((res) => {
        setWebinars(
          res.data?.data?.webinars || res.data?.webinars || res.data || [],
        );
      })
      .catch(() => setWebinars([]));
  }, [id]);

  useEffect(() => {
    if (!id || !userId) return;

    api.get(`/users/${userId}/connections`).then((res) => {
      const following = res.data?.following || [];
      setIsConnected(
        following.some((connection: any) =>
          String(connection._id || connection.id) === String(id),
        ),
      );
    });
  }, [id, userId]);

  const toggleConnection = async () => {
    if (!id || isConnectionLoading) return;

    setIsConnectionLoading(true);
    setConnectionError("");
    const wasConnected = isConnected;
    try {
      await api.post(wasConnected ? "/users/unfollow" : "/users/follow", {
        userId: id,
      });
      setIsConnected(!wasConnected);
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              followersCount: Math.max(
                0,
                Number(prev.followersCount || 0) + (wasConnected ? -1 : 1),
              ),
            }
          : prev,
      );
    } catch {
      setConnectionError("Could not update this connection. Please try again.");
    } finally {
      setIsConnectionLoading(false);
    }
  };

  const toggleLike = async (postId: string) => {
    // Optimistic local update
    setLikedPosts((prev) => {
      const newLiked = new Set(prev);
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
      } else {
        newLiked.add(postId);
      }
      return newLiked;
    });
    // Persist to backend
    try {
      await api.post(`/cases/${postId}/like`);
    } catch {
      // Roll back optimistic update on failure
      setLikedPosts((prev) => {
        const newLiked = new Set(prev);
        if (newLiked.has(postId)) {
          newLiked.delete(postId);
        } else {
          newLiked.add(postId);
        }
        return newLiked;
      });
    }
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
                  `${(profile?.firstName?.[0] || "?").toUpperCase()}${(
                    profile?.lastName?.[0] || ""
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
                {profileLoading
                  ? "Loading profile..."
                  : profile
                    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
                      "Unnamed user"
                    : profileError
                      ? "Profile unavailable"
                      : "Profile"}
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {profile?.specialization || "Specialization not listed"}
              </p>
              {profileError && (
                <p role="alert" style={{ color: "#b91c1c", margin: "8px 0 0" }}>
                  {profileError}
                </p>
              )}
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
                  cursor: isConnectionLoading ? "default" : "pointer",
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
                disabled={isConnectionLoading}
                onClick={toggleConnection}
              >
                {isConnectionLoading
                  ? "Saving..."
                  : isConnected
                    ? "Connected"
                    : "Connect"}
              </button>
              {connectionError && (
                <p role="alert" style={{ color: "#b91c1c", margin: "8px 0 0" }}>
                  {connectionError}
                </p>
              )}
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
                  {profileLoading ? "—" : Number(profile?.followersCount ?? 0)}
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
                  {profileLoading ? "—" : Number(profile?.followingCount ?? 0)}
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
                  {profileLoading
                    ? "Loading profile completeness..."
                    : `${Number(stats?.profileScore ?? 0)}% profile completeness`}
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
                    width: `${Math.min(100, Math.max(0, Number(stats?.profileScore ?? 0)))}%`,
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
                {profileLoading ? (
                  <span style={{ fontSize: 13, color: "#64748b" }}>Loading badges...</span>
                ) : badges.length === 0 ? (
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    No badges earned yet
                  </span>
                ) : (
                  badges.map((entry, idx) => {
                    const badge = entry.badge || entry;
                    return (
                      <div
                        key={entry._id || badge._id || idx}
                        title={badge.description || badge.name || "Badge"}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          border: "2px solid #e0e7ef",
                          background: badge.color || "#e0f2fe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                        }}
                        aria-label={badge.name || "Badge"}
                      >
                        {badge.icon || (badge.name?.[0] || "B")}
                      </div>
                    );
                  })
                )}
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
                  {profile?.specialization || "Not specified"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ fontWeight: 500, color: "#64748b", minWidth: 110 }}
                >
                  Qualifications:
                </span>
                <span style={{ fontWeight: 500, color: "#1e293b" }}>
                  {Array.isArray(profile?.qualifications) &&
                  profile.qualifications.length > 0
                    ? profile.qualifications.join(" ")
                    : "Not specified"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ fontWeight: 500, color: "#64748b", minWidth: 110 }}
                >
                  Experience:
                </span>
                <span style={{ fontWeight: 700, color: "#1e293b" }}>
                  {profile?.experience != null && profile?.experience !== ""
                    ? `${profile.experience} Years`
                    : "Not specified"}
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
                  {profileLoading
                    ? "—"
                    : Number(stats?.averageRating ?? 0) > 0
                      ? Number(stats?.averageRating).toFixed(1)
                      : "0"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Rating</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 24, fontWeight: 700, color: "#0ea5e9" }}
                >
                  {profileLoading
                    ? "—"
                    : Number(stats?.caseCount ?? posts.length ?? 0)}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Cases</div>
              </div>
            </div>
            {/* Contact section removed: email and phone are PII and must
                not be visible to other users on a public profile page. */}
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
              {posts.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 15 }}>
                  No published cases yet.
                </p>
              ) : (
              posts.map((post, idx) => {
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
              })
              )}
            </div>
          )}
          {activeTab === "research" && (
            <div>
              {researchPapers.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 15 }}>No research papers found for this user.</p>
              ) : (
                researchPapers.map((paper: any, idx: number) => (
                  <div
                    key={paper._id || paper.id || idx}
                    style={{
                      background: idx % 2 === 0
                        ? "linear-gradient(90deg, #e0f2fe 100%, #38bdf8 50%)"
                        : "linear-gradient(90deg, #FFE7C2 100%, #fb923c 50%)",
                      borderRadius: 16,
                      padding: 24,
                      marginBottom: 16,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      borderLeft: idx % 2 === 0 ? "8px solid #38bdf8" : "8px solid #fb923c",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.12)";
                      e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8, color: idx % 2 === 0 ? "#38bdf8" : "#fb923c" }}>
                      {paper.title || "Untitled"}
                    </h2>
                    <p style={{ color: "#374151", marginBottom: 8 }}>{paper.abstract || paper.description || ""}</p>
                    <div style={{ display: "flex", gap: 16, fontSize: 14, color: "#6b7280" }}>
                      {paper.publishedAt && <span>Published: {new Date(paper.publishedAt).toLocaleDateString()}</span>}
                      {paper.citations != null && <span>{paper.citations} citations</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {activeTab === "announcements" && (
            <div>
              {webinars.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 15 }}>No announcements found for this user.</p>
              ) : (
                webinars.map((webinar: any, idx: number) => (
                  <div
                    key={webinar._id || webinar.id || idx}
                    style={{
                      background: idx % 2 === 0 ? "#fef3c7" : "#d1fae5",
                      borderRadius: 16,
                      padding: 24,
                      marginBottom: 16,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.12)";
                      e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
                      {webinar.title || "Untitled"}
                    </h2>
                    <p style={{ color: "#374151", marginBottom: 8 }}>{webinar.description || ""}</p>
                    {webinar.scheduledAt && (
                      <span style={{ background: "#fde68a", color: "#92400e", borderRadius: 8, padding: "4px 12px", fontWeight: "bold" }}>
                        {new Date(webinar.scheduledAt) > new Date() ? "Upcoming" : "Past Event"}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
