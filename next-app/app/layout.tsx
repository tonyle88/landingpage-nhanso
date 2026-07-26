import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://nhanso.clowcat.com.vn",
  ),
  title: "Nhân Số Học Khai Phá Tiềm Năng | Clow Cat Patronus",
  description:
    "Khám phá bản thân qua Nhân Số Học. Hơn 3 năm kinh nghiệm, 800+ ca tư vấn. Hiểu mình hơn – Sống đúng hướng hơn. Đặt lịch tư vấn ngay!",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/assets/images/logo2.png",
    apple: "/assets/images/logo2.png",
  },
  openGraph: {
    title: "Nhân Số Học Khai Phá Tiềm Năng | Clow Cat Patronus",
    description:
      "Tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh và hành trình phát triển của chính mình.",
    images: ["/assets/images/hero_bg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
