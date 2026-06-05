import { Request, Response } from 'express';
import { getWhatsAppStatus } from '../whatsapp/gateway';

export const WhatsAppController = {
  // GET /api/whatsapp/status
  getStatus(req: Request, res: Response) {
    const status = getWhatsAppStatus();
    return res.json(status);
  },

  // GET /api/whatsapp/qr
  getQr(req: Request, res: Response) {
    const status = getWhatsAppStatus();
    if (!status.qr) {
      return res.status(404).json({ error: 'WhatsApp pairing QR code is not currently active.' });
    }
    return res.json({
      qr: status.qr,
      qrImage: status.qrImage
    });
  },

  // POST /api/whatsapp/restart
  async restart(req: Request, res: Response) {
    try {
      const { restartWhatsApp } = await import('../whatsapp/gateway');
      await restartWhatsApp();
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // GET /api/whatsapp/backups
  async listBackups(req: Request, res: Response) {
    try {
      const { listSessionBackups } = await import('../whatsapp/gateway');
      const backups = listSessionBackups();
      return res.json(backups);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/whatsapp/rollback
  async rollbackBackup(req: Request, res: Response) {
    try {
      const { backupDirName } = req.body;
      if (!backupDirName) {
        return res.status(400).json({ error: 'backupDirName parameter is required.' });
      }
      const { restoreSessionBackup } = await import('../whatsapp/gateway');
      const success = await restoreSessionBackup(backupDirName);
      if (success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: 'Failed to restore session backup.' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};
