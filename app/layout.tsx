import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { CurrentUserProvider } from "@/components/CurrentUser";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow tools from your neighbours. Lend yours out.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <ClerkProvider>
          <ConvexClientProvider>
            <CurrentUserProvider>
              <SiteHeader />
              <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
              <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
                LendLoop, a neighbourhood tool-lending board
              </footer>
            </CurrentUserProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
