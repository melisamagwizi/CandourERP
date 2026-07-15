import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Candour ERP",
  description: "The light, all-in-one platform that runs an entrepreneur's business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={inter.className} style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
