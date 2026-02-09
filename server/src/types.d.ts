import 'fastify';
import '@fastify/secure-session';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      email: string;
      displayName: string;
      isAdmin: boolean;
    };
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: number;
    oidc_code_verifier: string;
    oidc_state: string;
  }
}
