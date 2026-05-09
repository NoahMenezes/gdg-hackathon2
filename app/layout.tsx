import type { Metadata } from "next";
import { Inter, Orbitron } from 'next/font/google'
import "./globals.css";
import { ThemeProvider } from "@/components/providers"
import { TelemetryProvider } from "@/components/TelemetryProvider"

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })

export const metadata: Metadata = {
  title: "FieldTheory | Tactical Graph Intelligence",
  description: "Advanced topological sports analytics and real-time team connectivity mapping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${orbitron.variable}`}>
      <body className="min-h-screen bg-[#0b0f1a] text-white transition-colors duration-300 font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TelemetryProvider>
            {children}
          </TelemetryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
