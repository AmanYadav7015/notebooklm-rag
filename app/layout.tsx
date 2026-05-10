import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NotebookLM RAG",
  description: "Chat with your documents — RAG over uploaded PDFs and text",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
