import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  PORT: number;
  DATABASE_PATH: string;
  WHATSAPP_SESSION_PATH: string;
  JWT_SECRET: string;
  GEMINI_API_KEY: string | null;
  NODE_ENV: string;
}

function validateAndLoadConfig(): Config {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const port = Number(process.env.PORT || 3000);
  if (isNaN(port) || port <= 0 || port > 65535) {
    console.error(`❌ Critical Config Error: Invalid PORT specified: ${process.env.PORT}`);
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET || 'trinetra_secret_super_secure_123!';
  if (nodeEnv === 'production' && jwtSecret === 'trinetra_secret_super_secure_123!') {
    console.warn('⚠️ Security Warning: Running in production with default JWT_SECRET. Override in .env!');
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY') {
    console.warn('⚠️ AI Warning: GEMINI_API_KEY is not configured or using default template value. Qualification will mock responses.');
  }

  return {
    PORT: port,
    DATABASE_PATH: process.env.DATABASE_PATH || './data/trinetra.db',
    WHATSAPP_SESSION_PATH: process.env.WHATSAPP_SESSION_PATH || './data/wa-session',
    JWT_SECRET: jwtSecret,
    GEMINI_API_KEY: geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY' ? geminiKey : null,
    NODE_ENV: nodeEnv
  };
}

export const envConfig = validateAndLoadConfig();
