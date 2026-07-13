import { Accordion, AccordionDetails, AccordionSummary, Box, Container, Paper, Typography, IconButton } from "@mui/material";
import { ChevronDown,X } from "lucide-react";
import { useRouter } from "next/router";
const faqs = [
  {
    question: "What is MedInternia?",
    answer: "MedInternia is a comprehensive medical learning and collaboration platform designed for medical students, interns, doctors, and healthcare professionals. It provides access to clinical cases, educational webinars, internship opportunities, professional certificates, research papers, and peer collaboration tools to support continuous learning and career growth in the medical field.",
  },
  {
    question: "How do I apply for an internship?",
    answer: "To apply for an internship, navigate to the Jobs section from the main menu. Browse available internship opportunities, click on the position you're interested in, and fill out the application form with your educational background, qualifications, and personal information. Submit your application, and you'll receive confirmation. Our team will review your profile and contact you within 3-5 business days.",
  },
  {
    question: "Are the internships paid or unpaid?",
    answer: "MedInternia offers both paid and unpaid internship opportunities. Paid internships are typically for experienced medical professionals or advanced students, while unpaid internships are also available for students seeking valuable experience and skill development. Each internship listing clearly indicates the compensation structure. You can filter internships by compensation type in the Jobs section.",
  },
  {
    question: "Who is eligible to apply?",
    answer: "Internship eligibility varies by position. Generally, we accept applications from medical students (any year), medical graduates, interns, and healthcare professionals. Some positions may require specific qualifications, certifications, or minimum experience levels. Check the specific internship listing for detailed eligibility criteria. You'll need a valid email address and verified account on MedInternia to apply.",
  },
  {
    question: "Will I receive a certificate after completion?",
    answer: "Yes! After successfully completing an internship or course, you'll receive a certificate of completion signed by MedInternia. These certificates are recognized in the medical community and can be added to your professional profile. You can download and share your certificates from your dashboard. Certificates include details of your role, duration, and skills acquired.",
  },
  {
    question: "Can I apply for multiple internships?",
    answer: "Yes, you can apply for multiple internship positions simultaneously. However, you can only actively participate in one internship at a time. If you receive offers from multiple positions, you'll need to accept one and politely decline others. This ensures you can dedicate proper time and effort to your learning and professional development.",
  },
  {
    question: "How can I track my application status?",
    answer: "You can track all your applications from your Dashboard under the 'My Applications' section. Here, you'll see the status of each application (Applied, Under Review, Shortlisted, Accepted, or Rejected). You'll also receive email notifications whenever there's an update to your application status, so you're always informed about your progress.",
  },
  {
    question: "Is there any application fee?",
    answer: "No, there is absolutely no application fee to register on MedInternia or apply for internships and opportunities. All job applications, course access, and platform features are completely free. We believe in providing equal access to medical education and career opportunities for all healthcare professionals.",
  },
  {
    question: "How do I contact support?",
    answer: "You can reach our support team in several ways: 1) Use the Contact page from the main menu to submit your query. 2) Email us at medinternia@gmail.com with details about your concern. 3) Check out our FAQ section for quick answers. 4) Use the in-app chat support during business hours. Our team typically responds within 24 hours.",
  },
  {
    question: "Are remote internships available?",
    answer: "Yes, MedInternia offers numerous remote internship opportunities. Remote internships are clearly marked in the job listing with a 'Remote' tag. These positions allow you to work from anywhere, making it perfect for students or professionals with scheduling flexibility. You can filter internships by location in the Jobs section to find remote opportunities.",
  },
];

export default function FAQPage() {
  const router = useRouter(); 
  return (
    <Box sx={{ flex: 1, background: "linear-gradient(120deg, #e0eafc 0%, #f8f9fa 100%)", py: { xs: 6, md: 10 } }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 5,
            border: "1px solid rgba(33,147,176,0.12)",
            boxShadow: "0 12px 36px rgba(33,147,176,0.14)",
            position: "relative",
          }}
        >
         <IconButton
            onClick={() => router.back()} // 3. Use router.back() to go to the previous page
            aria-label="go back"
            sx={{
              position: "absolute",
              top: { xs: 16, md: 24 },
              right: { xs: 16, md: 24 },
              color: "text.secondary",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                 color: "#0072ff",
                backgroundColor: "rgba(0, 114, 255, 0.08)",
                transform: "scale(1.05)",
              },
            }}
          >
            <X size={22} />
          </IconButton>
          <Typography variant="h2" fontWeight={900} color="#0072ff" sx={{ fontSize: { xs: "2.3rem", md: "3.5rem" }, mb: 2 }}>
            FAQs
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
            Find quick answers about MedInternia, platform access, and support.
          </Typography>

          {faqs.map((faq) => (
            <Accordion key={faq.question} disableGutters elevation={0} sx={{ borderBottom: "1px solid #e2e8f0", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ChevronDown size={20} color="#0072ff" />}>
                <Typography fontWeight={800}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      </Container>
    </Box>
  );
}
