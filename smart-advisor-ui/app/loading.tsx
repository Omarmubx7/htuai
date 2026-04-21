export default function Loading() {
    const statCardSkeletonKeys = ["gpa", "progress", "streak"];
    const rowSkeletonKeys = ["row-1", "row-2", "row-3", "row-4", "row-5"];

    return (
        <div className="min-h-screen relative overflow-hidden bg-(--background)">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mesh-gradient" />
            <output className="relative z-10 mx-auto block w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10" aria-label="Loading content" aria-live="polite">
                <div className="space-y-6 animate-pulse">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                        <div className="h-4 w-24 rounded-full bg-white/10 mb-4" />
                        <div className="h-10 w-2/3 rounded-xl bg-white/10 mb-3" />
                        <div className="h-4 w-1/2 rounded-lg bg-white/10" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {statCardSkeletonKeys.map((key) => (
                            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-shimmer">
                                <div className="h-4 w-20 rounded-full bg-white/10 mb-4" />
                                <div className="h-7 w-16 rounded-lg bg-white/10 mb-4" />
                                <div className="h-3 w-full rounded-lg bg-white/10 mb-2" />
                                <div className="h-3 w-4/5 rounded-lg bg-white/10" />
                            </div>
                        ))}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 animate-shimmer">
                        <div className="h-5 w-44 rounded-lg bg-white/10 mb-6" />
                        <div className="space-y-3">
                            {rowSkeletonKeys.map((key) => (
                                <div key={key} className="h-4 w-full rounded-lg bg-white/10" />
                            ))}
                        </div>
                    </div>
                </div>
                <span className="sr-only">Loading workspace content</span>
            </output>
        </div>
    );
}
