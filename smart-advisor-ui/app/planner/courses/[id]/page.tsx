import PlannerCourseDetail from "@/components/PlannerCourseDetail";

export default async function PlannerCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PlannerCourseDetail courseId={id} />;
}
