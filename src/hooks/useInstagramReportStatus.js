/**
 * useInstagramReportStatus
 *
 * Answers the dashboard's main question: "which of my clients still need an
 * Instagram report this month?"
 *
 * Scoped exactly like InstagramReportsPage:
 *  - admins / system admins see all clients + all reports
 *  - everyone else sees clients assigned to them, plus reports for those clients
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { useClients } from '../contexts/ClientsContext';
import { supabaseService } from '../services/supabaseService';
import {
  collectClientReportLinkIds,
  computeMonthlyReportStatus,
  isClientStatusArchived,
} from '../utils/instagramReportStatus';

export function useInstagramReportStatus() {
  const { currentUser, isViewingAs } = useAuth();
  const { isSystemAdmin, loading: permissionsLoading } = usePermissions();
  const { clients, loading: clientsLoading } = useClients();

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  const effectiveIsAdmin = isSystemAdmin || currentUser?.role === 'admin';

  /** Active, non-internal clients this user is responsible for reporting on. */
  const myClients = useMemo(() => {
    const email = (currentUser?.email || '').trim().toLowerCase();
    const uid = (currentUser?.uid || '').trim().toLowerCase();
    return (clients || [])
      .filter((c) => !c.isInternal && !isClientStatusArchived(c))
      .filter((c) => {
        if (effectiveIsAdmin) return true;
        const am = (c.assignedManager || '').trim().toLowerCase();
        if (!am) return false;
        return am === email || (uid && am === uid);
      });
  }, [clients, currentUser?.email, currentUser?.uid, effectiveIsAdmin]);

  /** Client ids to widen the reports query with (UUID + migrated Firestore ids). */
  const assignedReportClientIds = useMemo(() => {
    if (effectiveIsAdmin) return [];
    const s = new Set();
    myClients.forEach((c) => collectClientReportLinkIds(c).forEach((id) => s.add(id)));
    return [...s];
  }, [myClients, effectiveIsAdmin]);

  const assignedReportClientIdsKey = assignedReportClientIds.join(',');

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || permissionsLoading) {
      if (!uid) { setReports([]); setReportsLoading(false); }
      return () => {};
    }
    const unsubscribe = supabaseService.onInstagramReportsChange((data) => {
      setReports(data || []);
      setReportsLoading(false);
    }, {
      loadAll: effectiveIsAdmin,
      userId: isViewingAs ? currentUser?.uid : undefined,
      clientIds: assignedReportClientIds,
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, effectiveIsAdmin, isViewingAs, permissionsLoading, assignedReportClientIdsKey]);

  const status = useMemo(
    () => computeMonthlyReportStatus(myClients, reports),
    [myClients, reports]
  );

  return {
    ...status,
    clients: myClients,
    reports,
    isAdmin: effectiveIsAdmin,
    loading: clientsLoading || reportsLoading || permissionsLoading,
  };
}

export default useInstagramReportStatus;
