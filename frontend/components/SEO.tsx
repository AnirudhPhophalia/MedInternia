import Head from "next/head";

type SEOProps = {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: "website" | "article";
};

const SITE_NAME = "MedInternia";
const DEFAULT_TITLE = "MedInternia";
const DEFAULT_DESCRIPTION =
  "MedInternia connects medical students, interns, doctors, and healthcare professionals through clinical cases, jobs, webinars, and collaborative learning.";
const DEFAULT_IMAGE = "/icon-512x512.png";

const getBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return configuredUrl?.replace(/\/$/, "") || "https://medinternia.vercel.app";
};

const toAbsoluteUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${getBaseUrl()}${normalizedPath}`;
};

export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  path = "/",
  type = "website",
}: SEOProps) {
  const fullTitle =
    title === SITE_NAME || title.endsWith(`| ${SITE_NAME}`)
      ? title
      : `${title} | ${SITE_NAME}`;
  const canonicalUrl = toAbsoluteUrl(path);
  const imageUrl = toAbsoluteUrl(image);

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
}
