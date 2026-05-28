import ServicePageTemplate from "../services/_ServiceTemplate";

export default function Coaching() {
  return (
    <ServicePageTemplate
      title="Coaching & Education Automation"
      metaTitle="Lead Automation for Coaching Institutes India — WhatsApp Admission System | Trinetra Digital"
      metaDescription="Automate student inquiries, admission follow-ups, and course information distribution for coaching institutes via WhatsApp. Trinetra's AI handles high inbound volume automatically."
      canonical="https://trinetradigitalsolution.com/industries/coaching"
      eyebrow="Coaching & Education"
      headline="Handle hundreds of student inquiries automatically — without a bigger admission team"
      subheadline="Coaching institutes get flooded with WhatsApp messages during admission season. Trinetra's AI handles every inquiry, shares course details, qualifies serious applicants, and schedules counselling calls — without any manual effort."
      features={[
        "Instant response to course and admission inquiries 24/7",
        "Automated syllabus, fee structure, and brochure dispatch",
        "Student qualification: grade, subject preference, target exam",
        "Demo class scheduling and confirmation via WhatsApp",
        "Admission deadline reminders and urgency sequences",
        "Batch allocation notifications to enrolled students",
        "Parent communication automation for ongoing updates",
        "Integration with your existing student management system",
      ]}
      howItWorks={[
        { step: "01", title: "Student Inquires on WhatsApp", desc: "AI responds instantly with course overview and asks key qualification questions." },
        { step: "02", title: "Course Details Auto-Shared", desc: "Syllabus, fee structure, and demo class schedule sent automatically based on the student's interest." },
        { step: "03", title: "Counselling Call Booked", desc: "Serious applicants are offered a slot with your counsellor. Enrolled students receive automated onboarding messages." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Coaching & Education WhatsApp Automation",
        "description": "AI WhatsApp automation for coaching institutes in India. Handles student inquiries, admission follow-ups, and information dispatch automatically.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/industries/coaching",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "Smart Follow-Up", href: "/services/smart-followup" },
        { label: "AI CRM", href: "/services/ai-crm" },
      ]}
    />
  );
}
