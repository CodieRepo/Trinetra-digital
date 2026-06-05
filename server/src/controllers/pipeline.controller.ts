import { Request, Response } from 'express';
import { PipelineService, PipelineStage, PIPELINE_STAGES } from '../services/pipeline.service';
import { AuthenticatedRequest } from '../middleware/auth';

export const PipelineController = {

  // GET /api/leads/pipeline
  async getPipeline(req: Request, res: Response) {
    try {
      const groups = await PipelineService.getPipelineData();
      return res.json(groups);
    } catch (error: any) {
      console.error('❌ [PIPELINE_CTRL] getPipeline failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to load pipeline data' });
    }
  },

  // GET /api/leads/pipeline/forecast?period=month|quarter|year
  async getForecast(req: Request, res: Response) {
    const period = (req.query.period as string) || 'month';
    if (!['month', 'quarter', 'year'].includes(period)) {
      return res.status(400).json({ error: 'period must be month, quarter, or year' });
    }
    try {
      const forecast = await PipelineService.getForecastData(period as 'month' | 'quarter' | 'year');
      return res.json(forecast);
    } catch (error: any) {
      console.error('❌ [PIPELINE_CTRL] getForecast failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to compute forecast data' });
    }
  },

  // PATCH /api/leads/:id/stage
  async moveStage(req: Request, res: Response) {
    const { id } = req.params;
    const { stage, reason } = req.body;
    const authReq = req as AuthenticatedRequest;
    const changedBy = (authReq.user as any)?.username || 'admin';

    if (!stage || !PIPELINE_STAGES.includes(stage as PipelineStage)) {
      return res.status(400).json({
        error: `stage must be one of: ${PIPELINE_STAGES.join(', ')}`
      });
    }

    try {
      await PipelineService.moveStage(id, stage as PipelineStage, changedBy, reason);
      // Sync deal values after stage move (in case we need to refresh probabilities)
      await PipelineService.syncDealValues(id);
      return res.json({ success: true, message: `Lead moved to ${stage}` });
    } catch (error: any) {
      console.error('❌ [PIPELINE_CTRL] moveStage failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to move stage' });
    }
  },

  // PATCH /api/leads/:id/probability
  async updateProbability(req: Request, res: Response) {
    const { id } = req.params;
    const { probability } = req.body;
    const authReq = req as AuthenticatedRequest;
    const changedBy = (authReq.user as any)?.username || 'admin';

    if (probability === undefined || isNaN(Number(probability))) {
      return res.status(400).json({ error: 'probability (0–100) is required' });
    }

    try {
      await PipelineService.updateProbability(id, Number(probability), changedBy);
      return res.json({ success: true, message: `Probability updated to ${probability}%` });
    } catch (error: any) {
      console.error('❌ [PIPELINE_CTRL] updateProbability failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to update probability' });
    }
  },

  // PATCH /api/leads/:id/deal-values
  async updateDealValues(req: Request, res: Response) {
    const { id } = req.params;
    const { setup_value, mrr } = req.body;

    if (setup_value === undefined && mrr === undefined) {
      return res.status(400).json({ error: 'setup_value or mrr is required' });
    }

    try {
      // Read current values to merge with partial updates
      const { getDb } = await import('../database/connection');
      const db = getDb();
      const lead = await db.get<{ deal_setup_value: number; deal_mrr: number }>(
        'SELECT deal_setup_value, deal_mrr FROM leads WHERE id = ?', [id]
      );
      if (!lead) return res.status(404).json({ error: 'Lead not found' });

      const newSetup = setup_value !== undefined ? Number(setup_value) : (lead.deal_setup_value || 0);
      const newMrr = mrr !== undefined ? Number(mrr) : (lead.deal_mrr || 0);

      await PipelineService.updateDealValues(id, newSetup, newMrr);
      const annual = newSetup + newMrr * 12;
      return res.json({
        success: true,
        deal_setup_value: newSetup,
        deal_mrr: newMrr,
        deal_annual_value: annual,
        message: `Deal values updated — Annual: ₹${annual.toLocaleString('en-IN')}`
      });
    } catch (error: any) {
      console.error('❌ [PIPELINE_CTRL] updateDealValues failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to update deal values' });
    }
  },

  // GET /api/leads/:id/pipeline-audit
  async getAuditTrail(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const audit = await PipelineService.getAuditTrail(id);
      return res.json(audit);
    } catch (error: any) {
      console.error('❌ [PIPELINE_CTRL] getAuditTrail failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch audit trail' });
    }
  },

  // POST /api/leads/:id/sync-deal-values
  async syncDealValues(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await PipelineService.syncDealValues(id);
      return res.json({ success: true, message: 'Deal values synced from latest quotation' });
    } catch (error: any) {
      console.error('❌ [PIPELINE_CTRL] syncDealValues failed:', error);
      return res.status(500).json({ error: error.message || 'Failed to sync deal values' });
    }
  },
};
