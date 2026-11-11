// POST /app/share-target is normally answered by the service worker (Android "Share > Booklyn").
// If the worker is not active yet, nothing is lost: send the person to the Port instead of showing an error.
export function onRequestPost() {
  return new Response(null, { status: 303, headers: { Location: '/app/#/port' } });
}
