interface LifecycleEvent {
  params: {
    data?: Record<string, unknown>;
  };
}

function syncLegacyApproval(event: LifecycleEvent): void {
  const data = event.params.data;
  if (!data || typeof data['estado'] !== 'string') return;
  data['aprovada'] = data['estado'] === 'verified';
}

export default {
  beforeCreate: syncLegacyApproval,
  beforeUpdate: syncLegacyApproval,
};
