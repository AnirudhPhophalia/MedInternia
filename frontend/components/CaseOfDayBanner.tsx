import Link from 'next/link';
import { Microscope, ArrowRight } from 'lucide-react';

const CaseOfDayBanner = () => {
  return (
    <Link
      href="/case-of-the-day"
      aria-label="Case of the Day — Join Live Discussion"
      style={{
        marginBottom: '18px',
        padding: '16px 20px',
        background: 'linear-gradient(90deg, #0072ff, #00c6ff)',
        borderRadius: '16px',
        color: 'white',
        fontWeight: 600,
        fontSize: '16px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
        transition: '0.3s ease',
        textDecoration: 'none',
      }}
    >
      <Microscope size={20} aria-hidden />
      Case of the Day — Join Live Discussion
      <ArrowRight size={18} aria-hidden />
    </Link>
  );
};

export default CaseOfDayBanner;
