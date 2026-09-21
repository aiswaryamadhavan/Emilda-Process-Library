import { renderToFile } from "@react-pdf/renderer";
import { mkdir } from "node:fs/promises";
import { ReleaseDocument } from "../src/lib/pdf/release-document";
async function main() {
  await mkdir("output/pdf", { recursive: true });
  await renderToFile(
    <ReleaseDocument />,
    "output/pdf/Acme-Purchase-Approval-v2.1.pdf",
  );
  console.log("output/pdf/Acme-Purchase-Approval-v2.1.pdf");
}
void main();
