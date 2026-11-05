import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { type Server, createServer } from 'node:http';

export const GOOGLE_CLIENT_ID = 'e2e-client.apps.googleusercontent.com';
export const GOOGLE_CLIENT_SECRET = 'GOCSPX-e2e-secret';

/** Who the fake Google says signed in, and how it answers. */
export interface GooglePerson {
  sub: string;
  email: string;
  verified?: boolean;
  /** The person says no on Google's page. */
  deny?: boolean;
}

/**
 * An OpenID Connect provider as Google is one, for the e2e tests: discovery, an authorization page
 * that answers at once as the current person (no screen), a token endpoint that checks the client
 * and PKCE, and RS256 ID tokens with their key set. The studio under test is pointed at it.
 */
export interface FakeGoogle {
  url: string;
  /** The next sign-in is this person. */
  as(person: GooglePerson): void;
  close(): Promise<void>;
}

const b64url = (b: Buffer) => b.toString('base64url');

export async function startFakeGoogle(): Promise<FakeGoogle> {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
  let person: GooglePerson = { sub: 'nobody', email: 'nobody@example.com' };
  const codes = new Map<
    string,
    { challenge: string; nonce: string; redirect: string; person: GooglePerson }
  >();
  let url = '';

  const idToken = (claims: Record<string, unknown>) => {
    const head = b64url(Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' })));
    const body = b64url(Buffer.from(JSON.stringify(claims)));
    const sig = sign('sha256', Buffer.from(`${head}.${body}`), privateKey);
    return `${head}.${body}.${b64url(sig)}`;
  };

  const server: Server = createServer((req, res) => {
    const u = new URL(req.url ?? '/', url);
    const json = (status: number, value: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    if (req.method === 'GET' && u.pathname === '/.well-known/openid-configuration') {
      return json(200, {
        issuer: url,
        authorization_endpoint: `${url}/auth`,
        token_endpoint: `${url}/token`,
        jwks_uri: `${url}/jwks`,
        id_token_signing_alg_values_supported: ['RS256'],
      });
    }
    if (req.method === 'GET' && u.pathname === '/jwks') return json(200, { keys: [jwk] });
    if (req.method === 'GET' && u.pathname === '/auth') {
      const q = u.searchParams;
      const back = new URL(q.get('redirect_uri') ?? '');
      back.searchParams.set('state', q.get('state') ?? '');
      const ok =
        q.get('client_id') === GOOGLE_CLIENT_ID &&
        q.get('response_type') === 'code' &&
        q.get('code_challenge_method') === 'S256';
      if (person.deny) back.searchParams.set('error', 'access_denied');
      else if (!ok) back.searchParams.set('error', 'invalid_request');
      else {
        const code = b64url(randomBytes(12));
        codes.set(code, {
          challenge: q.get('code_challenge') ?? '',
          nonce: q.get('nonce') ?? '',
          redirect: q.get('redirect_uri') ?? '',
          person,
        });
        back.searchParams.set('code', code);
      }
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (req.method === 'POST' && u.pathname === '/token') {
      let data = '';
      req.on('data', (c: Buffer) => (data += c.toString()));
      req.on('end', () => {
        const form = new URLSearchParams(data);
        const basic = /^Basic (.+)$/.exec(req.headers.authorization ?? '');
        const [id, secret] = basic
          ? Buffer.from(basic[1], 'base64')
              .toString()
              .split(':')
              .map((s) => decodeURIComponent(s))
          : [form.get('client_id'), form.get('client_secret')];
        const grant = codes.get(form.get('code') ?? '');
        codes.delete(form.get('code') ?? '');
        const verifier = form.get('code_verifier') ?? '';
        const pkce = b64url(createHash('sha256').update(verifier).digest());
        if (
          id !== GOOGLE_CLIENT_ID ||
          secret !== GOOGLE_CLIENT_SECRET ||
          !grant ||
          grant.redirect !== form.get('redirect_uri') ||
          grant.challenge !== pkce
        )
          return json(400, { error: 'invalid_grant' });
        const now = Math.floor(Date.now() / 1000);
        return json(200, {
          access_token: 'at',
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: idToken({
            iss: url,
            aud: GOOGLE_CLIENT_ID,
            sub: grant.person.sub,
            email: grant.person.email,
            email_verified: grant.person.verified ?? true,
            nonce: grant.nonce,
            iat: now,
            exp: now + 3600,
          }),
        });
      });
      return;
    }
    json(404, { error: 'not_found' });
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('the fake Google has no port');
  url = `http://127.0.0.1:${addr.port}`;
  return {
    url,
    as: (p) => (person = p),
    close: () =>
      new Promise<void>((ok) => {
        server.closeAllConnections();
        server.close(() => ok());
      }),
  };
}
