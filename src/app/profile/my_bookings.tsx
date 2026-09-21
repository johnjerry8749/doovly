import { Redirect } from "expo-router";

/** Profile "My Bookings" goes to the main Bookings tab. */
export default function MyBookingsRedirect() {
  return <Redirect href="/(tab)/bookings" />;
}
