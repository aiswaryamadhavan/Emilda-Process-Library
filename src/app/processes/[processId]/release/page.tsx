import Link from "next/link";
import { Download, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
export default function ReleasePage() {
  return (
    <AppShell
      title="Process Release"
      description="Purchase Approval · Version 2.1"
    >
      <Badge className="rounded-full bg-emerald-100 text-emerald-800">
        <FileCheck2 />
        Approved
      </Badge>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Item label="Effective date">20 September 2026</Item>
        <Item label="Old process retires">19 September 2026</Item>
        <Item label="Process Owner">Aishwarya Menon</Item>
        <Item label="Approved by">Aishwarya Menon · 12 Sep</Item>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="min-h-12 rounded-xl">
          <a href="/api/releases/purchase-v21/pdf">
            <Download />
            Download release PDF
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="min-h-12 rounded-xl"
        >
          <Link href="/processes/purchase-approval/implementation">
            Continue implementation
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
function Item({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="eyebrow">{label}</p>
        <p className="mt-2 font-medium">{children}</p>
      </CardContent>
    </Card>
  );
}
