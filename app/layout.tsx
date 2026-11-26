import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { CurrentUserProvider } from "@/components/CurrentUser";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "LendLoop", template: "%s · LendLoop" },
  description: "Borrow tools from your neighbours. Lend yours out.",
};

export const viewport: Viewport = {
  themeColor: "#f4f4f5",
};

/** Clerk's sign-in modal and user menu, matched to the app's look. */
const clerkAppearance = {
  variables: {
    colorPrimary: "#059669",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            <CurrentUserProvider>
              <AppShell>{children}</AppShell>
            </CurrentUserProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
