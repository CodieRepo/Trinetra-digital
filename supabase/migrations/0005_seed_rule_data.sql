-- Migration 0005: Seed Rule and Flow Engine Initial Data

DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Resolve first tenant or create a default one
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (name, status) VALUES ('Trinetra Digital Solution', 'active') RETURNING id INTO v_tenant_id;
    END IF;

    -- 2. Seed tenant_settings
    INSERT INTO tenant_settings (tenant_id, default_language, fallback_provider, feature_flags)
    VALUES (v_tenant_id, 'en', 'bhashsms', '{"ai_fallback": true, "automated_booking": true, "n8n_notifications": true}'::jsonb)
    ON CONFLICT (tenant_id) DO NOTHING;

    -- 3. Seed service_configs
    INSERT INTO service_configs (tenant_id, name, slug, description, features, pricing_reference, brochure_url, cta_button_text)
    VALUES 
        (v_tenant_id, 'AI Automation', 'ai-automation', 'Automate customer support, lead capturing and workflows with Gemini AI.', '["24/7 Auto-replies", "Intent Detection", "Workflow integrations"]'::jsonb, 'Starts from ₹29,999 setup', 'https://trinetradigitalsolution.com/brochures/ai-automation.pdf', 'Book AI Demo'),
        (v_tenant_id, 'WhatsApp CRM', 'whatsapp-crm', 'Official Meta WhatsApp Cloud API CRM for team live-chat and automation.', '["Multi-agent inbox", "Meta Flow Booking", "Broadcasting campaigns"]'::jsonb, 'Starts from ₹59,999 setup', 'https://trinetradigitalsolution.com/brochures/whatsapp-crm.pdf', 'Get Free Trial'),
        (v_tenant_id, 'Web Development', 'web-development', 'Premium, modern web design and dynamic web applications built with Next.js/React.', '["Custom layout design", "SEO optimized structure", "Interactive portals"]'::jsonb, 'Starts from ₹14,999 setup', 'https://trinetradigitalsolution.com/brochures/web-development.pdf', 'Get Quote'),
        (v_tenant_id, 'SEO & GBP Optimization', 'seo-gbp', 'Rank high on Google Search and local Google Business Profile maps.', '["Local business citation", "Keyword tracking", "Monthly performance report"]'::jsonb, 'Starts from ₹5,999/month', 'https://trinetradigitalsolution.com/brochures/seo-gbp.pdf', 'Free Audit')
    ON CONFLICT (tenant_id, slug) DO NOTHING;

    -- 4. Seed templates (conversational reply content)
    INSERT INTO templates (tenant_id, name, category, language, body, status)
    VALUES
        (v_tenant_id, 'welcome_msg', 'utility', 'en', 'Welcome to Trinetra Digital Solution! 🚀\n\nHow can we automate your business today? Select an option:\n1. Services Menu 🛠️\n2. Pricing Packages 💰\n3. Book Free Consultation 📅\n4. Ask a Question ❓\n\nReply with the option number or keyword (e.g. "Services", "Pricing").', 'approved'),
        (v_tenant_id, 'welcome_msg_hi', 'utility', 'hi', 'त्रिनेत्र डिजिटल सॉल्यूशन में आपका स्वागत है! 🚀\n\nआज हम आपके व्यवसाय को कैसे ऑटोमेट कर सकते हैं? कृपया एक विकल्प चुनें:\n1. हमारी सेवाएँ 🛠️\n2. मूल्य निर्धारण 💰\n3. निःशुल्क परामर्श बुक करें 📅\n4. कोई सवाल पूछें ❓\n\nविकल्प संख्या या कीवर्ड लिखकर उत्तर दें (जैसे "सेवा", "बुकिंग")।', 'approved'),
        (v_tenant_id, 'welcome_msg_hinglish', 'utility', 'en', 'Trinetra Digital Solution me aapka welcome hai! 🚀\n\nHum aapke business ko automate karne me help karenge. Ek option choose karein:\n1. Services Menu 🛠️\n2. Pricing & Packages 💰\n3. Free Consultation Book Karein 📅\n4. Kuch Pucho ❓\n\nReply karein option number ya keyword likh kar (e.g. "services", "pricing").', 'approved'),
        (v_tenant_id, 'pricing_msg', 'utility', 'en', 'Here are our official automation packages:\n\n1. Starter Presence: ₹14,999 setup + ₹2,999/mo (Landing page, local SEO).\n2. Growth Engine: ₹29,999 setup + ₹5,999/mo (WhatsApp lead capture, local SEO).\n3. Sales System: ₹59,999 setup + ₹9,999/mo (CRM Setup, Meta WhatsApp Automation, Booking tools).\n4. Business OS: ₹1,49,999+ setup + ₹19,999+/mo (Custom software, full automation).\n\nReply "Book" to schedule a detailed session.', 'approved'),
        (v_tenant_id, 'booking_start_msg', 'utility', 'en', 'Perfect! Let''s schedule your consultation. We will collect your details to set up the calendar invite.\n\nReply with your Name to begin.', 'approved'),
        (v_tenant_id, 'booking_confirm_msg', 'utility', 'en', 'Thank you, {{contact_name}}! Your consultation is scheduled for {{booking_date}} at {{booking_time}} (IST) for {{service_name}}.\n\nWe have created a Google Calendar event and sent a Meet link. Our team will contact you shortly on {{contact_phone}}.', 'approved'),
        (v_tenant_id, 'fallback_msg', 'utility', 'en', 'Thanks for reaching out! Let me check that for you...', 'approved')
    ON CONFLICT DO NOTHING;

    -- 5. Seed faqs
    INSERT INTO faqs (tenant_id, category, question, keywords, answer_template_name, language)
    VALUES
        (v_tenant_id, 'general', 'Who is Trinetra?', ARRAY['who', 'trinetra', 'company', 'about', 'introduction'], 'welcome_msg', 'en'),
        (v_tenant_id, 'pricing', 'What are your rates?', ARRAY['price', 'cost', 'rates', 'charges', 'packages', 'fees', 'daam', 'price list', 'pricing'], 'pricing_msg', 'en')
    ON CONFLICT DO NOTHING;
END $$;
