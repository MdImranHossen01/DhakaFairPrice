import type { NextAuthConfig } from 'next-auth';

export default {
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role ?? 'user';
        (session.user as any).phone = token.phone as string;
        (session.user as any).resellerId = token.resellerId as string;
        if (token.image) {
          session.user.image = token.image as string;
        }
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'user';
        token.image = user.image || token.picture;
      }

      if (trigger === 'update') {
        if (session?.name !== undefined) token.name = session.name;
        if (session?.image !== undefined) token.image = session.image;
      }
      
      if (token.email === 'imranshuvo101@gmail.com') {
        token.role = 'super_admin';
      }
      
      return token;
    },
    async redirect({ url, baseUrl }) {
      // 1. Keep relative URLs relative so the browser remains on the current host/domain
      if (url.startsWith('/')) {
        return url;
      }

      try {
        const targetUrl = new URL(url);

        // 2. Allow same origin
        if (targetUrl.origin === baseUrl) {
          return url;
        }

        const targetHostname = targetUrl.hostname.toLowerCase();

        // 3. Allow localhost / 127.0.0.1 in local development
        if (targetHostname === 'localhost' || targetHostname === '127.0.0.1') {
          return url;
        }

        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
        if (
          rootDomain && (
            targetHostname === rootDomain ||
            targetHostname.endsWith(`.${rootDomain}`) ||
            targetHostname === `www.${rootDomain}`
          )
        ) {
          return url;
        }

        // 5. Allow custom reseller domains (http / https)
        if (targetUrl.protocol === 'http:' || targetUrl.protocol === 'https:') {
          return url;
        }
      } catch {
        // Fallback to baseUrl if URL parsing fails
      }

      return baseUrl;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
} satisfies NextAuthConfig;
