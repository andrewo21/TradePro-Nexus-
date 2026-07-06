import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description: "Request deletion of your TradePro Nexus account and all associated data.",
};

export default function DeleteAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
