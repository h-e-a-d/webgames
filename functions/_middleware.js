// Redirect non-www to www for all requests
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'kloopik.com') {
    url.hostname = 'www.kloopik.com';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
