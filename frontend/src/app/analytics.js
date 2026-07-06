import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (POSTHOG_KEY && typeof window !== "undefined") {
  posthog.init(POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
  });
}

export function capture(event, properties) {
  if (POSTHOG_KEY && typeof window !== "undefined") {
    posthog.capture(event, properties);
  }
}

export function identify(userId, traits) {
  if (POSTHOG_KEY && typeof window !== "undefined") {
    posthog.identify(userId, traits);
  }
}
