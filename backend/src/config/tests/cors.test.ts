import express from 'express';
import http from 'http';
import cors from 'cors';
import { corsOptions } from '../cors';

describe('CORS configuration', () => {
  const origin = 'http://localhost:3001';
  let server: http.Server;
  let port: number;

  beforeAll(done => {
    const app = express();
    app.use(cors(corsOptions));
    app.options(/.*/, cors(corsOptions));
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        done(new Error('Test server did not bind to a TCP port'));
        return;
      }
      port = address.port;
      done();
    });
  });

  afterAll(done => {
    server.close(done);
  });

  const preflight = (
    method: string,
    requestOrigin = origin
  ): Promise<{
    headers: http.IncomingHttpHeaders;
    statusCode?: number;
  }> =>
    new Promise((resolve, reject) => {
      const request = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/notifications/read-all',
        method: 'OPTIONS',
        headers: {
          Origin: requestOrigin,
          'Access-Control-Request-Method': method,
          'Access-Control-Request-Headers': 'authorization,content-type'
        }
      }, response => {
        response.resume();
        response.on('end', () => resolve({
          headers: response.headers,
          statusCode: response.statusCode
        }));
      });
      request.on('error', reject);
      request.end();
    });

  it('allows PATCH browser preflight requests from a configured origin', async () => {
    const response = await preflight('PATCH');

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });

  it('preserves all previously allowed methods', async () => {
    const response = await preflight('GET');
    const allowedMethods = response.headers['access-control-allow-methods']?.split(',');

    expect(allowedMethods).toEqual(expect.arrayContaining([
      'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'
    ]));
  });

  it('allows an origin configured through CORS_ORIGINS', async () => {
    const previousOrigins = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://custom.example.com';

    try {
      const response = await preflight('GET', 'https://custom.example.com');

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin'])
        .toBe('https://custom.example.com');
    } finally {
      if (previousOrigins === undefined) {
        delete process.env.CORS_ORIGINS;
      } else {
        process.env.CORS_ORIGINS = previousOrigins;
      }
    }
  });
});
