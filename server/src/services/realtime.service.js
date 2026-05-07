let latestHealth = null;
const incidentQueue = [];

const MAX_INCIDENT_QUEUE = 500;

export const setLatestHealth = (snapshot) => {
  latestHealth = {
    ...snapshot,
    timestamp: snapshot?.timestamp || new Date().toISOString(),
  };
};

export const getLatestHealth = () => latestHealth;

export const pushIncidentEvent = (incident) => {
  incidentQueue.push({
    ...incident,
    createdAt: incident.createdAt || new Date().toISOString(),
  });

  if (incidentQueue.length > MAX_INCIDENT_QUEUE) {
    incidentQueue.splice(0, incidentQueue.length - MAX_INCIDENT_QUEUE);
  }
};

export const getIncidentEventsSince = (since) => {
  if (!since) {
    return incidentQueue.slice(-50);
  }

  const sinceDate = since instanceof Date ? since : new Date(since);
  if (Number.isNaN(sinceDate.getTime())) {
    return incidentQueue.slice(-50);
  }

  return incidentQueue.filter((event) => new Date(event.createdAt) > sinceDate);
};
