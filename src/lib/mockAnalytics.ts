// Mock Analytics Service

interface AnalyticsEvent {
  eventName: string;
  eventData?: Record<string, any>;
  timestamp?: Date;
}

let isInitialized = false;

const MockAnalytics = {
  init: (config?: { apiKey?: string }) => {
    if (isInitialized) {
      console.warn("MockAnalytics already initialized.");
      return;
    }
    console.log("MockAnalytics: Initializing with config:", config || "No config");
    isInitialized = true;
    // In a real scenario, this might load an external script or setup listeners.
  },

  track: (eventName: string, eventData?: Record<string, any>) => {
    if (!isInitialized) {
      console.warn("MockAnalytics: Not initialized. Call init() first.");
      return;
    }
    const event: AnalyticsEvent = {
      eventName,
      eventData,
      timestamp: new Date(),
    };
    console.log("MockAnalytics: Tracking event:", event);
    // Here, it would typically send data to an analytics backend.
  },

  pageView: (pagePath: string) => {
    if (!isInitialized) {
      console.warn("MockAnalytics: Not initialized. Call init() first.");
      return;
    }
    MockAnalytics.track("page_view", { path: pagePath });
  },
  
  isLoaded: () => isInitialized,

  reset: () => { // For testing purposes or if consent is revoked
    isInitialized = false;
    console.log("MockAnalytics: Reset.");
  }
};

export default MockAnalytics;
