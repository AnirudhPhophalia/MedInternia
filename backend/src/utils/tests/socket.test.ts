import { sanitizeWebinarForSocket } from "../socket";

describe("sanitizeWebinarForSocket", () => {
  it("returns input if null or non-object", () => {
    expect(sanitizeWebinarForSocket(null)).toBeNull();
    expect(sanitizeWebinarForSocket(undefined)).toBeUndefined();
    expect(sanitizeWebinarForSocket(123)).toBe(123);
  });

  it("strips polls[].votes map and replaces with voteCounts and totalVotes", () => {
    const webinar = {
      _id: "webinar-1",
      title: "Test Webinar",
      meetingLink: "https://secret.meet/link",
      participants: [{ user: "user-1" }, { user: "user-2" }],
      polls: [
        {
          _id: "poll-1",
          question: "Which option?",
          options: ["Opt A", "Opt B", "Opt C"],
          active: true,
          votes: {
            "user-1": 0,
            "user-2": 1,
            "user-3": 0,
          },
        },
      ],
      __v: 0,
    };

    const sanitized = sanitizeWebinarForSocket(webinar);

    expect(sanitized._id).toBe("webinar-1");
    expect(sanitized.title).toBe("Test Webinar");
    expect(sanitized).not.toHaveProperty("meetingLink");
    expect(sanitized).not.toHaveProperty("participants");
    expect(sanitized).not.toHaveProperty("__v");
    expect(sanitized.participantCount).toBe(2);

    expect(sanitized.polls).toHaveLength(1);
    const poll = sanitized.polls[0];
    expect(poll).not.toHaveProperty("votes");
    expect(poll.voteCounts).toEqual([2, 1, 0]);
    expect(poll.totalVotes).toBe(3);
  });

  it("handles Mongoose Document objects with toObject and Map votes", () => {
    const votesMap = new Map<string, number>();
    votesMap.set("user-1", 1);
    votesMap.set("user-2", 1);

    const docMock = {
      _id: "webinar-2",
      title: "Doc Webinar",
      meetingLink: "https://secret.meet/link2",
      participants: [{ user: "u1" }],
      polls: [
        {
          _id: "poll-2",
          question: "Yes or No?",
          options: ["Yes", "No"],
          active: true,
          votes: votesMap,
        },
      ],
      toObject: function () {
        return {
          _id: this._id,
          title: this.title,
          meetingLink: this.meetingLink,
          participants: this.participants,
          polls: [
            {
              _id: "poll-2",
              question: "Yes or No?",
              options: ["Yes", "No"],
              active: true,
              votes: votesMap,
            },
          ],
        };
      },
    };

    const sanitized = sanitizeWebinarForSocket(docMock);
    expect(sanitized._id).toBe("webinar-2");
    expect(sanitized).not.toHaveProperty("meetingLink");
    expect(sanitized).not.toHaveProperty("participants");
    expect(sanitized.participantCount).toBe(1);
    expect(sanitized.polls[0]).not.toHaveProperty("votes");
    expect(sanitized.polls[0].voteCounts).toEqual([0, 2]);
    expect(sanitized.polls[0].totalVotes).toBe(2);
  });
});
