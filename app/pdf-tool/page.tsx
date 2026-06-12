import type { Metadata } from "next";
import PdfStampTool from "../components/PdfStampTool";

export const metadata: Metadata = {
  title: "PDF stamp tool",
};

export default function PdfToolPage() {
  return <PdfStampTool />;
}
