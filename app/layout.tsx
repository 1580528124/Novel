import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NORMA · 卡塞尔全息终端",
  description: "连接诺玛，进入卡塞尔学院的全息档案终端。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
