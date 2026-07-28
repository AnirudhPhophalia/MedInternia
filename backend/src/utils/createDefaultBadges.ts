import Badge from "../models/Badge";

export const createDefaultBadges = async () => {
  try {
    // Check if badges already exist
    const existingBadges = await Badge.countDocuments();
    if (existingBadges > 0) {
      console.log("Default badges already exist");
      return;
    }

    const defaultBadges = [
      // Participation Badges
      {
        name: "First Steps",
        description: "Awarded for first case analysis",
        icon: "🌟",
        category: "participation",
        criteria: {
          type: "cases_analyzed",
          threshold: 1,
          description: "Analyze your first case",
        },
        color: "#3B82F6",
      },
      {
        name: "Active Learner",
        description: "Awarded for analyzing 10 cases",
        icon: "📚",
        category: "participation",
        criteria: {
          type: "cases_analyzed",
          threshold: 10,
          description: "Analyze 10 different cases",
        },
        color: "#10B981",
      },
      {
        name: "Case Expert",
        description: "Awarded for analyzing 50 cases",
        icon: "🎓",
        category: "participation",
        criteria: {
          type: "cases_analyzed",
          threshold: 50,
          description: "Analyze 50 different cases",
        },
        color: "#8B5CF6",
      },

      // Quality Badges
      {
        name: "Well Received",
        description: "Awarded for receiving 10 upvotes",
        icon: "👍",
        category: "quality",
        criteria: {
          type: "upvotes_received",
          threshold: 10,
          description: "Receive 10 upvotes on your analyses",
        },
        color: "#F59E0B",
      },
      {
        name: "Highly Rated",
        description: "Awarded for receiving 50 upvotes",
        icon: "⭐",
        category: "quality",
        criteria: {
          type: "upvotes_received",
          threshold: 50,
          description: "Receive 50 upvotes on your analyses",
        },
        color: "#EF4444",
      },
      {
        name: "Community Favorite",
        description: "Awarded for receiving 100 upvotes",
        icon: "🏆",
        category: "quality",
        criteria: {
          type: "upvotes_received",
          threshold: 100,
          description: "Receive 100 upvotes on your analyses",
        },
        color: "#DC2626",
      },

      // Achievement Badges
      {
        name: "Point Collector",
        description: "Awarded for earning 100 points",
        icon: "💎",
        category: "achievement",
        criteria: {
          type: "points",
          threshold: 100,
          description: "Earn 100 platform points",
        },
        color: "#06B6D4",
      },
      {
        name: "Rising Star",
        description: "Awarded for earning 500 points",
        icon: "🚀",
        category: "achievement",
        criteria: {
          type: "points",
          threshold: 500,
          description: "Earn 500 platform points",
        },
        color: "#8B5CF6",
      },
      {
        name: "Medical Scholar",
        description: "Awarded for earning 1000 points",
        icon: "🎖️",
        category: "achievement",
        criteria: {
          type: "points",
          threshold: 1000,
          description: "Earn 1000 platform points",
        },
        color: "#F59E0B",
      },

      // Streak Badges
      {
        name: "Dedicated Learner",
        description: "Awarded for 7-day learning streak",
        icon: "🔥",
        category: "achievement",
        criteria: {
          type: "streak",
          threshold: 7,
          description: "Maintain a 7-day learning streak",
        },
        color: "#EF4444",
      },
      {
        name: "Consistency Champion",
        description: "Awarded for 30-day learning streak",
        icon: "⚡",
        category: "achievement",
        criteria: {
          type: "streak",
          threshold: 30,
          description: "Maintain a 30-day learning streak",
        },
        color: "#F59E0B",
      },

      // Special Badges
      {
        name: "Early Adopter",
        description: "Awarded to early platform users",
        icon: "🌱",
        category: "special",
        criteria: {
          type: "special_achievement",
          description: "Join the platform in its early stages",
        },
        color: "#10B981",
      },
      {
        name: "Mentor",
        description: "Awarded for helping other interns",
        icon: "🤝",
        category: "special",
        criteria: {
          type: "special_achievement",
          description: "Actively mentor other interns",
        },
        color: "#6366F1",
      },
      {
        name: "Innovation Award",
        description: "Awarded for innovative case analysis",
        icon: "💡",
        category: "special",
        criteria: {
          type: "special_achievement",
          description: "Provide innovative insights in case analysis",
        },
        color: "#EC4899",
      },
    ];

    await Badge.insertMany(defaultBadges);
    console.log("Default badges created successfully");
  } catch (error) {
    console.error("Error creating default badges:", error);
  }
};
