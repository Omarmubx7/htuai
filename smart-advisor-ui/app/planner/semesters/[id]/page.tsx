import PlannerSemesterDetail from "@/components/PlannerSemesterDetail";

export default async function PlannerSemesterPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PlannerSemesterDetail semesterId={id} />;
}
