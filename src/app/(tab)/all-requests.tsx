import { Redirect } from "expo-router";

/**
 * Legacy route — keep so old links still work.
 * Canonical screen is the Requests tab: /(tab)/requests
 */
export default function AllRequestsRedirect() {
  return <Redirect href="/(tab)/requests" />;
}
