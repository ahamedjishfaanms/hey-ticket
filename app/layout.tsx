import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Hey Ticket — events, done properly",
  description:
    "Create an event, sell or issue tickets, and check people in with a QR scan. Hey Ticket handles onboarding, reminders, and attendance for you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#EF8B0C",
          colorText: "#14151A",
          colorBackground: "#FBF7EF",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <body className="font-body antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
