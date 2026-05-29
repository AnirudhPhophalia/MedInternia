import Link from "next/link";

const CaseOfDayBanner = () => {
  return (
    <Link
      href="/case-of-the-day"
      aria-label="Case of the Day — Join Live Discussion"
      style={{
        marginBottom: "18px",
        padding: "16px 20px",
        background: "linear-gradient(90deg, #0ea5e9, #38bdf8)",
        borderRadius: "16px",
        color: "white",
        fontWeight: 600,
        fontSize: "16px",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        transition: "0.3s ease",
        textDecoration: "none",
      }}
    >
      🔬 Case of the Day — Join Live Discussion →
    </Link>
  );
};

export default CaseOfDayBanner;