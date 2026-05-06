export type MetricDef = { id: string; label: string; dir?: 'up' | 'down' }
export type DeptDef = { label: string; color: string; metrics: MetricDef[] }
export type AdvocateDef = { name: string; initials: string }

export const ADV_DEPTS: Record<string, DeptDef & { advocates: AdvocateDef[] }> = {
  cgm: {
    label: 'CGM Advocates', color: '#185FA5',
    metrics: [
      { id: 'cgm_newnotes',    label: 'New Notes' },
      { id: 'cgm_portal',      label: 'Portal Updates' },
      { id: 'cgm_leads',       label: 'New Patient Leads',              dir: 'up' },
      { id: 'cgm_missing',     label: 'Missing Info' },
      { id: 'cgm_coverage',    label: 'Coverage Pending Approval' },
      { id: 'cgm_unfilled',    label: 'Unfilled Orders' },
      { id: 'cgm_tasks',       label: 'Tasks' },
      { id: 'cgm_denied',      label: 'Denied/Cancelled/Hold RX' },
      { id: 'cgm_incomplete',  label: 'Incomplete RX' },
      { id: 'cgm_priorauth',   label: 'Prior Auth/Medical Records' },
      { id: 'cgm_hospice',     label: 'CGM Reason: Hospice/SNF' },
      { id: 'cgm_status',      label: 'Status Changes' },
      { id: 'cgm_ship',        label: 'Scheduled to Ship — Attention Needed' },
      { id: 'cgm_missedship',   label: 'Missed Shipments' },
    ],
    advocates: [
      { name: 'America',  initials: 'AM' },
      { name: 'Jonathan', initials: 'JO' },
      { name: 'Daniel',   initials: 'DA' },
    ],
  },
  shoe: {
    label: 'Shoe Tech Advocates', color: '#0F6E56',
    metrics: [
      { id: 'shoe_welcome',         label: 'Welcome Calls',             dir: 'up' },
      { id: 'shoe_onhold',          label: 'On Hold',                   dir: 'down' },
      { id: 'shoe_measurements',    label: 'Need Measurements (Virtual)' },
      { id: 'shoe_surveydone',      label: 'Shoe Survey Completed',     dir: 'up' },
      { id: 'shoe_surveyneed',      label: 'Shoe Survey Needed' },
      { id: 'shoe_voicemail',       label: 'Voicemails' },
      { id: 'shoe_missinginoffice', label: 'Missing Info In-Office' },
      { id: 'shoe_mbireport',       label: 'MBI Report' },
    ],
    advocates: [
      { name: 'Gisel',    initials: 'GI' },
      { name: 'Grace',    initials: 'GR' },
      { name: 'Raphaela', initials: 'RA' },
    ],
  },
  chase: {
    label: 'Chase Advocates', color: '#854F0B',
    metrics: [
      { id: 'chase_cmnpfp',    label: 'Unfilled CMN PFP' },
      { id: 'chase_cmn',       label: 'Unfilled CMN' },
      { id: 'chase_revision',  label: 'Revision' },
      { id: 'chase_rxnopfp',   label: 'Unfilled RX (No PFP)' },
      { id: 'chase_do_shoes',  label: 'Unfilled DO — Diabetic Shoes' },
      { id: 'chase_do_cgm',    label: 'Unfilled DO — CGM' },
      { id: 'chase_do_compression', label: 'Unfilled DO — Leg Compression' },
      { id: 'chase_priorauth', label: 'Prior Auth Medical Records' },
      { id: 'chase_snfhospice',    label: 'SNF/Hospice Follow-up' },
      { id: 'chase_pendingcgmrx', label: 'CGM - Pending Completed RX' },
    ],
    advocates: [
      { name: 'Julie',  initials: 'JU' },
      { name: 'Angela', initials: 'AN' },
      { name: 'Maria',  initials: 'MA' },
      { name: 'April',  initials: 'AP' },
    ],
  },
}

export const FITTER_DEPTS: Record<string, DeptDef> = {
  pfp: {
    label: 'PFP Manager', color: '#534AB7',
    metrics: [
      { id: 'pfp_awaitinginsurance', label: 'Awaiting Insurance Verification' },
      { id: 'pfp_missingpatient',    label: 'Missing Patient Information' },
      { id: 'pfp_processingshoe',    label: 'Processing Shoe Order' },
      { id: 'pfp_orderchase',        label: 'Order Chase Process' },
      { id: 'pfp_needfitting',       label: 'Need Fitting Appointment' },
      { id: 'pfp_shoesready',        label: 'Shoes Ready To Be Ordered' },
      { id: 'pfp_backorders',        label: 'Backorders' },
      { id: 'pfp_confirmarrival',    label: 'Confirm Arrival' },
      { id: 'pfp_needdispensing',    label: 'Need Dispensing' },
      { id: 'pfp_expiredorders',     label: 'Expired Orders' },
      { id: 'pfp_deniedcmns',        label: 'Denied CMNs' },
      { id: 'pfp_shoesnotcovered',   label: 'Shoes Not Covered' },
      { id: 'pfp_pendingrevision',   label: 'Pending Completed Revisions' },
      { id: 'pfp_expiringorders',    label: 'Expiring Orders (30 Days or less)' },
      { id: 'pfp_expiredorders2',    label: 'Expired Orders (Overview)' },
      { id: 'pfp_statusnot15',       label: 'Status Not Updated 15+ Days' },
      { id: 'pfp_statusnot30',       label: 'Status Not Updated 30+ Days' },
    ],
  },
  fitter: {
    label: 'Fitter Manager', color: '#993C1D',
    metrics: [
      { id: 'fit_confirmfitter',       label: 'Confirm Fitter Notes' },
      { id: 'fit_fitterdeclined',      label: 'Fitter Declined (Reports)' },
      { id: 'fit_unablecontact',       label: 'Unable to Contact (Reports)' },
      { id: 'fit_declinedscans',       label: 'Declined Scans (Reports)' },
      { id: 'fit_vacationmode',        label: 'Vacation Mode' },
      { id: 'fit_dash_unablecontact',  label: 'Unable To Contact (Dashboard)' },
      { id: 'fit_dash_fitterdeclined', label: 'Fitter Declined (Dashboard)' },
      { id: 'fit_unassigned',          label: 'Unassigned Patients' },
      { id: 'fit_needfitting',         label: 'Need Fitting Appointment' },
      { id: 'fit_awaitinginsurance',   label: 'Awaiting Insurance Verification' },
      { id: 'fit_shoesready',          label: 'Shoes Ready To Be Ordered' },
      { id: 'fit_realtimeorder',       label: 'Real Time Order Status' },
      { id: 'fit_confirmarrival',      label: 'Confirm Arrival' },
      { id: 'fit_needdispensing',      label: 'Need Dispensing' },
      { id: 'fit_backorders',          label: 'Backorders' },
      { id: 'fit_pendingreturns',      label: 'Pending Returns' },
      { id: 'fit_pendingcompletedrx',  label: 'Pending Completed Rx' },
      { id: 'fit_fitterawaiting',      label: 'Fitter Awaiting Payment' },
      { id: 'fit_needdispensingret',   label: 'Need Dispensing After Returns' },
      { id: 'fit_awaitingpriorauth',   label: 'Awaiting Prior Authorization Approval' },
      { id: 'fit_pendingrevision',     label: 'Pending Completed Revision' },
      { id: 'fit_dosnofitter',         label: "DO's With No Fitter" },
      { id: 'fit_expiringorders',      label: 'Expiring Orders (30 Days or less)' },
      { id: 'fit_expiredorders',       label: 'Expired Orders' },
      { id: 'fit_statusnot15',         label: 'Status Not Updated 15+ Days' },
      { id: 'fit_statusnot30',         label: 'Status Not Updated 30+ Days' },
      { id: 'fit_deniedscans2',        label: 'Denied Scans (Overview)' },
    ],
  },
}

export const ADV_DEPT_KEYS    = ['cgm', 'shoe', 'chase'] as const
export const FITTER_DEPT_KEYS = ['pfp', 'fitter'] as const
