export default function StatusBadge({ status }) {
  const map = {
    'Pending':            'badge-pending',
    'Approved':           'badge-approved',
    'Rejected':           'badge-rejected',
    'For Resubmission':   'badge-resubmission',
    'Resubmitted':        'badge-resubmitted',
    'Claimed':            'badge-claimed',
    'Not Yet Claimed':    'badge-not-claimed',
  };
  return (
    <span className={`badge ${map[status] || 'badge-pending'}`}>
      {status || '—'}
    </span>
  );
}
