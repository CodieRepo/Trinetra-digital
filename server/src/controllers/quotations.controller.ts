import { Request, Response } from 'express';
import { QuotationService } from '../services/quotation.service';
import path from 'path';
import fs from 'fs';

export const QuotationsController = {

  // GET /api/quotations
  async getQuotations(req: Request, res: Response) {
    try {
      const { lead_id } = req.query;
      let quotations;
      if (lead_id) {
        quotations = await QuotationService.findByLead(String(lead_id));
      } else {
        quotations = await QuotationService.list();
      }
      // Augment with expiry info
      const enriched = quotations.map(q => ({
        ...q,
        expiry: QuotationService.computeExpiryInfo(q),
      }));
      return res.json(enriched);
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Get failed:', error);
      return res.status(500).json({ error: error.message || 'Internal server error fetching quotations' });
    }
  },

  // GET /api/quotations/:id
  async getQuotationById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const quotation = await QuotationService.findById(id);
      if (!quotation) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      return res.json({
        ...quotation,
        expiry: QuotationService.computeExpiryInfo(quotation),
      });
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Get by ID failed:', error);
      return res.status(500).json({ error: error.message || 'Internal server error fetching quotation' });
    }
  },

  // GET /api/quotations/:id/versions — returns full revision chain
  async getVersionChain(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const chain = await QuotationService.findVersionChain(id);
      return res.json(chain.map(q => ({
        ...q,
        expiry: QuotationService.computeExpiryInfo(q),
      })));
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Version chain failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch version chain' });
    }
  },

  // POST /api/quotations
  async createQuotation(req: Request, res: Response) {
    const { lead_id, package_tier, custom_items, discount_pct = 0, notes } = req.body;

    if (!lead_id || !package_tier) {
      return res.status(400).json({ error: 'lead_id and package_tier are required' });
    }

    try {
      const quotation = await QuotationService.generateQuote(
        lead_id,
        package_tier,
        custom_items,
        Number(discount_pct),
        notes
      );
      return res.status(201).json({
        ...quotation,
        expiry: QuotationService.computeExpiryInfo(quotation),
      });
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Creation failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate quotation' });
    }
  },

  // POST /api/quotations/:id/revise — creates a new version of an existing quotation
  async reviseQuotation(req: Request, res: Response) {
    const { id } = req.params;
    const { discount_pct, custom_items, notes } = req.body;

    try {
      const revision = await QuotationService.createRevision(
        id,
        discount_pct !== undefined ? Number(discount_pct) : undefined,
        custom_items,
        notes
      );
      return res.status(201).json({
        ...revision,
        expiry: QuotationService.computeExpiryInfo(revision),
        message: `Quote v${revision.version} created as revision of ${id}`,
      });
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Revision failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to create quotation revision' });
    }
  },

  // POST /api/quotations/:id/send
  async sendQuotation(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const hostUrl = `${protocol}://${host}`;

      const sent = await QuotationService.sendViaWhatsApp(id, hostUrl);
      if (sent) {
        return res.json({ success: true, message: 'Proposal delivered via WhatsApp' });
      } else {
        return res.status(502).json({ error: 'WhatsApp delivery failed. Gateway offline.' });
      }
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Send failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to dispatch quotation' });
    }
  },

  // POST /api/quotations/:id/accept
  async acceptQuotation(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await QuotationService.markAccepted(id);
      return res.json({ success: true, message: 'Proposal accepted — lead updated to WON and 3 onboarding tasks created!' });
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Accept failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to accept quotation' });
    }
  },

  // POST /api/quotations/:id/reject
  async rejectQuotation(req: Request, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;
    try {
      await QuotationService.markRejected(id, reason);
      return res.json({ success: true, message: 'Proposal marked as rejected' });
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Reject failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to reject quotation' });
    }
  },

  // GET /api/quotations/:id/pdf
  async downloadPdf(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const quotation = await QuotationService.findById(id);
      if (!quotation || !quotation.pdf_path) {
        return res.status(404).json({ error: 'Proposal PDF not generated or not found' });
      }

      const absolutePath = path.resolve(process.cwd(), quotation.pdf_path);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ error: 'Proposal PDF file does not exist on disk' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Proposal-${id}-v${quotation.version || 1}.pdf`);
      return fs.createReadStream(absolutePath).pipe(res);
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] PDF download failed:', error);
      return res.status(500).json({ error: error.message || 'Error streaming proposal PDF' });
    }
  },

  // GET /api/quotations/public/:id/view — unprotected, tracks "viewed" status
  async publicTrackAndView(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const quotation = await QuotationService.findById(id);
      if (!quotation) {
        return res.status(404).send('Proposal link invalid or expired.');
      }

      if (quotation.status === 'expired') {
        return res.status(410).send('This proposal has expired. Please contact Trinetra Digital Solution for an updated quotation.');
      }

      await QuotationService.markViewed(id);

      const absolutePath = path.resolve(process.cwd(), quotation.pdf_path || '');
      if (!quotation.pdf_path || !fs.existsSync(absolutePath)) {
        await QuotationService.buildPdf(id);
      }

      // Re-fetch to get updated pdf_path if PDF was just rebuilt
      const refreshed = await QuotationService.findById(id);
      const finalPath = path.resolve(process.cwd(), refreshed?.pdf_path || '');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=Proposal-${id}-v${quotation.version || 1}.pdf`);
      return fs.createReadStream(finalPath).pipe(res);
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Public view tracker failed:', error);
      return res.status(500).send('Error viewing proposal.');
    }
  },

  // GET /api/quotations/conversion-stats
  async getStats(req: Request, res: Response) {
    try {
      const stats = await QuotationService.getConversionStats();
      return res.json(stats);
    } catch (error: any) {
      console.error('❌ [QUOTATIONS_CTRL] Stats failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch conversion metrics' });
    }
  }
};
