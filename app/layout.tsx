import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "书名 情绪银河",
  description: "把小说的每一句话变成一颗可探索的 3D 情绪星星。"
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
