import { AttendanceReport } from "@/components/attendance-report";
import { LeaveRequestForm } from "@/components/leave-request-form";
import { MapAutoRefresh } from "@/components/map-auto-refresh";
import { auth } from "@/auth";
import { attendanceReportData, monthStartInAppTimeZone, todayInAppTimeZone } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const session = await auth();
  const canViewAll = session?.user.role === "Admin";
  const report = await attendanceReportData(
    canViewAll ? undefined : new Set(session?.user.engineerId ? [session.user.engineerId] : []),
  );

  return (
    <div className="space-y-5">
      <MapAutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Attendance</h1>
        <p className="text-sm text-slate-500">
          {canViewAll
            ? "Monthly attendance by engineer. A day is present when an assigned ticket was accepted or closed that day, or the engineer sent a location."
            : "Your attendance only. A day is present when you accepted or closed an assigned ticket, or sent a location."}
        </p>
      </div>
      {session?.user.engineerId ? <LeaveRequestForm /> : null}
      <AttendanceReport
        engineers={report.engineers}
        events={report.events}
        defaultFrom={monthStartInAppTimeZone()}
        defaultTo={todayInAppTimeZone()}
        canChooseEngineer={canViewAll}
        canExportDailyPdf={canViewAll}
      />
    </div>
  );
}
