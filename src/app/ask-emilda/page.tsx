import { AppShell } from "@/components/app-shell";
import { AskExperience } from "./ask-experience";
export default function AskPage() {
  return (
    <AppShell
      title="Ask Emilda"
      description="Answers come only from internal sources you can already access."
    >
      <AskExperience />
    </AppShell>
  );
}
