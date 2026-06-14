import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Monitor — New Home Deals",
  description: "Multi-city new home monitor for Tracy, Mountain House, Dublin, and Roseville CA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#09090f] text-[#f0eeea] antialiased">
        {children}
      </body>
    </html>
  );
}
