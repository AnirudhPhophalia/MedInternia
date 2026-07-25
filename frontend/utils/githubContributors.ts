export interface GithubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

const GITHUB_REPO = "AnirudhPhophalia/MedInternia";

/**
 * Fetches the top contributors for the repo from the public GitHub API.
 * No auth token is needed for this endpoint (60 req/hr per IP unauthenticated,
 * which is fine since this is only called once per page load per visitor).
 */
export async function fetchTopContributors(limit = 3): Promise<GithubContributor[]> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=${limit + 2}`,
    { headers: { Accept: "application/vnd.github+json" } }
  );

  if (!res.ok) {
    throw new Error(`GitHub API responded with ${res.status}`);
  }

  const data: (GithubContributor & { type?: string })[] = await res.json();

  // Exclude bots (e.g. github-actions[bot]) so real humans fill the top ranks
  return data.filter((c) => c.type !== "Bot").slice(0, limit);
}