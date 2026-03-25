const WINDOW_SIZE = 500;

const state = {
  requests: 0,
  latenciesMs: [],
};

export const recordLatency = (latencyMs) => {
  if (typeof latencyMs !== "number" || Number.isNaN(latencyMs)) {
    return;
  }

  state.requests += 1;
  state.latenciesMs.push(latencyMs);
  if (state.latenciesMs.length > WINDOW_SIZE) {
    state.latenciesMs.shift();
  }
};

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
};

export const getApiMetricsSnapshot = () => {
  const latencies = state.latenciesMs;
  const avgLatencyMs =
    latencies.length === 0
      ? 0
      : Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2));

  return {
    totalRequestsObserved: state.requests,
    sampleSize: latencies.length,
    avgLatencyMs,
    p95LatencyMs: percentile(latencies, 95),
  };
};
