import Wizard from "@/app/onboarding/Wizard";
import DevPanel from "@/components/dev/DevPanel";
import { redirect } from "next/navigation";

export default function DevOnboardingPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-sunk overflow-y-auto">
      <div className="flex-1 flex flex-col items-center p-4 sm:p-6 pb-20">
        <div className="w-full max-w-[420px] my-auto">
          <Wizard schoolName="TEST_SCHOOL_DEV" userName="Dev Tester" />
        </div>
      </div>
      <DevPanel />
    </div>
  );
}
