import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "StockFlow - 재고 관리",
  description: "의류 브랜드 재고 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full bg-[#f8f9fb]">
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 min-h-screen lg:min-h-0 overflow-auto pt-14 lg:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
