import type { Metadata } from "next";
import { TabProvider } from "@/contexts/TabContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Monitor — New Home Deals",
  description: "Multi-city new home monitor for Tracy, Mountain House, Dublin, and Roseville CA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-white text-slate-900 dark:bg-[#09090f] dark:text-[#f0eeea] antialiased">
        <TabProvider>
          {children}
        </TabProvider>
      </body>
    </html>
  );
}
