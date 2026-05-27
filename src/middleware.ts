import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET_BYTES = new TextEncoder().encode(
  "210eb87e922b9199cdfd62d166e553c025fbc57509a61e3a257384973fbf8286"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin control center paths
  if (pathname.startsWith('/admin')) {
    // Detect Next.js Server Action requests — they send a 'Next-Action' header.
    // These MUST NOT receive an HTML redirect or they produce "unexpected response" errors.
    // Instead we return a 401 JSON response that the client can handle gracefully.
    const isServerAction = request.headers.has('Next-Action');

    const token = request.cookies.get('authToken')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    if (!token || userRole !== 'admin') {
      if (isServerAction) {
        return NextResponse.json({ error: 'Unauthorized: session expired or missing.' }, { status: 401 });
      }
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Cryptographically verify token signature on the edge
      const { payload } = await jose.jwtVerify(token, JWT_SECRET_BYTES);
      
      const payloadRole = payload.role as string;
      const isUserAdmin = payload.email === 'rbaskeydomi2018@gmail.com' || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(payloadRole);
      
      if (!isUserAdmin) {
        if (isServerAction) {
          return NextResponse.json({ error: 'Forbidden: admin access required.' }, { status: 403 });
        }
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      return NextResponse.next();
    } catch (e) {
      // Expired or invalid token
      if (isServerAction) {
        return NextResponse.json({ error: 'Unauthorized: token expired or invalid.' }, { status: 401 });
      }
      const loginUrl = new URL('/auth/login', request.url);
      // Clean cookies on redirect
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('authToken');
      response.cookies.delete('userRole');
      return response;
    }
  }

  return NextResponse.next();
}

// Config to optimize middleware matching routes
export const config = {
  matcher: ['/admin/:path*'],
};
