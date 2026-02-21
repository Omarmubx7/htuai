"use client";

import { useMemo } from "react";
import { Calendar, TrendingUp, TrendingDown, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { PlannerCourse, StudySession } from "@/app/planner/page";

interface WeeklySummaryProps {
    courses: PlannerCourse[];
    studySessions: StudySession[];
}

export default function WeeklySummary({ courses, studySessions }: WeeklySummaryProps) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const thisWeekSessions = useMemo(
        () => studySessions.filter(s => new Date(s.date) >= weekStart),
        [studySessions, weekStart]
    );
    const prevWeekSessions = useMemo(
        () => studySessions.filter(s => {
            const d = new Date(s.date);
            return d >= prevWeekStart && d < weekStart;
        }),
        [studySessions, prevWeekStart, weekStart]
    );

    const thisWeekHours = thisWeekSessions.reduce((s, sess) => s + sess.hours, 0);
    const prevWeekHours = prevWeekSessions.reduce((s, sess) => s + sess.hours, 0);
    const hoursDelta = thisWeekHours - prevWeekHours;
    const trending = hoursDelta >= 0;

    // Per-course breakdown this week
    const courseBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        thisWeekSessions.forEach(s => { map[s.courseId] = (map[s.courseId] || 0) + s.hours; });
        return courses
            .map(c => ({ name: c.name, hours: map[c.id] || 0, id: c.id }))
            .sort((a, b) => b.hours - a.hours);
    }, [thisWeekSessions, courses]);

    const maxHours = Math.max(...courseBreakdown.map(c => c.hours), 1);

    // Upcoming deadlines (next 7 days)
    const upcomingDeadlines = useMemo(() => {
        const deadlines: { label: string; course: string; date: Date; type: string }[] = [];
        const nextWeek = new Date(now.getTime() + 7 * 86400000);
        courses.forEach(c => {
            if (c.midtermDate) {
                const d = new Date(c.midtermDate);
                if (d >= now && d <= nextWeek) {
                    deadlines.push({ label: `${c.name} Midterm`, course: c.name, date: d, type: "midterm" });
                }
            }
            if (c.finalDate) {
                const d = new Date(c.finalDate);
                if (d >= now && d <= nextWeek) {
                    deadlines.push({ label: `${c.name} Final`, course: c.name, date: d, type: "final" });
                }
            }
        });
        return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [courses, now]);

    // Courses with 0 study this week
    const neglectedCourses = courseBreakdown.filter(c => c.hours === 0);

    return (
        <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> This Week
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Hours this week */}
                <div className="glass-card-premium p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Study Hours</span>
                        {trending ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                    </div>
                    <div className="text-2xl font-bold">{thisWeekHours.toFixed(1)}<span className="text-xs text-white/30 ml-1">hrs</span></div>
                    <div className={`text-[10px] font-bold mt-1 ${trending ? "text-emerald-400" : "text-red-400"}`}>
                        {hoursDelta >= 0 ? "+" : ""}{hoursDelta.toFixed(1)}h vs last week
                    </div>
                </div>

                {/* Upcoming deadlines */}
                <div className="glass-card-premium p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Deadlines</span>
                    {upcomingDeadlines.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                            {upcomingDeadlines.slice(0, 3).map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <AlertTriangle className={`w-3 h-3 shrink-0 ${d.type === "final" ? "text-red-400" : "text-amber-400"}`} />
                                    <span className="text-xs truncate">{d.label}</span>
                                    <span className="text-[10px] text-white/20 ml-auto shrink-0">
                                        {d.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-white/20 mt-2">No deadlines this week</div>
                    )}
                </div>

                {/* Neglected courses */}
                <div className="glass-card-premium p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Needs Attention</span>
                    {neglectedCourses.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                            {neglectedCourses.slice(0, 3).map(c => (
                                <div key={c.id} className="flex items-center gap-2 text-xs text-white/40">
                                    <BookOpen className="w-3 h-3 text-amber-400/60 shrink-0" />
                                    <span className="truncate">{c.name}</span>
                                    <span className="text-[10px] text-white/15 ml-auto">0h</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-emerald-400/60 mt-2">All courses studied!</div>
                    )}
                </div>
            </div>

            {/* Study distribution bar chart */}
            {courseBreakdown.some(c => c.hours > 0) && (
                <div className="glass-card-premium p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Study Distribution</span>
                    <div className="mt-3 space-y-2">
                        {courseBreakdown.map(c => (
                            <div key={c.id} className="flex items-center gap-3">
                                <span className="text-xs text-white/50 w-32 truncate shrink-0">{c.name}</span>
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(c.hours / maxHours) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-white/30 w-8 text-right">{c.hours.toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
