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
    const token = request.cookies.get('authToken')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    if (!token || userRole !== 'admin') {
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Cryptographically verify token signature on the edge
      const { payload } = await jose.jwtVerify(token, JWT_SECRET_BYTES);
      
      const payloadRole = payload.role as string;
      const isUserAdmin = payload.email === 'rbaskeydomi2018@gmail.com' || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(payloadRole);
      
      if (!isUserAdmin) {
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      return NextResponse.next();
    } catch (e) {
      // Expired or invalid token, redirect to login
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
