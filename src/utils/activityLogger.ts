import {
  AlertSeverity,
  SecurityAlert,
  UserActivityLog,
} from '../types/program';

const MY_TIMEZONE = 'Asia/Kuala_Lumpur';

export function getMalaysiaTimestampParts(date: Date = new Date()): {
  timestamp: string;
  malaysia_date: string;
  malaysia_datetime_display: string;
} {
  try {
    const partsFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: MY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = partsFormatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const yyyy = get('year');
    const mm = get('month');
    const dd = get('day');
    const hh = get('hour') === '24' ? '00' : get('hour');
    const min = get('minute');
    const ss = get('second');

    const displayFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: MY_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    return {
      timestamp: `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+08:00`,
      malaysia_date: `${yyyy}-${mm}-${dd}`,
      malaysia_datetime_display: displayFormatter.format(date),
    };
  } catch {
    const iso = date.toISOString();
    return {
      timestamp: iso,
      malaysia_date: iso.slice(0, 10),
      malaysia_datetime_display: iso.replace('T', ' ').slice(0, 19),
    };
  }
}

export function getMalaysiaDateOffset(daysAgo: number): string {
  const target = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return getMalaysiaTimestampParts(target).malaysia_date;
}

export function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Unknown Client';
  const ua = navigator.userAgent || '';

  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';

  let os = 'Desktop';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Mobile';
  else if (/Android/i.test(ua)) os = 'Android Mobile';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} · ${os}`;
}

export function generateSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SES-${Date.now()}-${rand}`;
}

export function generateLogId(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LOG-${Date.now()}-${rand}`;
}

export function resolveModuleLabel(tabId: string): string {
  switch (tabId) {
    case 'welcome':
      return 'Laman Utama';
    case 'selamatDatang':
      return 'Selamat Datang';
    case 'dashboard':
      return 'Dashboard Program';
    case 'bersepadu':
      return 'Dashboard Bersepadu';
    case 'perincian':
      return 'Perincian Program';
    case 'analisisPegawai':
      return 'Analisis Pegawai Mengikut Program';
    case 'iabAll':
      return 'Page IAB All';
    case 'klusterProfesional':
      return 'Kluster Khidmat Profesional';
    case 'klusterLatihan':
      return 'Kluster Khidmat Latihan';
    case 'pusat':
      return 'Page Pusat';
    case 'jabatan':
      return 'Page Jabatan';
    case 'pegawai':
      return 'Page Pegawai';
    case 'pengiraan':
      return 'Pengiraan Bajet';
    case 'peruntukan':
      return 'Peruntukan';
    case 'perbelanjaan':
      return 'Perbelanjaan';
    case 'subwaran':
      return 'Subwaran';
    case 'baki':
      return 'Baki Peruntukan';
    case 'admin':
      return 'Portal Admin';
    case 'monitoring':
      return 'Admin Monitoring Dashboard';
    default:
      return tabId || 'Sistem';
  }
}

export function formatDurationCompact(seconds?: number): string {
  if (!seconds || seconds <= 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Deterministic rule-based suspicious activity detector.
 * Only triggers when explicit threshold rules are met (never classifies normal behavior as suspicious).
 */
export function evaluateSecurityAlertRules(
  newLog: UserActivityLog,
  allLogs: UserActivityLog[],
  existingAlerts: SecurityAlert[]
): SecurityAlert | null {
  const newTimeMs = new Date(newLog.timestamp).getTime() || Date.now();
  const min15AgoMs = newTimeMs - 15 * 60 * 1000;
  const min30AgoMs = newTimeMs - 30 * 60 * 1000;
  const min60AgoMs = newTimeMs - 60 * 60 * 1000;
  const min5AgoMs = newTimeMs - 5 * 60 * 1000;

  const userLogs = [newLog, ...allLogs].filter(
    (l) => l.user_id.toUpperCase() === newLog.user_id.toUpperCase()
  );

  const buildAlert = (
    ruleCode: string,
    title: string,
    description: string,
    severity: AlertSeverity,
    triggerCount: number,
    relatedLogs: UserActivityLog[]
  ): SecurityAlert => {
    const { timestamp, malaysia_datetime_display } = getMalaysiaTimestampParts();
    return {
      alert_id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      rule_code: ruleCode,
      title,
      description,
      severity,
      status: 'New',
      user_id: newLog.user_id,
      user_name: newLog.user_name,
      module_name: newLog.module_name,
      trigger_count: triggerCount,
      related_log_ids: relatedLogs.slice(0, 10).map((l) => l.log_id),
      timestamp,
      malaysia_datetime_display,
    };
  };

  // Avoid creating duplicate unresolved alert for the exact same rule + user within 10 minutes
  const hasRecentOpenAlert = (ruleCode: string) =>
    existingAlerts.some(
      (a) =>
        a.rule_code === ruleCode &&
        a.user_id.toUpperCase() === newLog.user_id.toUpperCase() &&
        a.status !== 'Resolved' &&
        Math.abs(newTimeMs - (new Date(a.timestamp).getTime() || 0)) < 10 * 60 * 1000
    );

  // Rule 1: Multiple consecutive failed login attempts (>= 3 in 15 mins)
  if (newLog.action_type === 'FAILED_LOGIN') {
    const consecutiveFails: UserActivityLog[] = [];
    for (const l of userLogs) {
      const t = new Date(l.timestamp).getTime() || 0;
      if (t < min15AgoMs) break;
      if (l.action_type === 'LOGIN' && l.status === 'SUCCESS') break;
      if (l.action_type === 'FAILED_LOGIN') consecutiveFails.push(l);
    }
    if (consecutiveFails.length >= 3 && !hasRecentOpenAlert('RULE_CONSECUTIVE_FAILED_LOGIN')) {
      const severity: AlertSeverity = consecutiveFails.length >= 5 ? 'Critical' : 'High';
      return buildAlert(
        'RULE_CONSECUTIVE_FAILED_LOGIN',
        'Multiple Consecutive Failed Login Attempts',
        `${consecutiveFails.length} consecutive failed login attempts detected for user ID "${newLog.user_id}" within 15 minutes.`,
        severity,
        consecutiveFails.length,
        consecutiveFails
      );
    }
  }

  // Rule 2: Unusual login frequency (>= 8 logins in 60 mins)
  if (newLog.action_type === 'LOGIN' && newLog.status === 'SUCCESS') {
    const recentLogins = userLogs.filter(
      (l) =>
        l.action_type === 'LOGIN' &&
        l.status === 'SUCCESS' &&
        (new Date(l.timestamp).getTime() || 0) >= min60AgoMs
    );
    if (recentLogins.length >= 8 && !hasRecentOpenAlert('RULE_UNUSUAL_LOGIN_FREQ')) {
      return buildAlert(
        'RULE_UNUSUAL_LOGIN_FREQ',
        'Unusual Login Frequency Detected',
        `User "${newLog.user_name}" (${newLog.user_id}) recorded ${recentLogins.length} login sessions within 60 minutes.`,
        'Medium',
        recentLogins.length,
        recentLogins
      );
    }
  }

  // Rule 3: Restricted module / repeated unauthorized access attempts
  if (newLog.status === 'BLOCKED' || newLog.action_type === 'UNAUTHORIZED_ACCESS') {
    const recentBlocked = userLogs.filter(
      (l) =>
        (l.status === 'BLOCKED' || l.action_type === 'UNAUTHORIZED_ACCESS') &&
        (new Date(l.timestamp).getTime() || 0) >= min30AgoMs
    );
    if (recentBlocked.length >= 3 && !hasRecentOpenAlert('RULE_REPEATED_UNAUTHORIZED')) {
      return buildAlert(
        'RULE_REPEATED_UNAUTHORIZED',
        'Repeated Unauthorized Access Attempts',
        `${recentBlocked.length} blocked/unauthorized access attempts detected for "${newLog.user_name}" (${newLog.user_id}) in the last 30 minutes.`,
        'Critical',
        recentBlocked.length,
        recentBlocked
      );
    }
    if (!hasRecentOpenAlert('RULE_RESTRICTED_ACCESS')) {
      return buildAlert(
        'RULE_RESTRICTED_ACCESS',
        'Access Attempt to Restricted Module',
        `Restricted access blocked in "${newLog.module_name}" for "${newLog.user_name}" (${newLog.user_id}): ${newLog.activity_description}`,
        'Medium',
        1,
        [newLog]
      );
    }
  }

  // Rule 4: Unusual account permission escalation
  if (
    newLog.action_type === 'ADMIN_ACTION' &&
    /SUPER_ADMIN|SEMUA JABATAN.*edit|kebenaran tinggi|delete/i.test(newLog.activity_description) &&
    !hasRecentOpenAlert('RULE_PERMISSION_ESCALATION')
  ) {
    return buildAlert(
      'RULE_PERMISSION_ESCALATION',
      'Elevated Account Permission or User Change',
      `Administrative privilege/account update recorded: ${newLog.activity_description}`,
      'High',
      1,
      [newLog]
    );
  }

  // Rule 5: Unexpected bulk deletion or rapid mass exports
  if (newLog.action_type === 'DELETE' && newLog.status === 'SUCCESS') {
    const isBulkDesc = /padam.*(\d{2,}|[5-9])\s+program|SEMUA/i.test(newLog.activity_description);
    const recentDeletes = userLogs.filter(
      (l) =>
        l.action_type === 'DELETE' &&
        l.status === 'SUCCESS' &&
        (new Date(l.timestamp).getTime() || 0) >= min5AgoMs
    );
    if ((isBulkDesc || recentDeletes.length >= 3) && !hasRecentOpenAlert('RULE_BULK_DELETE')) {
      return buildAlert(
        'RULE_BULK_DELETE',
        'Unexpected Bulk Data Deletion',
        `Bulk or rapid deletion activity detected by "${newLog.user_name}": ${newLog.activity_description}`,
        'Critical',
        recentDeletes.length,
        recentDeletes
      );
    }
  }

  if (
    (newLog.action_type === 'EXPORT' || newLog.action_type === 'DOWNLOAD') &&
    newLog.status === 'SUCCESS'
  ) {
    const recentExports = userLogs.filter(
      (l) =>
        (l.action_type === 'EXPORT' || l.action_type === 'DOWNLOAD') &&
        (new Date(l.timestamp).getTime() || 0) >= min5AgoMs
    );
    if (recentExports.length >= 5 && !hasRecentOpenAlert('RULE_MASS_EXPORT')) {
      return buildAlert(
        'RULE_MASS_EXPORT',
        'High-Volume Data Export Activity',
        `${recentExports.length} file export/download operations executed by "${newLog.user_name}" within 5 minutes.`,
        'High',
        recentExports.length,
        recentExports
      );
    }
  }

  return null;
}
