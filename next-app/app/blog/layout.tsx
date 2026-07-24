import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giải Mã Nhân Số Học | Clow Cat Patronus",
  description:
    "Bài viết giúp bạn khám phá bản thân, tính cách, điểm mạnh và hành trình phát triển qua nhân số học.",
  openGraph: {
    title: "Giải Mã Nhân Số Học | Clow Cat Patronus",
    description:
      "Khám phá bản thân và hành trình phát triển của chính mình qua nhân số học.",
    images: ["/assets/images/hero_bg.png"],
  },
};

export default function BlogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="preconnect" href="https://script.google.com" />
      <link rel="preconnect" href="https://script.googleusercontent.com" />
      <link rel="preconnect" href="https://drive.google.com" />
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      <link
        rel="stylesheet"
        href="/assets/vendor/fontawesome/css/all.min.css"
      />
      <link rel="stylesheet" href="/style.css" />
      {children}
    </>
  );
}
