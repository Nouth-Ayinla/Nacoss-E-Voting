import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NACOSS FUTA Chapter E-Voting Portal",
  description: "Secure, anonymous e-voting for the NACOSS FUTA chapter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-charcoal-slate min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
