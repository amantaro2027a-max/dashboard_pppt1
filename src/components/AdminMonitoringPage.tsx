import React, { useState, useMemo, useEffect } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import {
  ActivityActionType,
  ActivityLogStatus,
  AlertSeverity,
  AlertStatus,
  SecurityAlert,
  UserActivityLog,
  getAdminLevelLabel,
} from '../types/program';
import {
  formatDurationCompact,
  getMalaysiaDateOffset,
  getMalaysiaTimestampParts,
} from '../utils/activityLogger';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Activity,
  Users,
  UserCheck,
  LogIn,
  ShieldAlert,
  UserX,
  Search,
  Filter,
  Eye,
  X,
  Clock,
  FileText,
  FileSpreadsheet,
  Download,
  Lock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  List,
  UserCog,
  Shield,
  ChevronLeft,
  ChevronRight,
  Power,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

type MonitoringSubTab = 'overview' | 'logs' | 'profiles' | 'alerts' | 'reports';

type ReportTypeId =
  | 'daily_activity'
  | 'weekly_activity'
  | 'monthly_activity'
  | 'individual_user'
  | 'login_history'
  | 'failed_login'
  | 'module_access'
  | 'admin_audit'
  | 'security_incident';

const REPORT_TYPES: Array<{ id: ReportTypeId; number: number; title: string; subtitle: string }> = [
  {
    id: 'daily_activity',
    number: 1,
    title: 'Daily User Activity Report',
    subtitle: 'All recorded user activities for a selected day or custom date span',
  },
  {
    id: 'weekly_activity',
    number: 2,
    title: 'Weekly User Activity Report',
    subtitle: '7-day consolidated user interactions, logins, and module usage',
  },
  {
    id: 'monthly_activity',
    number: 3,
    title: 'Monthly User Activity Report',
    subtitle: '30-day executive overview of portal engagement and data actions',
  },
  {
    id: 'individual_user',
    number: 4,
    title: 'Individual User Activity Report',
    subtitle: 'Complete audit trail and navigation timeline for a specific user account',
  },
  {
    id: 'login_history',
    number: 5,
    title: 'Login History Report',
    subtitle: 'All authentication sessions (LOGIN, LOGOUT, SESSION_TIMEOUT, PASSWORD changes)',
  },
  {
    id: 'failed_login',
    number: 6,
    title: 'Failed Login Report',
    subtitle: 'Failed login attempts, inactive account blocks, and unauthorized access',
  },
  {
    id: 'module_access',
    number: 7,
    title: 'Module Access Report',
    subtitle: 'Page/module visits, dashboard views, report views, and time spent',
  },
  {
    id: 'admin_audit',
    number: 8,
    title: 'Administrative Action Audit Report',
    subtitle: 'Account creations, role edits, password resets, activation changes, and config edits',
  },
  {
    id: 'security_incident',
    number: 9,
    title: 'Security Incident Report',
    subtitle: 'System security alerts, severity classifications, and review resolutions',
  },
];

const ACTION_TYPE_OPTIONS: ActivityActionType[] = [
  'LOGIN',
  'FAILED_LOGIN',
  'LOGOUT',
  'SESSION_TIMEOUT',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET',
  'UNAUTHORIZED_ACCESS',
  'NAVIGATE',
  'PAGE_DURATION',
  'CREATE',
  'VIEW',
  'UPDATE',
  'DELETE',
  'UPLOAD',
  'DOWNLOAD',
  'PREVIEW',
  'REPLACE',
  'ADMIN_ACTION',
  'SEARCH',
  'EXPORT',
  'PRINT',
  'REPORT',
];

const STATUS_BADGE_CLASS: Record<ActivityLogStatus, string> = {
  SUCCESS: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  FAILED: 'text-amber-700 bg-amber-50 border-amber-200',
  BLOCKED: 'text-rose-700 bg-rose-50 border-rose-200',
};

const SEVERITY_BADGE_CLASS: Record<AlertSeverity, string> = {
  Critical: 'text-rose-800 bg-rose-100 border-rose-300',
  High: 'text-orange-800 bg-orange-100 border-orange-300',
  Medium: 'text-amber-800 bg-amber-100 border-amber-300',
  Low: 'text-sky-800 bg-sky-100 border-sky-300',
};

const ALERT_STATUS_BADGE_CLASS: Record<AlertStatus, string> = {
  New: 'text-rose-700 bg-rose-50 border-rose-200',
  'Under Review': 'text-amber-700 bg-amber-50 border-amber-200',
  Resolved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const CHART_PALETTE = [
  '#0f172a',
  '#2563eb',
  '#0d9488',
  '#d97706',
  '#4f46e5',
  '#dc2626',
  '#059669',
  '#64748b',
];

function formatDeltaBadge(current: number, previous: number): {
  label: string;
  direction: 'up' | 'down' | 'flat';
} {
  if (previous === 0 && current === 0) {
    return { label: '0% vs prev', direction: 'flat' };
  }
  if (previous === 0) {
    return { label: `+${current} vs prev (0)`, direction: 'up' };
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (diff > 0) return { label: `+${pct}% (+${diff}) vs prev`, direction: 'up' };
  if (diff < 0) return { label: `${pct}% (${diff}) vs prev`, direction: 'down' };
  return { label: '0% vs prev', direction: 'flat' };
}

function getMonthKey(dateStr: string): string {
  return (dateStr || '').slice(0, 7);
}

function getWeekStartDate(dateStr: string): string {
  const parts = (dateStr || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export const AdminMonitoringPage: React.FC = () => {
  const {
    currentUser,
    isSuperAdmin,
    getPageAccessMode,
    getAuthorizedJabatanList,
    adminUsers,
    pegawaiList,
    activityLogs,
    securityAlerts,
    updateAlertStatus,
    toggleAdminUserActive,
    logActivity,
    setActiveTab,
  } = useProgramContext();

  const pageAccessMode = getPageAccessMode('ADMIN MONITORING DASHBOARD');
  const canAccess = Boolean(currentUser) && (isSuperAdmin || pageAccessMode !== 'none');

  useEffect(() => {
    if (currentUser && !canAccess) {
      logActivity({
        action_type: 'UNAUTHORIZED_ACCESS',
        module_name: 'Admin Monitoring Dashboard',
        activity_description: `Unauthorized attempt to access Admin Monitoring Dashboard by "${currentUser.id}"`,
        record_id: 'ADMIN MONITORING DASHBOARD',
        status: 'BLOCKED',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, canAccess]);

  const [subTab, setSubTab] = useState<MonitoringSubTab>('overview');
  const [trendGranularity, setTrendGranularity] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');

  // Recent Activity Table filters & pagination
  const [logSearch, setLogSearch] = useState('');
  const [logRoleFilter, setLogRoleFilter] = useState('ALL');
  const [logModuleFilter, setLogModuleFilter] = useState('ALL');
  const [logActionFilter, setLogActionFilter] = useState('ALL');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | ActivityLogStatus>('ALL');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logPageSize, setLogPageSize] = useState<number>(20);
  const [logPage, setLogPage] = useState<number>(1);
  const [selectedLogDetail, setSelectedLogDetail] = useState<UserActivityLog | null>(null);

  // User Activity Profile state
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string>('');
  const [profileSearch, setProfileSearch] = useState('');
  const [showCompleteHistory, setShowCompleteHistory] = useState(false);

  // Security & Alert Monitoring state
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');
  const [alertStatusFilter, setAlertStatusFilter] = useState<'ALL' | AlertStatus>('ALL');
  const [alertSearch, setAlertSearch] = useState('');
  const [selectedAlertDetail, setSelectedAlertDetail] = useState<SecurityAlert | null>(null);

  // Report Generation state
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeId>('daily_activity');
  const [reportStartDate, setReportStartDate] = useState(() => getMalaysiaDateOffset(0));
  const [reportEndDate, setReportEndDate] = useState(() => getMalaysiaDateOffset(0));
  const [reportUserFilter, setReportUserFilter] = useState('ALL');
  const [reportRoleFilter, setReportRoleFilter] = useState('ALL');
  const [reportModuleFilter, setReportModuleFilter] = useState('ALL');
  const [reportActionFilter, setReportActionFilter] = useState('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | ActivityLogStatus>('ALL');
  const [reportOrientation, setReportOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const todayDate = getMalaysiaDateOffset(0);
  const yesterdayDate = getMalaysiaDateOffset(1);
  const cutoff30DaysDate = getMalaysiaDateOffset(30);

  // RBAC Scoping:
  // Super Admin sees everything. Level 2-7 authorized users see only logs/users/alerts relevant to their authorized Jabatans or own ID.
  const authorizedJabatans = useMemo(() => getAuthorizedJabatanList(), [getAuthorizedJabatanList]);

  const scopedUserIds = useMemo(() => {
    if (isSuperAdmin) return null;
    if (!currentUser) return new Set<string>();
    const allowed = new Set<string>([currentUser.id.toUpperCase()]);
    adminUsers.forEach((u) => {
      if (u.role === 'SUPER_ADMIN') return;
      const uJabs = Object.keys(u.jabatanAccess || {}).concat(u.allowedJabatans || []);
      if (u.jabatan) uJabs.push(u.jabatan);
      if (uJabs.some((j) => authorizedJabatans.includes(j))) {
        allowed.add(u.id.toUpperCase());
      }
    });
    return allowed;
  }, [isSuperAdmin, currentUser, adminUsers, authorizedJabatans]);

  const scopedAdminUsers = useMemo(() => {
    if (isSuperAdmin) return adminUsers;
    if (!scopedUserIds) return [];
    return adminUsers.filter((u) => scopedUserIds.has(u.id.toUpperCase()));
  }, [isSuperAdmin, adminUsers, scopedUserIds]);

  const scopedLogs = useMemo(() => {
    if (isSuperAdmin) return activityLogs;
    if (!scopedUserIds) return [];
    return activityLogs.filter((l) => {
      const uid = (l.user_id || '').toUpperCase();
      if (!scopedUserIds.has(uid)) return false;
      // Non-super-admin cannot inspect system-wide Super Admin actions
      if (l.action_type === 'ADMIN_ACTION' && uid !== currentUser?.id.toUpperCase()) return false;
      return true;
    });
  }, [isSuperAdmin, activityLogs, scopedUserIds, currentUser?.id]);

  const scopedAlerts = useMemo(() => {
    if (isSuperAdmin) return securityAlerts;
    if (!scopedUserIds) return [];
    return securityAlerts.filter((a) => scopedUserIds.has((a.user_id || '').toUpperCase()));
  }, [isSuperAdmin, securityAlerts, scopedUserIds]);

  // Helper to resolve email for each AdminUser
  const getUserEmail = (userId: string, userName: string): string => {
    const matched = pegawaiList.find(
      (p) =>
        p.id.trim().toUpperCase() === userId.trim().toUpperCase() ||
        p.nama.trim().toUpperCase() === userName.trim().toUpperCase()
    );
    if (matched?.emel) return matched.emel;
    const logWithEmail = activityLogs.find(
      (l) => l.user_id.toUpperCase() === userId.toUpperCase() && l.user_email && l.user_email !== '-'
    );
    return logWithEmail?.user_email || `${userId.toLowerCase()}@iab.moe.edu.my`;
  };

  // Update date preset when user clicks report type shortcuts
  const handleSelectReportType = (typeId: ReportTypeId) => {
    setSelectedReportType(typeId);
    if (typeId === 'daily_activity') {
      setReportStartDate(todayDate);
      setReportEndDate(todayDate);
    } else if (typeId === 'weekly_activity') {
      setReportStartDate(getMalaysiaDateOffset(6));
      setReportEndDate(todayDate);
    } else if (typeId === 'monthly_activity') {
      setReportStartDate(getMalaysiaDateOffset(29));
      setReportEndDate(todayDate);
    } else if (
      typeId === 'individual_user' &&
      reportUserFilter === 'ALL' &&
      scopedAdminUsers.length > 0
    ) {
      setReportUserFilter(scopedAdminUsers[0].id);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. KPI METRICS (7 Cards + Previous Period Comparison)
  // ---------------------------------------------------------------------------
  const kpiStats = useMemo(() => {
    const logsToday = scopedLogs.filter((l) => l.malaysia_date === todayDate);
    const logsYesterday = scopedLogs.filter((l) => l.malaysia_date === yesterdayDate);

    const activeUsersTodaySet = new Set(
      logsToday
        .filter((l) => l.user_id !== 'PELAWAT' && l.status === 'SUCCESS')
        .map((l) => l.user_id.toUpperCase())
    );
    const activeUsersYesterdaySet = new Set(
      logsYesterday
        .filter((l) => l.user_id !== 'PELAWAT' && l.status === 'SUCCESS')
        .map((l) => l.user_id.toUpperCase())
    );

    const loginsToday = logsToday.filter(
      (l) => l.action_type === 'LOGIN' && l.status === 'SUCCESS'
    ).length;
    const loginsYesterday = logsYesterday.filter(
      (l) => l.action_type === 'LOGIN' && l.status === 'SUCCESS'
    ).length;

    const failedLoginsToday = logsToday.filter(
      (l) => l.action_type === 'FAILED_LOGIN' || (l.action_type === 'LOGIN' && l.status !== 'SUCCESS')
    ).length;
    const failedLoginsYesterday = logsYesterday.filter(
      (l) => l.action_type === 'FAILED_LOGIN' || (l.action_type === 'LOGIN' && l.status !== 'SUCCESS')
    ).length;

    const totalActivitiesToday = logsToday.length;
    const totalActivitiesYesterday = logsYesterday.length;

    const suspiciousOpenCount = scopedAlerts.filter((a) => a.status !== 'Resolved').length;
    const suspiciousTodayCount = scopedAlerts.filter(
      (a) => a.timestamp.slice(0, 10) === todayDate
    ).length;
    const suspiciousYesterdayCount = scopedAlerts.filter(
      (a) => a.timestamp.slice(0, 10) === yesterdayDate
    ).length;

    // Inactive users in last 30 days
    const activeLast30Users = new Set(
      scopedLogs
        .filter((l) => l.malaysia_date >= cutoff30DaysDate && l.status === 'SUCCESS')
        .map((l) => l.user_id.toUpperCase())
    );
    const inactiveUsersCount = scopedAdminUsers.filter((u) => {
      if (u.isActive === false) return true;
      const hasRecentLog = activeLast30Users.has(u.id.toUpperCase());
      const hasRecentLastLogin = u.lastLoginAt
        ? u.lastLoginAt.slice(0, 10) >= cutoff30DaysDate
        : false;
      return !hasRecentLog && !hasRecentLastLogin;
    }).length;

    const activeAccountCount = scopedAdminUsers.filter((u) => u.isActive !== false).length;

    return {
      totalUsers: scopedAdminUsers.length,
      activeAccountCount,
      disabledAccountCount: scopedAdminUsers.length - activeAccountCount,
      activeUsersToday: activeUsersTodaySet.size,
      activeUsersDelta: formatDeltaBadge(activeUsersTodaySet.size, activeUsersYesterdaySet.size),
      loginsToday,
      loginsDelta: formatDeltaBadge(loginsToday, loginsYesterday),
      failedLoginsToday,
      failedLoginsDelta: formatDeltaBadge(failedLoginsToday, failedLoginsYesterday),
      totalActivitiesToday,
      totalActivitiesDelta: formatDeltaBadge(totalActivitiesToday, totalActivitiesYesterday),
      suspiciousOpenCount,
      suspiciousTodayCount,
      suspiciousDelta: formatDeltaBadge(suspiciousTodayCount, suspiciousYesterdayCount),
      inactiveUsersCount,
    };
  }, [scopedLogs, scopedAlerts, scopedAdminUsers, todayDate, yesterdayDate, cutoff30DaysDate]);

  // ---------------------------------------------------------------------------
  // 2. CHART DATA (8 Interactive Visualizations)
  // ---------------------------------------------------------------------------
  const analyticsCharts = useMemo(() => {
    // Chart 1 & 3: Last 14 days daily logins & success vs failed
    const last14Days = Array.from({ length: 14 }, (_, i) => getMalaysiaDateOffset(13 - i));
    const dailyLoginSeries = last14Days.map((dateStr) => {
      const dayLogs = scopedLogs.filter((l) => l.malaysia_date === dateStr);
      const successLogins = dayLogs.filter(
        (l) => l.action_type === 'LOGIN' && l.status === 'SUCCESS'
      ).length;
      const failedLogins = dayLogs.filter(
        (l) => l.action_type === 'FAILED_LOGIN' || (l.action_type === 'LOGIN' && l.status !== 'SUCCESS')
      ).length;
      const totalEvents = dayLogs.length;
      return {
        date: dateStr,
        shortLabel: `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`,
        successLogins,
        failedLogins,
        totalEvents,
      };
    });

    // Chart 2: Switchable Daily / Weekly / Monthly Activity Trends
    let activityTrendSeries: Array<{ label: string; count: number }> = [];
    if (trendGranularity === 'Daily') {
      activityTrendSeries = dailyLoginSeries.map((d) => ({
        label: d.shortLabel,
        count: d.totalEvents,
      }));
    } else if (trendGranularity === 'Weekly') {
      const weekBuckets: Record<string, number> = {};
      for (let w = 7; w >= 0; w--) {
        const wkStart = getWeekStartDate(getMalaysiaDateOffset(w * 7));
        weekBuckets[wkStart] = 0;
      }
      scopedLogs.forEach((l) => {
        const wk = getWeekStartDate(l.malaysia_date);
        if (weekBuckets[wk] !== undefined) {
          weekBuckets[wk] += 1;
        }
      });
      activityTrendSeries = Object.entries(weekBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([wk, count]) => ({
          label: `W ${wk.slice(8, 10)}/${wk.slice(5, 7)}`,
          count,
        }));
    } else {
      const monthBuckets: Record<string, number> = {};
      for (let m = 5; m >= 0; m--) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);
        const mk = getMalaysiaTimestampParts(d).malaysia_date.slice(0, 7);
        monthBuckets[mk] = 0;
      }
      scopedLogs.forEach((l) => {
        const mk = getMonthKey(l.malaysia_date);
        if (monthBuckets[mk] !== undefined) {
          monthBuckets[mk] += 1;
        }
      });
      activityTrendSeries = Object.entries(monthBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mk, count]) => ({
          label: mk,
          count,
        }));
    }

    // Chart 4: Activities by User Role
    const roleCounts: Record<string, number> = {};
    scopedLogs.forEach((l) => {
      const r = l.user_role || 'Pelawat (Viewer)';
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    });
    const byRole = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    // Chart 5: Activities by Module (All actions)
    const moduleCounts: Record<string, { count: number; duration: number; visits: number }> = {};
    scopedLogs.forEach((l) => {
      const mod = l.module_name || 'Sistem';
      if (!moduleCounts[mod]) {
        moduleCounts[mod] = { count: 0, duration: 0, visits: 0 };
      }
      moduleCounts[mod].count += 1;
      if (l.action_type === 'NAVIGATE') moduleCounts[mod].visits += 1;
      if (l.duration_seconds) moduleCounts[mod].duration += l.duration_seconds;
    });
    const byModule = Object.entries(moduleCounts)
      .map(([moduleName, stats]) => ({ moduleName, ...stats }))
      .sort((a, b) => b.count - a.count);

    // Chart 6: Most Active Users
    const userMap: Record<string, { user_id: string; user_name: string; user_role: string; count: number; logins: number }> = {};
    scopedLogs.forEach((l) => {
      const uid = l.user_id.toUpperCase();
      if (!userMap[uid]) {
        userMap[uid] = {
          user_id: uid,
          user_name: l.user_name,
          user_role: l.user_role,
          count: 0,
          logins: 0,
        };
      }
      userMap[uid].count += 1;
      if (l.action_type === 'LOGIN' && l.status === 'SUCCESS') {
        userMap[uid].logins += 1;
      }
    });
    const topUsers = Object.values(userMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Chart 7: Most Frequently Accessed Modules (Navigation visits + duration)
    const topAccessedModules = [...byModule]
      .sort((a, b) => b.visits - a.visits || b.count - a.count)
      .slice(0, 8);

    // Chart 8: Activity Distribution by Action Type
    const actionCounts: Record<string, number> = {};
    scopedLogs.forEach((l) => {
      const a = l.action_type || 'VIEW';
      actionCounts[a] = (actionCounts[a] || 0) + 1;
    });
    const byActionType = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    return {
      dailyLoginSeries,
      activityTrendSeries,
      byRole,
      byModule,
      topUsers,
      topAccessedModules,
      byActionType,
    };
  }, [scopedLogs, trendGranularity]);

  // ---------------------------------------------------------------------------
  // 3. FILTERED RECENT ACTIVITY TABLE
  // ---------------------------------------------------------------------------
  const uniqueRoles = useMemo(
    () => Array.from(new Set(scopedLogs.map((l) => l.user_role).filter(Boolean))).sort(),
    [scopedLogs]
  );
  const uniqueModules = useMemo(
    () => Array.from(new Set(scopedLogs.map((l) => l.module_name).filter(Boolean))).sort(),
    [scopedLogs]
  );

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return scopedLogs.filter((l) => {
      if (logRoleFilter !== 'ALL' && l.user_role !== logRoleFilter) return false;
      if (logModuleFilter !== 'ALL' && l.module_name !== logModuleFilter) return false;
      if (logActionFilter !== 'ALL' && l.action_type !== logActionFilter) return false;
      if (logStatusFilter !== 'ALL' && l.status !== logStatusFilter) return false;
      if (logStartDate && l.malaysia_date < logStartDate) return false;
      if (logEndDate && l.malaysia_date > logEndDate) return false;
      if (q) {
        const hay = `${l.user_name} ${l.user_email} ${l.user_id} ${l.activity_description} ${l.module_name} ${l.record_id || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    scopedLogs,
    logSearch,
    logRoleFilter,
    logModuleFilter,
    logActionFilter,
    logStatusFilter,
    logStartDate,
    logEndDate,
  ]);

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logPageSize));
  const paginatedLogs = useMemo(() => {
    const safePage = Math.min(logPage, totalLogPages);
    const start = (safePage - 1) * logPageSize;
    return filteredLogs.slice(start, start + logPageSize);
  }, [filteredLogs, logPage, logPageSize, totalLogPages]);

  // ---------------------------------------------------------------------------
  // 4. USER ACTIVITY PROFILES
  // ---------------------------------------------------------------------------
  const userProfiles = useMemo(() => {
    const knownMap = new Map<
      string,
      {
        user_id: string;
        name: string;
        email: string;
        role: string;
        isActive: boolean;
        isRegistered: boolean;
        lastLoginAt: string;
        totalLogins: number;
        totalActivities: number;
        failedLogins: number;
        logs: UserActivityLog[];
      }
    >();

    scopedAdminUsers.forEach((u) => {
      const uid = u.id.toUpperCase();
      knownMap.set(uid, {
        user_id: uid,
        name: u.name,
        email: getUserEmail(uid, u.name),
        role: getAdminLevelLabel(u.levelId, u.role),
        isActive: u.isActive !== false,
        isRegistered: true,
        lastLoginAt: u.lastLoginAt || '',
        totalLogins: 0,
        totalActivities: 0,
        failedLogins: 0,
        logs: [],
      });
    });

    scopedLogs.forEach((l) => {
      const uid = (l.user_id || 'PELAWAT').toUpperCase();
      if (!knownMap.has(uid)) {
        knownMap.set(uid, {
          user_id: uid,
          name: l.user_name,
          email: l.user_email,
          role: l.user_role,
          isActive: uid !== 'PELAWAT',
          isRegistered: false,
          lastLoginAt: '',
          totalLogins: 0,
          totalActivities: 0,
          failedLogins: 0,
          logs: [],
        });
      }
      const p = knownMap.get(uid)!;
      p.totalActivities += 1;
      p.logs.push(l);
      if (l.action_type === 'LOGIN' && l.status === 'SUCCESS') {
        p.totalLogins += 1;
        if (!p.lastLoginAt) p.lastLoginAt = l.malaysia_datetime_display;
      }
      if (l.action_type === 'FAILED_LOGIN' || (l.action_type === 'LOGIN' && l.status !== 'SUCCESS')) {
        p.failedLogins += 1;
      }
    });

    return Array.from(knownMap.values()).sort((a, b) => b.totalActivities - a.totalActivities);
  }, [scopedAdminUsers, scopedLogs, pegawaiList]);

  useEffect(() => {
    if (!selectedProfileUserId && userProfiles.length > 0) {
      setSelectedProfileUserId(userProfiles[0].user_id);
    }
  }, [selectedProfileUserId, userProfiles]);

  const activeProfile = useMemo(() => {
    if (!selectedProfileUserId) return userProfiles[0] || null;
    return (
      userProfiles.find((p) => p.user_id === selectedProfileUserId.toUpperCase()) ||
      userProfiles[0] ||
      null
    );
  }, [selectedProfileUserId, userProfiles]);

  const activeProfileModules = useMemo(() => {
    if (!activeProfile) return [];
    const map: Record<string, { moduleName: string; count: number; duration: number }> = {};
    activeProfile.logs.forEach((l) => {
      const mod = l.module_name || 'Sistem';
      if (!map[mod]) map[mod] = { moduleName: mod, count: 0, duration: 0 };
      map[mod].count += 1;
      if (l.duration_seconds) map[mod].duration += l.duration_seconds;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [activeProfile]);

  const filteredProfileDirectory = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return userProfiles;
    return userProfiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.user_id.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
    );
  }, [userProfiles, profileSearch]);

  // ---------------------------------------------------------------------------
  // 5. SECURITY & ALERT MONITORING
  // ---------------------------------------------------------------------------
  const filteredAlerts = useMemo(() => {
    const q = alertSearch.trim().toLowerCase();
    return scopedAlerts.filter((a) => {
      if (alertSeverityFilter !== 'ALL' && a.severity !== alertSeverityFilter) return false;
      if (alertStatusFilter !== 'ALL' && a.status !== alertStatusFilter) return false;
      if (q) {
        const hay = `${a.title} ${a.description} ${a.user_name} ${a.user_id} ${a.module_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedAlerts, alertSeverityFilter, alertStatusFilter, alertSearch]);

  const alertCounts = useMemo(() => {
    return {
      total: scopedAlerts.length,
      newCount: scopedAlerts.filter((a) => a.status === 'New').length,
      reviewCount: scopedAlerts.filter((a) => a.status === 'Under Review').length,
      resolvedCount: scopedAlerts.filter((a) => a.status === 'Resolved').length,
      criticalCount: scopedAlerts.filter((a) => a.severity === 'Critical' && a.status !== 'Resolved').length,
    };
  }, [scopedAlerts]);

  // ---------------------------------------------------------------------------
  // 6. REPORT GENERATION ENGINE (9 Reports × 3 Formats: PDF / XLSX / CSV)
  // ---------------------------------------------------------------------------
  const reportDataset = useMemo(() => {
    const isIncidentReport = selectedReportType === 'security_incident';

    const matchesCommonDate = (malaysiaDate: string) => {
      if (reportStartDate && malaysiaDate < reportStartDate) return false;
      if (reportEndDate && malaysiaDate > reportEndDate) return false;
      return true;
    };

    if (isIncidentReport) {
      const incidentRows = scopedAlerts.filter((a) => {
        const aDate = a.timestamp.slice(0, 10);
        if (!matchesCommonDate(aDate)) return false;
        if (reportUserFilter !== 'ALL' && a.user_id.toUpperCase() !== reportUserFilter.toUpperCase())
          return false;
        if (reportModuleFilter !== 'ALL' && a.module_name !== reportModuleFilter) return false;
        return true;
      });
      return { isIncidentReport: true as const, logs: [] as UserActivityLog[], alerts: incidentRows };
    }

    const filteredReportLogs = scopedLogs.filter((l) => {
      if (!matchesCommonDate(l.malaysia_date)) return false;
      if (reportUserFilter !== 'ALL' && l.user_id.toUpperCase() !== reportUserFilter.toUpperCase())
        return false;
      if (reportRoleFilter !== 'ALL' && l.user_role !== reportRoleFilter) return false;
      if (reportModuleFilter !== 'ALL' && l.module_name !== reportModuleFilter) return false;
      if (reportActionFilter !== 'ALL' && l.action_type !== reportActionFilter) return false;
      if (reportStatusFilter !== 'ALL' && l.status !== reportStatusFilter) return false;

      if (selectedReportType === 'login_history') {
        return ['LOGIN', 'FAILED_LOGIN', 'LOGOUT', 'SESSION_TIMEOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET'].includes(
          l.action_type
        );
      }
      if (selectedReportType === 'failed_login') {
        return (
          l.action_type === 'FAILED_LOGIN' ||
          l.action_type === 'UNAUTHORIZED_ACCESS' ||
          l.status === 'FAILED' ||
          l.status === 'BLOCKED'
        );
      }
      if (selectedReportType === 'module_access') {
        return ['NAVIGATE', 'PAGE_DURATION', 'VIEW', 'REPORT', 'PREVIEW'].includes(l.action_type);
      }
      if (selectedReportType === 'admin_audit') {
        return (
          l.action_type === 'ADMIN_ACTION' ||
          l.action_type === 'PASSWORD_RESET' ||
          l.module_name === 'Portal Admin'
        );
      }
      return true;
    });

    return { isIncidentReport: false as const, logs: filteredReportLogs, alerts: [] as SecurityAlert[] };
  }, [
    selectedReportType,
    scopedLogs,
    scopedAlerts,
    reportStartDate,
    reportEndDate,
    reportUserFilter,
    reportRoleFilter,
    reportModuleFilter,
    reportActionFilter,
    reportStatusFilter,
  ]);

  const reportSummaryAnalytics = useMemo(() => {
    const activeReportDef = REPORT_TYPES.find((r) => r.id === selectedReportType)!;
    const generatedAt = getMalaysiaTimestampParts().malaysia_datetime_display;
    const generatedBy = currentUser
      ? `${currentUser.name} (${currentUser.id} - ${getAdminLevelLabel(currentUser.levelId, currentUser.role)})`
      : '-';
    const reportingPeriod = `${reportStartDate || 'All Time'} to ${reportEndDate || 'Present'} (MYT)`;

    if (reportDataset.isIncidentReport) {
      const list = reportDataset.alerts;
      const critical = list.filter((a) => a.severity === 'Critical').length;
      const high = list.filter((a) => a.severity === 'High').length;
      const unresolved = list.filter((a) => a.status !== 'Resolved').length;
      return {
        reportTitle: activeReportDef.title,
        generatedAt,
        generatedBy,
        reportingPeriod,
        totalRecords: list.length,
        uniqueUsers: new Set(list.map((a) => a.user_id.toUpperCase())).size,
        highlights: [
          { label: 'Total Security Alerts', value: String(list.length) },
          { label: 'Critical Severity', value: String(critical) },
          { label: 'High Severity', value: String(high) },
          { label: 'Unresolved (New / Under Review)', value: String(unresolved) },
        ],
      };
    }

    const list = reportDataset.logs;
    const successCount = list.filter((l) => l.status === 'SUCCESS').length;
    const failedCount = list.filter((l) => l.status === 'FAILED').length;
    const blockedCount = list.filter((l) => l.status === 'BLOCKED').length;
    const uniqueUsers = new Set(list.map((l) => l.user_id.toUpperCase())).size;

    const modCounts: Record<string, number> = {};
    list.forEach((l) => {
      modCounts[l.module_name] = (modCounts[l.module_name] || 0) + 1;
    });
    const topModule =
      Object.entries(modCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    return {
      reportTitle: activeReportDef.title,
      generatedAt,
      generatedBy,
      reportingPeriod,
      totalRecords: list.length,
      uniqueUsers,
      highlights: [
        { label: 'Total Activities', value: String(list.length) },
        { label: 'Unique Active Users', value: String(uniqueUsers) },
        { label: 'Success / Failed / Blocked', value: `${successCount} / ${failedCount} / ${blockedCount}` },
        { label: 'Top Accessed Module', value: topModule },
      ],
    };
  }, [selectedReportType, reportDataset, currentUser, reportStartDate, reportEndDate]);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleDownloadReport = (format: 'pdf' | 'xlsx' | 'csv') => {
    const fileSlug = reportSummaryAnalytics.reportTitle
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_');
    const dateStamp = getMalaysiaDateOffset(0);

    if (format === 'pdf') {
      const doc = new jsPDF({
        orientation: reportOrientation,
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('KEMENTERIAN PENDIDIKAN · INSTITUT AMINUDDIN BAKI (IAB)', margin, 7);
      doc.setFontSize(12);
      doc.text(`ADMIN MONITORING REPORT: ${reportSummaryAnalytics.reportTitle.toUpperCase()}`, margin, 14);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${reportSummaryAnalytics.generatedAt} (MYT) | By: ${reportSummaryAnalytics.generatedBy}`,
        margin,
        20
      );

      // Reporting Period & Summary Analytics box
      autoTable(doc, {
        startY: 28,
        margin: { left: margin, right: margin },
        body: [
          ['Reporting Period', reportSummaryAnalytics.reportingPeriod, 'Total Records', String(reportSummaryAnalytics.totalRecords)],
          ...reportSummaryAnalytics.highlights
            .reduce<string[][]>((acc, h, idx) => {
              if (idx % 2 === 0) acc.push([h.label, h.value, '', '']);
              else {
                acc[acc.length - 1][2] = h.label;
                acc[acc.length - 1][3] = h.value;
              }
              return acc;
            }, []),
        ],
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [203, 213, 225], lineWidth: 0.2 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 42 },
          1: { cellWidth: (pageWidth - margin * 2) / 2 - 42 },
          2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 42 },
          3: { cellWidth: (pageWidth - margin * 2) / 2 - 42 },
        },
      });

      const tableStartY = ((doc as any).lastAutoTable?.finalY || 46) + 4;

      if (reportDataset.isIncidentReport) {
        autoTable(doc, {
          startY: tableStartY,
          margin: { left: margin, right: margin, bottom: 12 },
          head: [['Alert ID', 'Date & Time (MYT)', 'Severity', 'Status', 'User', 'Module', 'Incident Description']],
          body: reportDataset.alerts.map((a) => [
            a.alert_id,
            a.malaysia_datetime_display,
            a.severity,
            a.status,
            `${a.user_name} (${a.user_id})`,
            a.module_name,
            `${a.title}: ${a.description}`,
          ]),
          styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak', lineColor: [203, 213, 225], lineWidth: 0.15 },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          didDrawPage: (data) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(
              `Page ${data.pageNumber} of ${pageCount} · IAB Admin Monitoring Audit`,
              pageWidth - margin,
              doc.internal.pageSize.getHeight() - 6,
              { align: 'right' }
            );
          },
        });
      } else {
        autoTable(doc, {
          startY: tableStartY,
          margin: { left: margin, right: margin, bottom: 12 },
          head: [['Date & Time (MYT)', 'User', 'Role', 'Activity', 'Module', 'Description', 'Status']],
          body: reportDataset.logs.map((l) => [
            l.malaysia_datetime_display,
            `${l.user_name} (${l.user_id})`,
            l.user_role,
            l.action_type,
            l.module_name,
            l.activity_description + (l.duration_seconds ? ` [${formatDurationCompact(l.duration_seconds)}]` : ''),
            l.status,
          ]),
          styles: { fontSize: 6.8, cellPadding: 1.7, overflow: 'linebreak', lineColor: [203, 213, 225], lineWidth: 0.15 },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          didDrawPage: (data) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(
              `Page ${data.pageNumber} of ${pageCount} · IAB Admin Monitoring Audit`,
              pageWidth - margin,
              doc.internal.pageSize.getHeight() - 6,
              { align: 'right' }
            );
          },
        });
      }

      const fileName = `${fileSlug}_${dateStamp}.pdf`;
      doc.save(fileName);
      logActivity({
        action_type: 'REPORT',
        module_name: 'Admin Monitoring Dashboard',
        activity_description: `Generated PDF report "${reportSummaryAnalytics.reportTitle}" (${reportSummaryAnalytics.totalRecords} records): ${fileName}`,
        record_id: fileName,
        status: 'SUCCESS',
      });
      showToast(`PDF Report downloaded: ${fileName}`);
      return;
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const summarySheetData: (string | number)[][] = [
        ['REPORT TITLE', reportSummaryAnalytics.reportTitle],
        ['REPORT GENERATION DATE (MYT)', reportSummaryAnalytics.generatedAt],
        ['GENERATED BY', reportSummaryAnalytics.generatedBy],
        ['REPORTING PERIOD', reportSummaryAnalytics.reportingPeriod],
        ['TOTAL RECORDS', reportSummaryAnalytics.totalRecords],
        [],
        ['SUMMARY ANALYTICS'],
        ...reportSummaryAnalytics.highlights.map((h) => [h.label, h.value]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
      wsSummary['!cols'] = [{ wch: 32 }, { wch: 52 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Analytics');

      const detailRows = reportDataset.isIncidentReport
        ? reportDataset.alerts.map((a, idx) => ({
            No: idx + 1,
            'Alert ID': a.alert_id,
            'Date & Time (MYT)': a.malaysia_datetime_display,
            Severity: a.severity,
            Status: a.status,
            'User ID': a.user_id,
            'User Name': a.user_name,
            Module: a.module_name,
            Title: a.title,
            Description: a.description,
            'Trigger Count': a.trigger_count,
            'Reviewed By': a.reviewed_by || '-',
            'Reviewed At': a.reviewed_at || '-',
          }))
        : reportDataset.logs.map((l, idx) => ({
            No: idx + 1,
            'Log ID': l.log_id,
            'Date & Time (MYT)': l.malaysia_datetime_display,
            'User ID': l.user_id,
            User: l.user_name,
            Email: l.user_email,
            Role: l.user_role,
            Activity: l.action_type,
            Module: l.module_name,
            Description: l.activity_description,
            'Record ID': l.record_id || '-',
            'Duration (s)': l.duration_seconds ?? '-',
            'IP Address': l.ip_address,
            Device: l.device_info,
            'Session ID': l.session_id,
            Status: l.status,
          }));

      const wsDetail = XLSX.utils.json_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Audit Records');

      const fileName = `${fileSlug}_${dateStamp}.xlsx`;
      XLSX.writeFile(wb, fileName);
      logActivity({
        action_type: 'REPORT',
        module_name: 'Admin Monitoring Dashboard',
        activity_description: `Generated Excel (XLSX) report "${reportSummaryAnalytics.reportTitle}" (${reportSummaryAnalytics.totalRecords} records): ${fileName}`,
        record_id: fileName,
        status: 'SUCCESS',
      });
      showToast(`Excel Report downloaded: ${fileName}`);
      return;
    }

    // CSV format
    const metaLines = [
      `"Report Title","${reportSummaryAnalytics.reportTitle}"`,
      `"Report Generation Date (MYT)","${reportSummaryAnalytics.generatedAt}"`,
      `"Generated By","${reportSummaryAnalytics.generatedBy}"`,
      `"Reporting Period","${reportSummaryAnalytics.reportingPeriod}"`,
      `"Total Records","${reportSummaryAnalytics.totalRecords}"`,
      ...reportSummaryAnalytics.highlights.map((h) => `"${h.label}","${h.value}"`),
      '',
    ];

    let csvHeader = '';
    let csvBody: string[] = [];
    if (reportDataset.isIncidentReport) {
      csvHeader = '"Alert ID","Date & Time (MYT)","Severity","Status","User ID","User Name","Module","Title","Description"';
      csvBody = reportDataset.alerts.map((a) =>
        [
          a.alert_id,
          a.malaysia_datetime_display,
          a.severity,
          a.status,
          a.user_id,
          a.user_name,
          a.module_name,
          a.title,
          a.description,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    } else {
      csvHeader =
        '"Log ID","Date & Time (MYT)","User ID","User","Email","Role","Activity","Module","Description","Record ID","Duration (s)","IP Address","Device","Session ID","Status"';
      csvBody = reportDataset.logs.map((l) =>
        [
          l.log_id,
          l.malaysia_datetime_display,
          l.user_id,
          l.user_name,
          l.user_email,
          l.user_role,
          l.action_type,
          l.module_name,
          l.activity_description,
          l.record_id || '-',
          l.duration_seconds ?? '-',
          l.ip_address,
          l.device_info,
          l.session_id,
          l.status,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    }

    const csvPayload = '\uFEFF' + [...metaLines, csvHeader, ...csvBody].join('\n');
    const blob = new Blob([csvPayload], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `${fileSlug}_${dateStamp}.csv`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logActivity({
      action_type: 'REPORT',
      module_name: 'Admin Monitoring Dashboard',
      activity_description: `Generated CSV report "${reportSummaryAnalytics.reportTitle}" (${reportSummaryAnalytics.totalRecords} records): ${fileName}`,
      record_id: fileName,
      status: 'SUCCESS',
    });
    showToast(`CSV Report downloaded: ${fileName}`);
  };

  // RBAC Gate Screen for Viewers or Unauthorized Level IDs
  if (!canAccess) {
    return (
      <div className="max-w-lg mx-auto my-10 bg-white border border-slate-200 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Denied — Unauthorized Module</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {!currentUser
            ? 'Viewers do not have permission to view administrative activity logs. Please log in with an authorized account.'
            : 'Your Level ID account does not currently hold permission to view the Admin Monitoring Dashboard.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab(currentUser ? 'selamatDatang' : 'dashboard')}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {currentUser ? 'Return to Selamat Datang' : 'Return to Dashboard Program'}
          </button>
          {!currentUser && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Log Masuk
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar: Role Scope Metadata & Segmented Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-900">
              {isSuperAdmin ? 'Super Admin Scope (Full System Oversight)' : 'Authorized Scope (Scoped Logs)'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Timezone: Asia/Kuala_Lumpur (MYT)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {scopedLogs.length.toLocaleString()} total logs captured
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            User Activity Log &amp; Admin Monitoring Dashboard
          </h2>
        </div>

        {/* Segmented Sub-Tab Controls */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {(
            [
              { id: 'overview', label: 'Analytics Overview', icon: BarChart3 },
              { id: 'logs', label: 'Recent Activity', icon: List },
              { id: 'profiles', label: 'User Profiles', icon: UserCog },
              {
                id: 'alerts',
                label: `Security Alerts${alertCounts.newCount > 0 ? ` (${alertCounts.newCount})` : ''}`,
                icon: Shield,
              },
              { id: 'reports', label: 'Reports', icon: FileText },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 1: OVERVIEW (7 KPI CARDS + 8 TREND & ANALYTICS CHARTS)      */}
      {/* =================================================================== */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* A. 7 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {[
              {
                label: 'Total Users',
                value: kpiStats.totalUsers,
                sub: `${kpiStats.activeAccountCount} Active · ${kpiStats.disabledAccountCount} Inactive`,
                delta: null,
                icon: Users,
                accent: 'text-slate-700 bg-slate-100',
              },
              {
                label: 'Active Users Today',
                value: kpiStats.activeUsersToday,
                sub: 'Unique authenticated users',
                delta: kpiStats.activeUsersDelta,
                icon: UserCheck,
                accent: 'text-emerald-700 bg-emerald-50',
              },
              {
                label: 'Total Login Sessions Today',
                value: kpiStats.loginsToday,
                sub: 'Successful sign-ins today',
                delta: kpiStats.loginsDelta,
                icon: LogIn,
                accent: 'text-blue-700 bg-blue-50',
              },
              {
                label: 'Failed Login Attempts Today',
                value: kpiStats.failedLoginsToday,
                sub: 'Invalid or blocked logins',
                delta: kpiStats.failedLoginsDelta,
                icon: ShieldAlert,
                accent: 'text-amber-700 bg-amber-50',
              },
              {
                label: 'Total Activities Today',
                value: kpiStats.totalActivitiesToday,
                sub: 'All captured events today',
                delta: kpiStats.totalActivitiesDelta,
                icon: Activity,
                accent: 'text-indigo-700 bg-indigo-50',
              },
              {
                label: 'Suspicious Activities',
                value: kpiStats.suspiciousOpenCount,
                sub: `${kpiStats.suspiciousTodayCount} triggered today`,
                delta: kpiStats.suspiciousDelta,
                icon: AlertTriangle,
                accent: 'text-rose-700 bg-rose-50',
              },
              {
                label: 'Inactive Users (Last 30d)',
                value: kpiStats.inactiveUsersCount,
                sub: 'No login in 30 days or disabled',
                delta: null,
                icon: UserX,
                accent: 'text-slate-700 bg-slate-100',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 leading-tight">
                      {card.label}
                    </span>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${card.accent}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                      {card.value.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{card.sub}</div>
                    {card.delta && (
                      <div
                        className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums font-semibold ${
                          card.delta.direction === 'up'
                            ? 'text-emerald-700'
                            : card.delta.direction === 'down'
                            ? 'text-rose-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {card.delta.direction === 'up' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : card.delta.direction === 'down' ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        <span>{card.delta.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* B. 8 Interactive Activity Trend Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Daily User Login Trends */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Daily User Login Trends</h3>
                  <p className="text-[11px] text-slate-500">Successful logins over the last 14 days (MYT)</p>
                </div>
                <span className="text-xs font-mono tabular-nums font-bold text-blue-700">
                  {analyticsCharts.dailyLoginSeries.reduce((s, d) => s + d.successLogins, 0)} logins
                </span>
              </div>
              <SimpleSvgBarChart
                data={analyticsCharts.dailyLoginSeries.map((d) => ({
                  label: d.shortLabel,
                  value: d.successLogins,
                  tooltip: `${d.date}: ${d.successLogins} logins`,
                }))}
                barColor="#2563eb"
              />
            </div>

            {/* Chart 2: User Activity Trends (Daily / Weekly / Monthly Switcher) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. User Activity Trends</h3>
                  <p className="text-[11px] text-slate-500">
                    All recorded user activities grouped by {trendGranularity.toLowerCase()} window
                  </p>
                </div>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  {(['Daily', 'Weekly', 'Monthly'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTrendGranularity(g)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        trendGranularity === g
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <SimpleSvgBarChart
                data={analyticsCharts.activityTrendSeries.map((d) => ({
                  label: d.label,
                  value: d.count,
                  tooltip: `${d.label}: ${d.count} activities`,
                }))}
                barColor="#0f172a"
              />
            </div>

            {/* Chart 3: Successful vs Failed Login Attempts */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Successful vs Failed Login Attempts
                  </h3>
                  <p className="text-[11px] text-slate-500">10-day authentication outcome comparison</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                    Success
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
                    Failed / Blocked
                  </span>
                </div>
              </div>
              <DualBarChart data={analyticsCharts.dailyLoginSeries.slice(-10)} />
            </div>

            {/* Chart 4: Activities by User Role */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">4. Activities by User Role</h3>
                  <p className="text-[11px] text-slate-500">Activity volume segmented by Level ID / Role</p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {analyticsCharts.byRole.length} roles
                </span>
              </div>
              <HorizontalRankedBars
                items={analyticsCharts.byRole.slice(0, 8).map((r, i) => ({
                  label: r.role,
                  value: r.count,
                  color: CHART_PALETTE[i % CHART_PALETTE.length],
                }))}
                emptyText="No role activity recorded yet."
              />
            </div>

            {/* Chart 5: Activities by Module */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">5. Activities by Module</h3>
                  <p className="text-[11px] text-slate-500">All actions across portal modules</p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {analyticsCharts.byModule.length} modules
                </span>
              </div>
              <HorizontalRankedBars
                items={analyticsCharts.byModule.slice(0, 8).map((m) => ({
                  label: m.moduleName,
                  value: m.count,
                  subValue: m.duration > 0 ? formatDurationCompact(m.duration) : undefined,
                  color: '#0d9488',
                }))}
                emptyText="No module activity recorded yet."
              />
            </div>

            {/* Chart 6: Most Active Users (Clickable -> Profile) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">6. Most Active Users</h3>
                  <p className="text-[11px] text-slate-500">Click any user bar to open User Activity Profile</p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">Top 8</span>
              </div>
              <HorizontalRankedBars
                items={analyticsCharts.topUsers.map((u) => ({
                  label: `${u.user_name} (${u.user_id})`,
                  value: u.count,
                  subValue: `${u.logins} logins`,
                  color: '#4f46e5',
                  onClick: () => {
                    setSelectedProfileUserId(u.user_id);
                    setSubTab('profiles');
                  },
                }))}
                emptyText="No user activity recorded yet."
              />
            </div>

            {/* Chart 7: Most Frequently Accessed Modules */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    7. Most Frequently Accessed Modules
                  </h3>
                  <p className="text-[11px] text-slate-500">Ranked by page navigation count &amp; dwell time</p>
                </div>
              </div>
              <HorizontalRankedBars
                items={analyticsCharts.topAccessedModules.map((m) => ({
                  label: m.moduleName,
                  value: m.visits || m.count,
                  subValue: m.duration > 0 ? `Time: ${formatDurationCompact(m.duration)}` : 'Visits',
                  color: '#d97706',
                }))}
                emptyText="No navigation views recorded yet."
              />
            </div>

            {/* Chart 8: Activity Distribution by Action Type */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    8. Activity Distribution by Action Type
                  </h3>
                  <p className="text-[11px] text-slate-500">Share of authentication, navigation, CRUD, and export events</p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {scopedLogs.length} events
                </span>
              </div>
              <ActionDistributionDonut items={analyticsCharts.byActionType} />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: RECENT USER ACTIVITY TABLE                               */}
      {/* =================================================================== */}
      {subTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Search & Filters Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3 bg-slate-50/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-600" />
                  <span>Recent User Activity Table</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatic real-time capture · Ordered latest first · Click any user to open their Activity Profile
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLogSearch('');
                    setLogRoleFilter('ALL');
                    setLogModuleFilter('ALL');
                    setLogActionFilter('ALL');
                    setLogStatusFilter('ALL');
                    setLogStartDate('');
                    setLogEndDate('');
                    setLogPage(1);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 text-xs">
              <div className="relative xl:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  placeholder="Search user name, email, ID or description..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                />
              </div>

              <select
                value={logRoleFilter}
                onChange={(e) => {
                  setLogRoleFilter(e.target.value);
                  setLogPage(1);
                }}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All Roles</option>
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={logModuleFilter}
                onChange={(e) => {
                  setLogModuleFilter(e.target.value);
                  setLogPage(1);
                }}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All Modules</option>
                {uniqueModules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={logActionFilter}
                onChange={(e) => {
                  setLogActionFilter(e.target.value);
                  setLogPage(1);
                }}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All Activity Types</option>
                {ACTION_TYPE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => {
                  setLogStatusFilter(e.target.value as 'ALL' | ActivityLogStatus);
                  setLogPage(1);
                }}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={logStartDate}
                  onChange={(e) => {
                    setLogStartDate(e.target.value);
                    setLogPage(1);
                  }}
                  title="Start Date"
                  className="w-1/2 px-2 py-2 bg-white border border-slate-300 rounded-lg text-[11px] font-mono"
                />
                <input
                  type="date"
                  value={logEndDate}
                  onChange={(e) => {
                    setLogEndDate(e.target.value);
                    setLogPage(1);
                  }}
                  title="End Date"
                  className="w-1/2 px-2 py-2 bg-white border border-slate-300 rounded-lg text-[11px] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 whitespace-nowrap">Date &amp; Time</th>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 whitespace-nowrap">Activity</th>
                  <th className="py-3 px-3">Module</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      No activity logs match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono tabular-nums text-[11px] text-slate-700 whitespace-nowrap">
                        {log.malaysia_datetime_display}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfileUserId(log.user_id);
                            setSubTab('profiles');
                          }}
                          className="text-left group cursor-pointer"
                          title="Open User Activity Profile"
                        >
                          <div className="font-semibold text-blue-700 group-hover:underline">
                            {log.user_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {log.user_id} {log.user_email && log.user_email !== '-' ? `· ${log.user_email}` : ''}
                          </div>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-700 whitespace-nowrap">
                        {log.user_role}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {log.action_type}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-medium text-slate-800 whitespace-nowrap">
                        {log.module_name}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-700 max-w-md">
                        <span className="line-clamp-2">{log.activity_description}</span>
                        {log.duration_seconds ? (
                          <span className="text-[10px] font-mono text-slate-500 ml-1.5">
                            ({formatDurationCompact(log.duration_seconds)})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                            STATUS_BADGE_CLASS[log.status]
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetail(log)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="View complete activity details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums">
                Showing {filteredLogs.length === 0 ? 0 : (Math.min(logPage, totalLogPages) - 1) * logPageSize + 1}–
                {Math.min(Math.min(logPage, totalLogPages) * logPageSize, filteredLogs.length)} of{' '}
                {filteredLogs.length} records
              </span>
              <select
                value={logPageSize}
                onChange={(e) => {
                  setLogPageSize(Number(e.target.value));
                  setLogPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={logPage <= 1}
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono tabular-nums font-semibold">
                Page {Math.min(logPage, totalLogPages)} / {totalLogPages}
              </span>
              <button
                type="button"
                disabled={logPage >= totalLogPages}
                onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: USER ACTIVITY PROFILE                                    */}
      {/* =================================================================== */}
      {subTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Directory */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">User Directory ({filteredProfileDirectory.length})</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="Filter by name, ID or email..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {filteredProfileDirectory.map((prof) => {
                const isSelected = activeProfile?.user_id === prof.user_id;
                return (
                  <button
                    key={prof.user_id}
                    type="button"
                    onClick={() => {
                      setSelectedProfileUserId(prof.user_id);
                      setShowCompleteHistory(false);
                    }}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{prof.name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          prof.isActive
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-rose-700 bg-rose-50 border-rose-200'
                        }`}
                      >
                        {prof.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span className="font-mono">
                        {prof.user_id} · {prof.role}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-slate-700">
                        {prof.totalActivities} events
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Detailed User Activity Profile */}
          <div className="lg:col-span-8 space-y-5">
            {!activeProfile ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
                Select a user from the directory to view their Activity Profile.
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                  {/* Identity + Super Admin Status Toggle */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-800">{activeProfile.user_id}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeProfile.role}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-bold ${
                            activeProfile.isActive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          Account Status: {activeProfile.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{activeProfile.name}</h3>
                      <p className="text-xs text-slate-600 font-mono">{activeProfile.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReportType('individual_user');
                          setReportUserFilter(activeProfile.user_id);
                          setReportStartDate(getMalaysiaDateOffset(29));
                          setReportEndDate(todayDate);
                          setSubTab('reports');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Generate Audit Report</span>
                      </button>

                      {isSuperAdmin &&
                        activeProfile.isRegistered &&
                        activeProfile.user_id !== 'AMAN' && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = toggleAdminUserActive(activeProfile.user_id);
                              if (res.success) {
                                showToast(
                                  `Account "${activeProfile.user_id}" is now ${
                                    activeProfile.isActive ? 'Inactive' : 'Active'
                                  }.`
                                );
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                              activeProfile.isActive
                                ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>
                              {activeProfile.isActive ? 'Deactivate Account' : 'Activate Account'}
                            </span>
                          </button>
                        )}
                    </div>
                  </div>

                  {/* 4 Key User Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-500">Last Login Date &amp; Time</div>
                      <div className="text-xs font-bold text-slate-900 font-mono tabular-nums mt-1">
                        {activeProfile.lastLoginAt || 'Never logged in'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-500">Total Login Sessions</div>
                      <div className="text-xl font-bold text-blue-700 font-mono tabular-nums mt-0.5">
                        {activeProfile.totalLogins.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-500">Total Activities</div>
                      <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                        {activeProfile.totalActivities.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] font-semibold text-slate-500">Failed Login Attempts</div>
                      <div className="text-xl font-bold text-rose-700 font-mono tabular-nums mt-0.5">
                        {activeProfile.failedLogins.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Modules Frequently Accessed */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                      Modules Frequently Accessed
                    </h4>
                    {activeProfileModules.length === 0 ? (
                      <p className="text-xs text-slate-500">No module access recorded yet.</p>
                    ) : (
                      <HorizontalRankedBars
                        items={activeProfileModules.slice(0, 6).map((m) => ({
                          label: m.moduleName,
                          value: m.count,
                          subValue: m.duration > 0 ? formatDurationCompact(m.duration) : undefined,
                          color: '#0f172a',
                        }))}
                        emptyText="No module usage recorded."
                      />
                    )}
                  </div>
                </div>

                {/* Recent Activities & Full Activity History Timeline */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {showCompleteHistory
                          ? `Complete Activity History (${activeProfile.logs.length})`
                          : `Most Recent Activities & Timeline (Latest 10 of ${activeProfile.logs.length})`}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Chronological Asia/Kuala_Lumpur audit trail
                      </p>
                    </div>
                    {activeProfile.logs.length > 10 && (
                      <button
                        type="button"
                        onClick={() => setShowCompleteHistory((prev) => !prev)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                      >
                        {showCompleteHistory
                          ? 'Show Latest 10'
                          : `View Complete Activity History (${activeProfile.logs.length})`}
                      </button>
                    )}
                  </div>

                  {activeProfile.logs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No recorded activities for this user yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {(showCompleteHistory ? activeProfile.logs : activeProfile.logs.slice(0, 10)).map(
                        (l) => (
                          <div
                            key={l.log_id}
                            className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="font-mono font-bold text-slate-900">{l.action_type}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-blue-700">{l.module_name}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-slate-500">
                                  {l.malaysia_datetime_display}
                                </span>
                                {l.duration_seconds ? (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono text-slate-600">
                                      Duration: {formatDurationCompact(l.duration_seconds)}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-700 mt-1">{l.activity_description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  STATUS_BADGE_CLASS[l.status]
                                }`}
                              >
                                {l.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedLogDetail(l)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                                title="Inspect log metadata"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: SECURITY & ALERT MONITORING                              */}
      {/* =================================================================== */}
      {subTab === 'alerts' && (
        <div className="space-y-5">
          {/* Alert Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Alerts', val: alertCounts.total, cls: 'text-slate-900' },
              { label: 'New Alerts', val: alertCounts.newCount, cls: 'text-rose-700' },
              { label: 'Under Review', val: alertCounts.reviewCount, cls: 'text-amber-700' },
              { label: 'Resolved', val: alertCounts.resolvedCount, cls: 'text-emerald-700' },
              { label: 'Open Critical', val: alertCounts.criticalCount, cls: 'text-rose-800' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
                <div className={`text-2xl font-bold font-mono tabular-nums mt-1 ${s.cls}`}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Alerts Table + Filters */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Security &amp; Suspicious Activity Alerts
                </h3>
                <p className="text-[11px] text-slate-500">
                  Deterministic rule engine (only flags explicit security thresholds, never normal usage)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={alertSearch}
                    onChange={(e) => setAlertSearch(e.target.value)}
                    placeholder="Search alert or user..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <select
                  value={alertSeverityFilter}
                  onChange={(e) => setAlertSeverityFilter(e.target.value as 'ALL' | AlertSeverity)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select
                  value={alertStatusFilter}
                  onChange={(e) => setAlertStatusFilter(e.target.value as 'ALL' | AlertStatus)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 whitespace-nowrap">Timestamp (MYT)</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Rule &amp; Incident Description</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        No security alerts match the current filter. Normal user operations remain clean.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.alert_id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono tabular-nums text-[11px] whitespace-nowrap">
                          {alert.malaysia_datetime_display}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                              SEVERITY_BADGE_CLASS[alert.severity]
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{alert.user_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {alert.user_id} · {alert.module_name}
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-md">
                          <div className="font-bold text-slate-900">{alert.title}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{alert.description}</div>
                          {alert.reviewed_by && (
                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                              Last reviewed by {alert.reviewed_by} at {alert.reviewed_at}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                              ALERT_STATUS_BADGE_CLASS[alert.status]
                            }`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <select
                              value={alert.status}
                              onChange={(e) => {
                                const next = e.target.value as AlertStatus;
                                updateAlertStatus(alert.alert_id, next);
                                showToast(`Alert ${alert.alert_id} updated to "${next}".`);
                              }}
                              className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold cursor-pointer"
                            >
                              <option value="New">New</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setSelectedAlertDetail(alert)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                              title="Inspect related logs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rule Reference Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Active Automated Security Alert Rules
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                {
                  title: 'Consecutive Failed Logins',
                  desc: 'Triggers High (>=3) or Critical (>=5) alert on consecutive failed logins within 15 mins.',
                },
                {
                  title: 'Unusual Login Frequency',
                  desc: 'Triggers Medium alert when a single account initiates >=8 successful sessions within 60 mins.',
                },
                {
                  title: 'Restricted & Unauthorized Access',
                  desc: 'Triggers Medium alert on single restricted block, escalating to Critical on >=3 blocked attempts in 30 mins.',
                },
                {
                  title: 'Privilege & Permission Escalation',
                  desc: 'Triggers High alert on elevated Super Admin grants or administrative deletion actions.',
                },
                {
                  title: 'Bulk Data Deletion / Mass Export',
                  desc: 'Triggers Critical alert on bulk/rapid deletes and High alert on >=5 exports within 5 mins.',
                },
              ].map((rule) => (
                <div key={rule.title} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-900">{rule.title}</div>
                  <p className="text-[11px] text-slate-600 mt-1">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 5: REPORT GENERATION (9 REPORTS × PDF / XLSX / CSV)         */}
      {/* =================================================================== */}
      {subTab === 'reports' && (
        <div className="space-y-5">
          {/* Step 1: Select one of the 9 Official Reports */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Select Audit Report Type (9 Standard Reports)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {REPORT_TYPES.map((rep) => {
                const active = selectedReportType === rep.id;
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => handleSelectReportType(rep.id)}
                    className={`p-3.5 text-left rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      {rep.number}. {rep.title}
                    </div>
                    <div
                      className={`text-[11px] mt-1 ${
                        active ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {rep.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Report Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Report Filters &amp; Export</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reportOrientation}
                  onChange={(e) => setReportOrientation(e.target.value as 'landscape' | 'portrait')}
                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="landscape">PDF: A4 Landscape</option>
                  <option value="portrait">PDF: A4 Portrait</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleDownloadReport('pdf')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel (XLSX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport('csv')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  User
                </label>
                <select
                  value={reportUserFilter}
                  onChange={(e) => setReportUserFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ALL">All Users</option>
                  {userProfiles.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} ({u.user_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Role
                </label>
                <select
                  value={reportRoleFilter}
                  onChange={(e) => setReportRoleFilter(e.target.value)}
                  disabled={reportDataset.isIncidentReport}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs disabled:opacity-50"
                >
                  <option value="ALL">All Roles</option>
                  {uniqueRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Module
                </label>
                <select
                  value={reportModuleFilter}
                  onChange={(e) => setReportModuleFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ALL">All Modules</option>
                  {uniqueModules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Activity Type
                </label>
                <select
                  value={reportActionFilter}
                  onChange={(e) => setReportActionFilter(e.target.value)}
                  disabled={reportDataset.isIncidentReport}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs disabled:opacity-50"
                >
                  <option value="ALL">All Types</option>
                  {ACTION_TYPE_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Status
                </label>
                <select
                  value={reportStatusFilter}
                  onChange={(e) =>
                    setReportStatusFilter(e.target.value as 'ALL' | ActivityLogStatus)
                  }
                  disabled={reportDataset.isIncidentReport}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs disabled:opacity-50"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>

            {/* Required Report Metadata & Summary Analytics Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Report Generation Date (MYT)
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {reportSummaryAnalytics.generatedAt}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Generated By
                  </span>
                  <span className="font-semibold text-slate-900">
                    {reportSummaryAnalytics.generatedBy}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Reporting Period
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {reportSummaryAnalytics.reportingPeriod}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {reportSummaryAnalytics.highlights.map((h) => (
                  <div key={h.label} className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500 font-medium">{h.label}</div>
                    <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5 truncate">
                      {h.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview Table (First 50 Records) */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  {reportDataset.isIncidentReport ? (
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time (MYT)</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">Incident Description</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time (MYT)</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Activity</th>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportSummaryAnalytics.totalRecords === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No records match this report configuration. Try broadening the date range or filters.
                      </td>
                    </tr>
                  ) : reportDataset.isIncidentReport ? (
                    reportDataset.alerts.slice(0, 50).map((a) => (
                      <tr key={a.alert_id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono tabular-nums text-[11px] whitespace-nowrap">
                          {a.malaysia_datetime_display}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SEVERITY_BADGE_CLASS[a.severity]}`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ALERT_STATUS_BADGE_CLASS[a.status]}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold">{a.user_name} ({a.user_id})</td>
                        <td className="py-2 px-3">{a.module_name}</td>
                        <td className="py-2 px-3 text-slate-700">{a.title}: {a.description}</td>
                      </tr>
                    ))
                  ) : (
                    reportDataset.logs.slice(0, 50).map((l) => (
                      <tr key={l.log_id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono tabular-nums text-[11px] whitespace-nowrap">
                          {l.malaysia_datetime_display}
                        </td>
                        <td className="py-2 px-3 font-semibold">{l.user_name} ({l.user_id})</td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">{l.user_role}</td>
                        <td className="py-2 px-3 font-mono text-[11px] font-bold">{l.action_type}</td>
                        <td className="py-2 px-3">{l.module_name}</td>
                        <td className="py-2 px-3 text-slate-700">{l.activity_description}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE_CLASS[l.status]}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: COMPLETE ACTIVITY LOG DETAILS                                */}
      {/* =================================================================== */}
      {selectedLogDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedLogDetail(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase">Activity Log Audit Record</span>
                <h4 className="text-sm font-bold font-mono">{selectedLogDetail.log_id}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 text-slate-300 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ['Date & Time (MYT)', selectedLogDetail.malaysia_datetime_display],
                ['ISO Timestamp', selectedLogDetail.timestamp],
                ['User ID', selectedLogDetail.user_id],
                ['User Name', selectedLogDetail.user_name],
                ['User Email', selectedLogDetail.user_email],
                ['Assigned Role', selectedLogDetail.user_role],
                ['Action Type', selectedLogDetail.action_type],
                ['Module Name', selectedLogDetail.module_name],
                ['Record ID', selectedLogDetail.record_id || '-'],
                ['Duration Spent', formatDurationCompact(selectedLogDetail.duration_seconds)],
                ['Session ID', selectedLogDetail.session_id],
                ['IP Address', selectedLogDetail.ip_address],
                ['Device / Browser', selectedLogDetail.device_info],
                ['Status', selectedLogDetail.status],
              ].map(([k, v]) => (
                <div key={k} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-slate-500">{k}</div>
                  <div className="font-mono text-slate-900 font-semibold mt-0.5 break-all">{v}</div>
                </div>
              ))}
              <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-bold uppercase text-slate-500">Activity Description</div>
                <div className="text-slate-900 mt-1 leading-relaxed">
                  {selectedLogDetail.activity_description}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedProfileUserId(selectedLogDetail.user_id);
                  setSelectedLogDetail(null);
                  setSubTab('profiles');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
              >
                Open User Activity Profile
              </button>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: SECURITY ALERT DETAILS                                       */}
      {/* =================================================================== */}
      {selectedAlertDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedAlertDetail(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase">
                  Security Incident Inspection
                </span>
                <h4 className="text-sm font-bold">{selectedAlertDetail.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlertDetail(null)}
                className="p-1 text-slate-300 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${SEVERITY_BADGE_CLASS[selectedAlertDetail.severity]}`}>
                  {selectedAlertDetail.severity}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${ALERT_STATUS_BADGE_CLASS[selectedAlertDetail.status]}`}>
                  {selectedAlertDetail.status}
                </span>
                <span className="font-mono text-slate-500">
                  {selectedAlertDetail.malaysia_datetime_display}
                </span>
              </div>
              <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedAlertDetail.description}
              </p>
              <div>
                <h5 className="text-[11px] font-bold uppercase text-slate-500 mb-2">
                  Related Activity Logs ({selectedAlertDetail.related_log_ids.length})
                </h5>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {activityLogs
                    .filter((l) => selectedAlertDetail.related_log_ids.includes(l.log_id))
                    .map((rl) => (
                      <div key={rl.log_id} className="p-2.5 border border-slate-200 rounded-lg text-[11px]">
                        <div className="font-mono font-bold text-slate-900">
                          {rl.malaysia_datetime_display} · {rl.action_type} · {rl.status}
                        </div>
                        <div className="text-slate-600 mt-0.5">{rl.activity_description}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAlertDetail(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// LIGHTWEIGHT RESPONSIVE SVG & HTML DATA VISUALIZATION COMPONENTS
// ---------------------------------------------------------------------------

const SimpleSvgBarChart: React.FC<{
  data: Array<{ label: string; value: number; tooltip: string }>;
  barColor: string;
}> = ({ data, barColor }) => {
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="w-full">
      <div className="h-44 flex items-end gap-1.5 pt-4 border-b border-slate-200">
        {data.map((item) => {
          const heightPct = item.value > 0 ? Math.max(6, Math.round((item.value / maxVal) * 100)) : 2;
          return (
            <div
              key={item.label}
              title={item.tooltip}
              className="flex-1 flex flex-col items-center justify-end h-full group"
            >
              <span className="text-[10px] font-mono tabular-nums text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.value}
              </span>
              <div
                className="w-full max-w-[28px] rounded-t transition-all duration-200"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: item.value > 0 ? barColor : '#e2e8f0',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex-1 text-center text-[10px] font-mono tabular-nums text-slate-500 truncate"
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const DualBarChart: React.FC<{
  data: Array<{ date: string; shortLabel: string; successLogins: number; failedLogins: number }>;
}> = ({ data }) => {
  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.successLogins, d.failedLogins)));
  return (
    <div className="w-full">
      <div className="h-44 flex items-end gap-2 pt-4 border-b border-slate-200">
        {data.map((d) => {
          const okPct =
            d.successLogins > 0 ? Math.max(6, Math.round((d.successLogins / maxVal) * 100)) : 2;
          const failPct =
            d.failedLogins > 0 ? Math.max(6, Math.round((d.failedLogins / maxVal) * 100)) : 2;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.successLogins} Success, ${d.failedLogins} Failed`}
              className="flex-1 flex items-end justify-center gap-1 h-full"
            >
              <div
                className="w-2.5 sm:w-3 rounded-t"
                style={{
                  height: `${okPct}%`,
                  backgroundColor: d.successLogins > 0 ? '#059669' : '#e2e8f0',
                }}
              />
              <div
                className="w-2.5 sm:w-3 rounded-t"
                style={{
                  height: `${failPct}%`,
                  backgroundColor: d.failedLogins > 0 ? '#dc2626' : '#f1f5f9',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 text-center text-[10px] font-mono tabular-nums text-slate-500 truncate"
          >
            {d.shortLabel}
          </div>
        ))}
      </div>
    </div>
  );
};

const HorizontalRankedBars: React.FC<{
  items: Array<{
    label: string;
    value: number;
    subValue?: string;
    color: string;
    onClick?: () => void;
  }>;
  emptyText: string;
}> = ({ items, emptyText }) => {
  if (items.length === 0) {
    return <p className="text-xs text-slate-500 py-8 text-center">{emptyText}</p>;
  }
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
        return (
          <div
            key={item.label}
            onClick={item.onClick}
            className={item.onClick ? 'cursor-pointer group' : ''}
          >
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span
                className={`font-medium text-slate-800 truncate ${
                  item.onClick ? 'group-hover:text-blue-700 group-hover:underline' : ''
                }`}
              >
                {item.label}
              </span>
              <span className="font-mono tabular-nums text-[11px] font-bold text-slate-700 shrink-0">
                {item.value.toLocaleString()}
                {item.subValue ? (
                  <span className="font-normal text-slate-500 ml-1.5">({item.subValue})</span>
                ) : null}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ActionDistributionDonut: React.FC<{
  items: Array<{ action: string; count: number }>;
}> = ({ items }) => {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) {
    return <p className="text-xs text-slate-500 py-8 text-center">No activity events recorded yet.</p>;
  }

  const topItems = items.slice(0, 7);
  const otherCount = items.slice(7).reduce((s, i) => s + i.count, 0);
  const chartItems = otherCount > 0 ? [...topItems, { action: 'OTHER', count: otherCount }] : topItems;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          {chartItems.map((item, idx) => {
            const frac = item.count / total;
            const dash = frac * circumference;
            const offset = -cumulative * circumference;
            cumulative += frac;
            return (
              <circle
                key={item.action}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Events</span>
        </div>
      </div>

      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        {chartItems.map((item, idx) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div
              key={item.action}
              className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                />
                <span className="font-mono text-[11px] font-semibold text-slate-800 truncate">
                  {item.action}
                </span>
              </div>
              <span className="font-mono tabular-nums text-[11px] text-slate-600 ml-2 shrink-0">
                {item.count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
