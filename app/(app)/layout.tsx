import type { ReactNode } from "react";
import { RequireUser } from "@/components/RequireUser";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <RequireUser>{children}</RequireUser>;
}
