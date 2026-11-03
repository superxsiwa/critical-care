import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Draft, DraftItem, JsonObject, Problem, Refusal } from './types';

/** A refused request: the HTTP status and the server's body (status 0: the server did not answer). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Refusal,
  ) {
    super(body.detail);
  }

  get code(): string {
    return this.body.code ?? '';
  }
}

function refusal(err: unknown): ApiError {
  if (!(err instanceof HttpErrorResponse)) return new ApiError(0, { detail: String(err) });
  let body: unknown = err.error;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = { detail: body };
    }
  }
  const r = (body && typeof body === 'object' ? body : {}) as Partial<Refusal>;
  return new ApiError(err.status, {
    detail: r.detail ?? err.message,
    code: r.code,
    problems: Array.isArray(r.problems) ? r.problems : undefined,
  });
}

async function call<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (err) {
    throw refusal(err);
  }
}

/** The exported package: the file's bytes and the name the server gave it. */
export interface PackageFile {
  name: string;
  text: string;
}

/** The studio's API (studio/README.md). Lists are read with httpResource where they are shown. */
@Service()
export class StudioApi {
  private readonly http = inject(HttpClient);

  draft(id: number): Promise<Draft> {
    return call(firstValueFrom(this.http.get<Draft>(`/api/drafts/${id}`)));
  }

  create(c: JsonObject): Promise<Draft> {
    return call(firstValueFrom(this.http.post<Draft>('/api/drafts', { case: c })));
  }

  /** Save; refused with 409 `stale` when someone saved since `version`, 404 when it is gone. */
  save(id: number, version: number, c: JsonObject): Promise<Draft> {
    return call(firstValueFrom(this.http.put<Draft>(`/api/drafts/${id}`, { version, case: c })));
  }

  remove(id: number, version: number): Promise<void> {
    return call(
      firstValueFrom(
        this.http.delete<void>(`/api/drafts/${id}`, { params: { version: String(version) } }),
      ),
    );
  }

  /** The problems of a case, without saving it. */
  async check(c: JsonObject): Promise<Problem[]> {
    const r = await call(
      firstValueFrom(this.http.post<{ problems: Problem[] }>('/api/check', { case: c })),
    );
    return r.problems;
  }

  /** Every case of a file as new drafts, all or none; the new drafts' ids. */
  async importFile(file: Blob): Promise<number[]> {
    const r = await call(
      firstValueFrom(
        this.http.post<{ created: number[] }>('/api/import', file, {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    return r.created;
  }

  /** Every draft as one package, only if the app would accept it (else 422 with the problems). */
  async exportPackage(): Promise<PackageFile> {
    const res = await call(
      firstValueFrom(this.http.get('/api/package', { observe: 'response', responseType: 'text' })),
    );
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'critical_care_cases.json';
    return { name, text: res.body ?? '' };
  }
}
