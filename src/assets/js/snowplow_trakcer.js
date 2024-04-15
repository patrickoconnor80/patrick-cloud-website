snowplow("newTracker", "sp", "snowplow-collector.patrick-cloud.com", {
    appId: "patrick-cloud.com",
    platform: "web",
    eventMethod: "post",
    contexts: {
        webPage: true,
        performanceTiming: true,
        geolocation: true,
        session: true,
        browser: true
    }
});

snowplow('enableActivityTracking',30,10);

// Track Page View, Forms, and links clicked
snowplow('trackPageView');
snowplow('enableFormTracking');
snowplow('enableLinkClickTracking');