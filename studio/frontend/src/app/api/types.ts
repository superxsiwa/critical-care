/** The server's answers (studio/backend/internal/drafts). */

/** A JSON value as the server sends it. Drafts may be unfinished, so a case is any JSON object. */
export type Json = null | boolean | number | string | Json[] | JsonObject;
export interface JsonObject {
  [key: string]: Json;
}

/** One reason a case cannot be played yet, at a JSON path such as $.stageData[0].vitals.hr. */
export interface Problem {
  path: string;
  message: string;
}

export interface Meta {
  packageFormat: string;
  packageVersion: number;
  stepsPerCase: number;
  /** The app's equipment pictures, such as syringe.png. */
  equipment: string[];
}

/** A draft in the list. */
export interface DraftItem {
  id: number;
  bedNum: number | null;
  caseTitle: string;
  version: number;
  updatedAt: string;
  /** Who saved it last ("" for a draft from before sign-in). Drafts are shared by every instructor. */
  updatedBy: string;
  problems: number;
}

/** One draft with its case and its problems. */
export interface Draft {
  id: number;
  version: number;
  updatedAt: string;
  updatedBy: string;
  case: JsonObject;
  problems: Problem[];
}

/** Every refusal's body. `problems` is a list of Problem (check) or of text lines (files). */
export interface Refusal {
  detail: string;
  code?: string;
  problems?: string[];
  /** How long to wait (a throttled sign-in). */
  minutes?: number;
}

/** The signed-in person. */
export interface Me {
  id: number;
  username: string;
  name: string;
  /** The person's Google email ('' when none): their Google sign-in is matched by it. */
  email: string;
  admin: boolean;
  /** A Google account is tied to the account (it signed in with Google once). */
  google: boolean;
  /** The account has a password (a Google-only account has none). */
  hasPassword: boolean;
}

/** An account, as an admin sees it. */
export interface Account extends Me {
  active: boolean;
  createdAt: string;
}
