import * as client from 'openid-client';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { upsertUser, getUserById } from '../services/auth.js';

let oidcConfig: client.Configuration;

async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL(config.oidc.issuerUrl),
      config.oidc.clientId,
      config.oidc.clientSecret
    );
  }
  return oidcConfig;
}

export default async function authRoutes(app: FastifyInstance) {
  app.get('/login', async (request, reply) => {
    const oidc = await getOidcConfig();

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    request.session.set('oidc_code_verifier', codeVerifier);
    request.session.set('oidc_state', state);

    const params: Record<string, string> = {
      redirect_uri: config.oidc.redirectUri,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    };

    const redirectTo = client.buildAuthorizationUrl(oidc, params);
    return reply.redirect(redirectTo.href);
  });

  app.get('/callback', async (request, reply) => {
    const oidc = await getOidcConfig();

    const codeVerifier = request.session.get('oidc_code_verifier');
    const expectedState = request.session.get('oidc_state');

    if (!codeVerifier || !expectedState) {
      return reply.code(400).send({ error: 'Invalid session state' });
    }

    // Clear OIDC state individually — session.delete() sets a "deleted" flag
    // that prevents subsequent set() calls from persisting in the cookie
    request.session.set('oidc_code_verifier', '');
    request.session.set('oidc_state', '');

    const currentUrl = new URL(
      request.url,
      `${request.protocol}://${request.hostname}`
    );

    let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
    try {
      tokens = await client.authorizationCodeGrant(oidc, currentUrl, {
        pkceCodeVerifier: codeVerifier,
        expectedState,
      });
    } catch (err) {
      app.log.error(err, 'OIDC token exchange failed');
      const loginPath = `${config.basePath}api/auth/login`;
      return reply.redirect(loginPath);
    }

    const claims = tokens.claims();
    if (!claims) {
      return reply.code(500).send({ error: 'No ID token claims received' });
    }

    const sub = claims.sub;
    const email = (claims.email as string) || '';
    const name =
      (claims.preferred_username as string) || (claims.name as string) || email;
    const groups = Array.isArray(claims.groups)
      ? (claims.groups as string[])
      : [];

    const user = upsertUser(
      { sub, email, name, groups },
      config.oidcAdminGroup
    );

    request.session.set('userId', user.id);

    return reply.redirect(config.basePath);
  });

  app.post('/logout', async (request) => {
    request.session.delete();
    return { success: true };
  });

  if (config.devAuth) {
    app.log.warn('Dev auth route enabled — POST /api/auth/dev-login');
    app.post('/dev-login', async (request) => {
      const body = request.body as {
        displayName?: string;
        email?: string;
        isAdmin?: boolean;
      };

      const displayName = body.displayName || 'Dev User';
      const email = body.email || 'dev@localhost';
      const isAdmin = body.isAdmin ?? false;
      const sub = `dev-${email}`;

      const groups = isAdmin ? [config.oidcAdminGroup] : [];

      const user = upsertUser(
        { sub, email, name: displayName, groups },
        config.oidcAdminGroup
      );

      request.session.set('userId', user.id);

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      };
    });
  }

  app.get('/me', async (request, reply) => {
    const userId = request.session.get('userId');
    if (!userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const user = getUserById(userId);
    if (!user) {
      request.session.delete();
      return reply.code(401).send({ error: 'User not found' });
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
    };
  });
}
