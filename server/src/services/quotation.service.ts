import { getDb, logAuditAction } from '../database/connection';
import { COMPANY, PACKAGES, PAYMENT_POLICY } from '../config/knowledge-base';
import { sendWhatsAppMessage } from './wa.service';
import { logTimelineEvent } from './timeline.service';
import { TaskModel } from '../models/tasks.model';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

// ─── DTO ──────────────────────────────────────────────────────────────────────

export interface QuotationDTO {
  id: string;
  lead_id: string;
  package_tier: 'starter_presence' | 'growth_engine' | 'sales_system' | 'business_os' | 'custom';
  package_name: string;
  line_items: string; // JSON string of { description: string; price: number }[]
  setup_cost: number;
  monthly_cost: number;
  discount_pct: number;
  total_setup: number;
  total_monthly: number;
  currency: string;
  validity_days: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  version: number;
  parent_quotation_id?: string | null;
  expiry_task_created: number; // 0 | 1
  sent_at?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  expired_at?: string | null;
  notes?: string | null;
  pdf_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function computeExpiryDate(quotation: QuotationDTO): Date {
  const created = new Date(quotation.created_at || Date.now());
  return new Date(created.getTime() + (quotation.validity_days || 7) * 24 * 60 * 60 * 1000);
}

function isExpired(quotation: QuotationDTO): boolean {
  return computeExpiryDate(quotation) <= new Date();
}

function daysUntilExpiry(quotation: QuotationDTO): number {
  const ms = computeExpiryDate(quotation).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const QuotationService = {

  // ── Read ────────────────────────────────────────────────────────────────────

  async list(): Promise<QuotationDTO[]> {
    const db = getDb();
    return db.all<QuotationDTO[]>('SELECT * FROM quotations ORDER BY created_at DESC');
  },

  async findById(id: string): Promise<QuotationDTO | undefined> {
    const db = getDb();
    return db.get<QuotationDTO>('SELECT * FROM quotations WHERE id = ?', [id]);
  },

  async findByLead(leadId: string): Promise<QuotationDTO[]> {
    const db = getDb();
    return db.all<QuotationDTO[]>(
      'SELECT * FROM quotations WHERE lead_id = ? ORDER BY version ASC, created_at DESC',
      [leadId]
    );
  },

  /** Return the full revision chain for a specific quotation (all versions sharing same root). */
  async findVersionChain(quotationId: string): Promise<QuotationDTO[]> {
    const db = getDb();
    // Walk up to find root ancestor
    let current = await this.findById(quotationId);
    if (!current) return [];

    let rootId = quotationId;
    while (current?.parent_quotation_id) {
      rootId = current.parent_quotation_id;
      current = await this.findById(rootId);
    }

    // Fetch all quotations that share this root (the root itself plus all revisions)
    const allQuotations = await db.all<QuotationDTO[]>(
      'SELECT * FROM quotations ORDER BY version ASC, created_at ASC'
    );

    // Filter to chain members
    const chain: QuotationDTO[] = [];
    const seen = new Set<string>();

    function collectChain(id: string) {
      if (seen.has(id)) return;
      seen.add(id);
      const q = allQuotations.find(x => x.id === id);
      if (q) {
        chain.push(q);
        // Find children that reference this id
        allQuotations
          .filter(x => x.parent_quotation_id === id)
          .forEach(child => collectChain(child.id));
      }
    }

    collectChain(rootId);
    return chain.sort((a, b) => a.version - b.version);
  },

  async getConversionStats(): Promise<any> {
    const db = getDb();
    const rows = await db.all<{ status: string; count: number; total_setup: number; total_monthly: number }[]>(
      `SELECT status, COUNT(*) as count, SUM(total_setup) as total_setup, SUM(total_monthly) as total_monthly 
       FROM quotations 
       GROUP BY status`
    );

    const stats = {
      draft: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      totalRevenue: 0,
      totalPipeline: 0,
    };

    rows.forEach(r => {
      if (r.status in stats) {
        (stats as any)[r.status] = r.count;
      }
      if (r.status === 'accepted') {
        stats.totalRevenue += (r.total_setup || 0) + (r.total_monthly || 0);
      }
      if (['sent', 'viewed'].includes(r.status)) {
        stats.totalPipeline += (r.total_setup || 0);
      }
    });

    return stats;
  },

  // ── Create / Version ────────────────────────────────────────────────────────

  /**
   * Generate a brand-new quotation (v1) for a lead.
   * If the lead already has an active quotation for the same package tier,
   * creates a new versioned revision automatically.
   */
  async generateQuote(
    leadId: string,
    tier: 'starter_presence' | 'growth_engine' | 'sales_system' | 'business_os' | 'custom',
    customItems?: { description: string; price: number }[],
    discountPct: number = 0,
    notes?: string,
    parentQuotationId?: string  // when explicitly creating a new version
  ): Promise<QuotationDTO> {
    const db = getDb();

    // 1. Fetch Lead
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    let packageName = '';
    let setupCost = 0;
    let monthlyCost = 0;
    let lineItemsList: { description: string; price: number }[] = [];

    // 2. Resolve package details
    if (tier === 'custom') {
      packageName = 'Custom Business Package';
      if (customItems && customItems.length > 0) {
        lineItemsList = customItems;
        setupCost = customItems
          .filter(i => i.description.toLowerCase().includes('setup') || i.description.toLowerCase().includes('one-time'))
          .reduce((sum, i) => sum + i.price, 0);
        monthlyCost = customItems
          .filter(i => i.description.toLowerCase().includes('month') || i.description.toLowerCase().includes('recurring'))
          .reduce((sum, i) => sum + i.price, 0);

        if (setupCost === 0 && monthlyCost === 0) {
          setupCost = customItems[0]?.price || 0;
          monthlyCost = customItems.slice(1).reduce((sum, i) => sum + i.price, 0);
        }
      }
    } else {
      let pkg: any;
      if (tier === 'starter_presence') pkg = PACKAGES.starter;
      else if (tier === 'growth_engine') pkg = PACKAGES.growth;
      else if (tier === 'sales_system') pkg = PACKAGES.sales_system;
      else if (tier === 'business_os') pkg = PACKAGES.business_os;

      if (!pkg) throw new Error(`Invalid package tier: ${tier}`);

      packageName = pkg.name;
      setupCost = pkg.setup_num;
      monthlyCost = pkg.monthly_num;
      lineItemsList = [
        { description: `${pkg.name} - Initial Setup Cost`, price: setupCost },
        { description: `${pkg.name} - Monthly Subscription`, price: monthlyCost }
      ];
    }

    // 3. Compute totals with discount
    const totalSetup = Math.round(setupCost * (1 - discountPct / 100));
    const totalMonthly = Math.round(monthlyCost * (1 - discountPct / 100));

    // 4. Determine version number
    let version = 1;
    let resolvedParentId: string | null = parentQuotationId || null;

    if (parentQuotationId) {
      // Explicitly creating a revision — inherit version from parent + 1
      const parent = await this.findById(parentQuotationId);
      if (parent) {
        version = (parent.version || 1) + 1;
      }
    } else {
      // Auto-check for existing non-expired, non-rejected quotations for this lead+tier
      const existing = await db.get<{ id: string; version: number }>(
        `SELECT id, version FROM quotations 
         WHERE lead_id = ? AND package_tier = ? AND status NOT IN ('rejected','expired')
         ORDER BY version DESC LIMIT 1`,
        [leadId, tier]
      );
      if (existing) {
        version = (existing.version || 1) + 1;
        resolvedParentId = existing.id;
      }
    }

    const id = genId();
    const lineItemsStr = JSON.stringify(lineItemsList);

    await db.run(
      `INSERT INTO quotations (id, lead_id, package_tier, package_name, line_items, setup_cost, monthly_cost, discount_pct, total_setup, total_monthly, notes, version, parent_quotation_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, leadId, tier, packageName, lineItemsStr, setupCost, monthlyCost, discountPct, totalSetup, totalMonthly, notes || null, version, resolvedParentId]
    );

    const versionLabel = version > 1 ? ` (v${version} revision)` : '';
    console.log(`📋 [QUOTATION] Generated quotation ${id} v${version} for Lead ${lead.name}`);
    await logTimelineEvent(leadId, 'ai_action',
      `Generated quotation proposal v${version} for ${packageName}${versionLabel} (Setup: ₹${totalSetup}, Monthly: ₹${totalMonthly})`);

    // 5. Build PDF
    await this.buildPdf(id);

    return (await this.findById(id))!;
  },

  // ── PDF Builder ─────────────────────────────────────────────────────────────

  async buildPdf(quotationId: string): Promise<string> {
    const db = getDb();
    const quotation = await this.findById(quotationId);
    if (!quotation) throw new Error(`Quotation with ID ${quotationId} not found`);

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [quotation.lead_id]);
    if (!lead) throw new Error(`Lead associated with quotation ${quotationId} not found`);

    const pdfDir = path.resolve(process.cwd(), 'data/pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfFilename = `proposal-${quotationId}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);

    const expiryDate = computeExpiryDate(quotation);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // ─── Branded Header ───
        doc.fillColor('#0f172a').fontSize(22).text('TRINETRA DIGITAL SOLUTION', { align: 'left' });
        doc.fontSize(10).fillColor('#64748b').text('Your Business Automation & Digital Growth Partner', { align: 'left' });
        doc.text(`Gorakhpur, Uttar Pradesh, India — 273001 | info@trinetradigitalsolution.com`, { align: 'left' });
        doc.moveDown(1.5);

        // Divider
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.moveDown(1.5);

        // ─── Proposal Metadata ───
        const metaY = doc.y;
        doc.fillColor('#0f172a').fontSize(14).text('PROPOSAL & QUOTATION', { align: 'left' });
        doc.fontSize(10).fillColor('#475569');
        doc.text(`Quotation ID: ${quotation.id}`);
        doc.text(`Version: v${quotation.version || 1}`);
        doc.text(`Date: ${new Date(quotation.created_at || Date.now()).toLocaleDateString('en-IN')}`);
        doc.text(`Valid Until: ${expiryDate.toLocaleDateString('en-IN')} (${quotation.validity_days} days)`);
        if (quotation.parent_quotation_id) {
          doc.fillColor('#7c3aed').text(`Revision of: ${quotation.parent_quotation_id}`);
          doc.fillColor('#475569');
        }

        // Client Details on the right
        doc.text(`Prepared For:`, 350, metaY, { align: 'left' });
        doc.fontSize(12).fillColor('#0f172a').text(lead.name, 350, metaY + 15, { align: 'left' });
        doc.fontSize(10).fillColor('#475569');
        if (lead.company) doc.text(lead.company, 350, metaY + 30, { align: 'left' });
        doc.text(`Phone: ${lead.phone}`, 350, metaY + 45, { align: 'left' });
        if (lead.email) doc.text(`Email: ${lead.email}`, 350, metaY + 60, { align: 'left' });

        doc.y = metaY + 100;
        doc.moveDown(2);

        // ─── Package Details ───
        doc.fillColor('#0f172a').fontSize(14).text(`Package Selected: ${quotation.package_name}`, { align: 'left' });
        doc.moveDown(0.5);

        let inclusions: string[] = [];
        if (quotation.package_tier === 'starter_presence') inclusions = PACKAGES.starter.includes;
        else if (quotation.package_tier === 'growth_engine') inclusions = PACKAGES.growth.includes;
        else if (quotation.package_tier === 'sales_system') inclusions = PACKAGES.sales_system.includes;
        else if (quotation.package_tier === 'business_os') inclusions = PACKAGES.business_os.includes;

        if (inclusions.length > 0) {
          doc.fontSize(10).fillColor('#475569');
          inclusions.forEach(inc => { doc.text(`• ${inc}`); });
          doc.moveDown(1.5);
        }

        // ─── Pricing Table ───
        doc.fillColor('#0f172a').fontSize(14).text('Pricing Breakdown', { align: 'left' });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#0f172a');
        doc.text('Description', 50, tableTop, { width: 300 });
        doc.text('Billing Type', 350, tableTop, { width: 100, align: 'right' });
        doc.text('Amount (INR)', 450, tableTop, { width: 100, align: 'right' });

        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.moveDown(0.5);

        // Setup item
        const setupY = doc.y;
        doc.fillColor('#475569');
        doc.text(`${quotation.package_name} - Implementation Setup Fee`, 50, setupY, { width: 300 });
        doc.text('One-Time', 350, setupY, { width: 100, align: 'right' });
        doc.text(`₹${quotation.setup_cost.toLocaleString('en-IN')}`, 450, setupY, { width: 100, align: 'right' });
        doc.moveDown(0.8);

        // Monthly item
        const monthlyY = doc.y;
        doc.text(`${quotation.package_name} - Monthly Operations & Support`, 50, monthlyY, { width: 300 });
        doc.text('Monthly', 350, monthlyY, { width: 100, align: 'right' });
        doc.text(`₹${quotation.monthly_cost.toLocaleString('en-IN')}/mo`, 450, monthlyY, { width: 100, align: 'right' });
        doc.moveDown(0.8);

        // Discount if any
        if (quotation.discount_pct > 0) {
          const discY = doc.y;
          doc.fillColor('#10b981');
          doc.text(`Discount (${quotation.discount_pct}%)`, 50, discY, { width: 300 });
          doc.text('Discount', 350, discY, { width: 100, align: 'right' });
          doc.text(`- ₹${Math.round((quotation.setup_cost + quotation.monthly_cost) * (quotation.discount_pct / 100)).toLocaleString('en-IN')}`, 450, discY, { width: 100, align: 'right' });
          doc.moveDown(0.8);
        }

        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.moveDown(0.8);

        // Totals
        const totalSetupY = doc.y;
        doc.fillColor('#0f172a').fontSize(11);
        doc.text('Total One-Time Setup:', 50, totalSetupY, { width: 300 });
        doc.text(`₹${quotation.total_setup.toLocaleString('en-IN')}`, 450, totalSetupY, { width: 100, align: 'right' });
        doc.moveDown(0.6);

        const totalMonthlyY = doc.y;
        doc.text('Total Monthly Recurring:', 50, totalMonthlyY, { width: 300 });
        doc.text(`₹${quotation.total_monthly.toLocaleString('en-IN')}/mo`, 450, totalMonthlyY, { width: 100, align: 'right' });
        doc.moveDown(2);

        // Notes section
        if (quotation.notes) {
          doc.fillColor('#0f172a').fontSize(12).text('Additional Customizations', { align: 'left' });
          doc.fontSize(10).fillColor('#475569').text(quotation.notes, { align: 'left' });
          doc.moveDown(1.5);
        }

        // ─── Payment Policies & Terms ───
        doc.fillColor('#0f172a').fontSize(12).text('Standard Terms & Policies', { align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#64748b');
        doc.text(`• Payment Policy: ${PAYMENT_POLICY.projects}`);
        doc.text(`• Subscriptions: ${PAYMENT_POLICY.retainers}`);
        doc.text(`• Ad Budgets: ${PAYMENT_POLICY.ad_budgets}`);
        doc.text('• Trinetra guarantees high-performance code and system execution but never promises external lead volume or rankings.');
        doc.moveDown(2);

        // ─── Sign-off ───
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
        doc.moveDown(1.5);

        const sigY = doc.y;
        doc.fillColor('#475569').fontSize(9).text('Authorized Signature', 50, sigY);
        doc.fillColor('#0f172a').fontSize(11).text('Trinetra Digital (Charulata Enterprises)', 50, sigY + 15);

        doc.fillColor('#475569').fontSize(9).text('Client Acceptance Signature', 350, sigY);
        doc.text('__________________________________', 350, sigY + 15);
        doc.text('Signature / Date', 350, sigY + 30);

        doc.end();

        stream.on('finish', async () => {
          const relativePath = `data/pdfs/${pdfFilename}`;
          await db.run('UPDATE quotations SET pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [relativePath, quotationId]);
          console.log(`📄 [QUOTATION] PDF v${quotation.version || 1} saved to ${relativePath}`);
          resolve(relativePath);
        });

        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  },

  // ── WhatsApp Delivery ────────────────────────────────────────────────────────

  async sendViaWhatsApp(quotationId: string, hostUrl: string): Promise<boolean> {
    const db = getDb();
    const quotation = await this.findById(quotationId);
    if (!quotation) throw new Error(`Quotation with ID ${quotationId} not found`);

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [quotation.lead_id]);
    if (!lead) throw new Error(`Lead not found for quotation ${quotationId}`);

    const trackingLink = `${hostUrl}/api/quotations/public/${quotationId}/view`;
    const versionNote = quotation.version > 1 ? ` *(Updated v${quotation.version})*` : '';

    const message = `Namaste ${lead.name} ji! 🙏

Aapke business requirements ke basis par humne *${quotation.package_name}* ka ek detailed proposal aur quotation ready kiya hai:${versionNote}

📊 *Proposal Summary:*
• Setup Fee: ₹${quotation.total_setup.toLocaleString('en-IN')} (One-time)
• Monthly Support: ₹${quotation.total_monthly.toLocaleString('en-IN')}/month

Aap is official PDF proposal link ko click karke details dekh sakte hain:
🔗 Link: ${trackingLink}

Isme details, features aur terms share kiye gaye hain. Aap directly is link se proposal accept kar sakte hain ya humein reply kar sakte hain.

⏰ *Offer Valid Until:* ${computeExpiryDate(quotation).toLocaleDateString('en-IN')}

Trinetra Digital Solution
Gorakhpur, UP`.trim();

    const sendResult = await sendWhatsAppMessage(lead.phone, message);
    if (sendResult) {
      await db.run(
        `UPDATE quotations 
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [quotationId]
      );
      await logTimelineEvent(quotation.lead_id, 'outbound',
        `Sent v${quotation.version || 1} proposal for ${quotation.package_name} via WhatsApp. Link: ${trackingLink}`);
      await logAuditAction('SEND_QUOTATION', `Quotation ${quotationId} v${quotation.version || 1} sent to lead ${lead.name}`);
      return true;
    }

    return false;
  },

  // ── Status Transitions ───────────────────────────────────────────────────────

  async markViewed(quotationId: string): Promise<void> {
    const db = getDb();
    const quotation = await this.findById(quotationId);
    if (!quotation) return;

    if (['draft', 'sent'].includes(quotation.status)) {
      await db.run(
        `UPDATE quotations 
         SET status = 'viewed', viewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [quotationId]
      );
      await logTimelineEvent(quotation.lead_id, 'ai_action',
        `Quotation v${quotation.version || 1} was viewed by the lead`);
    }
  },

  /**
   * Mark a quotation accepted.
   * Auto-creates THREE tasks: Onboarding, Implementation Kickoff, Requirements Collection.
   */
  async markAccepted(quotationId: string): Promise<void> {
    const db = getDb();
    const quotation = await this.findById(quotationId);
    if (!quotation) return;

    await db.run(
      `UPDATE quotations 
       SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [quotationId]
    );

    // Update lead stage to won
    await db.run(
      `UPDATE leads SET lead_stage = 'won', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [quotation.lead_id]
    );

    const lead = await db.get('SELECT name FROM leads WHERE id = ?', [quotation.lead_id]);
    const leadName = lead ? lead.name : 'Lead';

    await logTimelineEvent(quotation.lead_id, 'human_action',
      `Proposal v${quotation.version || 1} ACCEPTED for ${quotation.package_name}. Lead stage → WON! 🎉`);
    await logAuditAction('ACCEPT_QUOTATION',
      `Quotation ${quotationId} v${quotation.version || 1} accepted by lead ${leadName}`);

    // ── Auto-generate 3 onboarding tasks ──────────────────────────────────────

    const now = Date.now();

    // Task 1: Client Onboarding & Welcome (due 24h)
    await TaskModel.create({
      lead_id: quotation.lead_id,
      title: `Onboard ${leadName} — Welcome Pack & Account Setup`,
      description: `Quotation ${quotationId} accepted for ${quotation.package_name} (Setup: ₹${quotation.total_setup}, Monthly: ₹${quotation.total_monthly}). Send welcome email, WhatsApp greeting, and create client account.`,
      status: 'pending',
      type: 'FOLLOWUP_REMINDER',
      due_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    });

    // Task 2: Implementation Kickoff Call (due 48h)
    await TaskModel.create({
      lead_id: quotation.lead_id,
      title: `Kickoff Call with ${leadName} — ${quotation.package_name} Implementation`,
      description: `Schedule and conduct the implementation kickoff call. Walk the client through the delivery timeline, team responsibilities, and milestones. Package: ${quotation.package_name}.`,
      status: 'pending',
      type: 'APPOINTMENT_TASK',
      due_at: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
    });

    // Task 3: Requirements Collection (due 72h)
    await TaskModel.create({
      lead_id: quotation.lead_id,
      title: `Requirements Collection for ${leadName} — ${quotation.package_name}`,
      description: `Gather all technical and business requirements: brand assets, domain/hosting access, social media credentials, existing systems, and custom feature specifications.`,
      status: 'pending',
      type: 'QUOTATION_TASK',
      due_at: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
    });

    console.log(`✅ [QUOTATION] 3 auto-tasks created for ${leadName} after quotation acceptance.`);
  },

  async markRejected(quotationId: string, reason?: string): Promise<void> {
    const db = getDb();
    const quotation = await this.findById(quotationId);
    if (!quotation) return;

    await db.run(
      `UPDATE quotations 
       SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [quotationId]
    );

    await logTimelineEvent(quotation.lead_id, 'human_action',
      `Proposal v${quotation.version || 1} REJECTED for ${quotation.package_name}. Reason: ${reason || 'Not specified'}`);
    await logAuditAction('REJECT_QUOTATION',
      `Quotation ${quotationId} v${quotation.version || 1} rejected. Reason: ${reason || 'N/A'}`);
  },

  // ── Expiry Engine ────────────────────────────────────────────────────────────

  /**
   * Called by the cron service (every ~30 minutes).
   * 1. Marks quotations as 'expired' if past validity date.
   * 2. Creates a pre-expiry follow-up task when ≤3 days remain (once per quotation).
   */
  async processExpiry(): Promise<void> {
    const db = getDb();

    // Fetch all non-terminal quotations that are sent or viewed
    const active = await db.all<QuotationDTO[]>(
      `SELECT * FROM quotations 
       WHERE status IN ('draft','sent','viewed') 
       ORDER BY created_at ASC`
    );

    const now = new Date();

    for (const q of active) {
      const expiry = computeExpiryDate(q);
      const days = daysUntilExpiry(q);

      // ── Expire overdue quotations ─────────────────────────────────────────
      if (expiry <= now) {
        await db.run(
          `UPDATE quotations 
           SET status = 'expired', expired_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [q.id]
        );
        await logTimelineEvent(q.lead_id, 'ai_action',
          `Quotation v${q.version || 1} for ${q.package_name} has EXPIRED (was valid until ${expiry.toLocaleDateString('en-IN')})`);
        console.log(`⏰ [EXPIRY] Quotation ${q.id} marked expired.`);
        continue;
      }

      // ── Pre-expiry follow-up task (≤3 days, only once) ────────────────────
      if (days <= 3 && !q.expiry_task_created) {
        const lead = await db.get('SELECT name, phone FROM leads WHERE id = ?', [q.lead_id]);
        const leadName = lead?.name || 'Lead';

        await TaskModel.create({
          lead_id: q.lead_id,
          title: `⚠️ Quote Expiring Soon — Follow up with ${leadName}`,
          description: `Quotation ${q.id} v${q.version || 1} (${q.package_name}) expires in ${days} day(s) on ${expiry.toLocaleDateString('en-IN')}. Contact the lead to prompt acceptance or negotiate revision.`,
          status: 'pending',
          type: 'FOLLOWUP_REMINDER',
          due_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(), // due in 12 hours
        });

        await db.run(
          `UPDATE quotations SET expiry_task_created = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [q.id]
        );

        await logTimelineEvent(q.lead_id, 'ai_action',
          `Pre-expiry follow-up task created — Quote v${q.version || 1} expires in ${days} day(s)`);

        console.log(`⚠️ [EXPIRY] Pre-expiry task created for ${q.id} (expires in ${days} days).`);
      }
    }
  },

  // ── Revision Creator ─────────────────────────────────────────────────────────

  /**
   * Create a new version of an existing quotation.
   * The parent is NOT mutated — it remains as a historical record.
   */
  async createRevision(
    parentQuotationId: string,
    discountPct?: number,
    customItems?: { description: string; price: number }[],
    notes?: string
  ): Promise<QuotationDTO> {
    const parent = await this.findById(parentQuotationId);
    if (!parent) throw new Error(`Parent quotation ${parentQuotationId} not found`);

    return this.generateQuote(
      parent.lead_id,
      parent.package_tier,
      customItems,
      discountPct ?? parent.discount_pct,
      notes ?? parent.notes ?? undefined,
      parentQuotationId
    );
  },

  // ── Compute expiry info for a quotation (for API responses) ─────────────────

  computeExpiryInfo(quotation: QuotationDTO): { expiresAt: string; daysRemaining: number; isExpired: boolean } {
    const expiryDate = computeExpiryDate(quotation);
    const days = daysUntilExpiry(quotation);
    return {
      expiresAt: expiryDate.toISOString(),
      daysRemaining: Math.max(0, days),
      isExpired: isExpired(quotation),
    };
  },
};
