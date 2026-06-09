import { Request, Response } from 'express';

export const WhatsAppController = {
  // GET /api/whatsapp/status
  getStatus(req: Request, res: Response) {
    return res.json({
      status: 'migrating',
      message: 'Migrating to Official Meta Cloud API'
    });
  },

  // GET /api/whatsapp/qr
  getQr(req: Request, res: Response) {
    return res.status(404).json({ error: 'QR codes are not used in Cloud API.' });
  },

  // POST /api/whatsapp/restart
  async restart(req: Request, res: Response) {
    return res.json({ success: true, message: 'Restart not applicable.' });
  },

  // GET /api/whatsapp/backups
  async listBackups(req: Request, res: Response) {
    return res.json([]);
  },

  // POST /api/whatsapp/rollback
  async rollbackBackup(req: Request, res: Response) {
    return res.status(400).json({ error: 'Rollbacks not applicable in Cloud API.' });
  }
};
