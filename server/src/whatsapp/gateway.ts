// Mock WhatsApp Gateway for Meta Cloud API Migration
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  console.log(`[MOCK WHATSAPP] Would send to ${phone}: ${text}`);
  // FIXME: Implement official Meta Cloud API outbound messaging
  return false;
}

export function getWhatsAppStatus() {
  return {
    status: 'migrating',
    message: 'Migrating to Official Meta Cloud API'
  };
}

export async function restartWhatsApp() {
  console.log('[MOCK WHATSAPP] Restart called');
}

export function listSessionBackups() {
  return [];
}

export async function restoreSessionBackup(name: string) {
  console.log(`[MOCK WHATSAPP] Restore called for ${name}`);
  return false;
}

export async function initWhatsApp() {
  console.log('[MOCK WHATSAPP] Init called - System is migrating to Cloud API');
}

export async function handleInboundMessage(msg: any) {
  console.log('[MOCK WHATSAPP] handleInboundMessage called');
}
