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
  }
};
