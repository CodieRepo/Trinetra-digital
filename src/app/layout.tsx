import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '../index.css';
import { ThemeProvider } from '@/modules/core/components/theme-provider';
import { AuthProvider } from '@/modules/core/components/auth-provider';
import { Toaster } from '@/modules/core/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'Trinetra OS — Business Operating System',
  description: 'Enterprise modular Business Operating System powered by Next.js 14 and Supabase',
  icons: { icon: '/favicon.ico' }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
