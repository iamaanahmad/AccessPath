import { AccessPathApp } from "@/components/accesspath-app";
import { createAccessPlan } from "@/lib/planner";

const DEFAULT_REQUEST =
  "I'm a wheelchair user visiting London for 5 hours. I need step-free transport from Victoria, an accessible café, a museum, and an accessible restroom.";

export default async function Home() {
  const initialPlan = await createAccessPlan(
    {
      request: DEFAULT_REQUEST,
      needsChangingPlaces: true,
      avoidSteepRamps: false,
    },
    { enableAi: false },
  );

  return <AccessPathApp initialPlan={initialPlan} />;
}
