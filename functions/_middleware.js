export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Skip API routes
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Handle SPA routing - serve index.html for non-asset routes
  const response = await next();

  // If 404 and not an asset, serve index.html for SPA
  if (response.status === 404 && !url.pathname.includes('.') && !url.pathname.startsWith('/api/')) {
    const indexResponse = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    return indexResponse;
  }

  return response;
}