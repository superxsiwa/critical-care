import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Account,
  ArticleText,
  Draft,
  EquipmentItem,
  EquipmentNames,
  JsonObject,
  KnowledgeArticle,
  Problem,
  Refusal,
} from './types';

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
    minutes: typeof r.minutes === 'number' ? r.minutes : undefined,
  });
}

export async function call<T>(request: Promise<T>): Promise<T> {
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

  /** An admin adds an account (nobody signs up). */
  createUser(a: {
    username: string;
    name: string;
    email: string;
    password: string;
    admin: boolean;
  }): Promise<Account> {
    return call(firstValueFrom(this.http.post<Account>('/api/users', a)));
  }

  /** An admin changes an account's name, admin rights, or switches it on or off. */
  updateUser(id: number, a: { name: string; admin: boolean; active: boolean }): Promise<Account> {
    return call(firstValueFrom(this.http.put<Account>(`/api/users/${id}`, a)));
  }

  /** An admin sets an account's Google email ('' removes it); a new one unties Google. */
  setEmail(id: number, email: string): Promise<Account> {
    return call(firstValueFrom(this.http.put<Account>(`/api/users/${id}/email`, { email })));
  }

  /** An admin unties an account's Google account; the next Google sign-in ties it again by email. */
  unlinkGoogle(id: number): Promise<Account> {
    return call(firstValueFrom(this.http.delete<Account>(`/api/users/${id}/google`)));
  }

  /** An admin sets a new password for an account; its sessions end. */
  resetPassword(id: number, password: string): Promise<void> {
    return call(firstValueFrom(this.http.put<void>(`/api/users/${id}/password`, { password })));
  }

  /** Names a picture that has none yet; refused with 409 `picture-taken` when it has one. */
  addEquipment(file: string, names: EquipmentNames): Promise<EquipmentItem> {
    return call(
      firstValueFrom(this.http.post<EquipmentItem>('/api/equipment', { file, ...names })),
    );
  }

  /** Changes an entry's names; refused with 409 `stale` when someone changed it since `version`. */
  changeEquipment(id: number, version: number, names: EquipmentNames): Promise<EquipmentItem> {
    return call(
      firstValueFrom(this.http.put<EquipmentItem>(`/api/equipment/${id}`, { version, ...names })),
    );
  }

  removeEquipment(id: number, version: number): Promise<void> {
    return call(
      firstValueFrom(
        this.http.delete<void>(`/api/equipment/${id}`, { params: { version: String(version) } }),
      ),
    );
  }

  addArticle(text: ArticleText): Promise<KnowledgeArticle> {
    return call(firstValueFrom(this.http.post<KnowledgeArticle>('/api/knowledge', text)));
  }

  /** Changes an article; refused with 409 `stale` when someone changed it since `version`. */
  changeArticle(id: number, version: number, text: ArticleText): Promise<KnowledgeArticle> {
    return call(
      firstValueFrom(this.http.put<KnowledgeArticle>(`/api/knowledge/${id}`, { version, ...text })),
    );
  }

  removeArticle(id: number, version: number): Promise<void> {
    return call(
      firstValueFrom(
        this.http.delete<void>(`/api/knowledge/${id}`, { params: { version: String(version) } }),
      ),
    );
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
