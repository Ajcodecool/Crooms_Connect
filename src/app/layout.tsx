import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import ClientLayout from "../components/ClientLayout";

export const metadata: Metadata = {
  title: "Crooms Connect",
  description: "Your student hub with resources, schedules, and tools.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css"
          rel="stylesheet"
        />
      </head>

      {/* ✅ Add <body> tag — fixes the hydration error */}
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
