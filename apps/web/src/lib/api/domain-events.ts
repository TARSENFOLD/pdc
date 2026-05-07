import { http } from './http';

export interface DomainEventImpactSummary {
  totalHooks: number;
  success: number;
  skipped: number;
  errors: number;
  processed: boolean;
}

export interface MyImpactResponse {
  eventId: string;
  name: string;
  impact: DomainEventImpactSummary;
}

export const domainEventsApi = {
  getMyImpact: (eventId: string) =>
    http.get<MyImpactResponse>(`/domain-events/${encodeURIComponent(eventId)}/my-impact`),
};
