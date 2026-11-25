/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_hmac from "../lib/hmac.js";
import type * as lib_loanRules from "../lib/loanRules.js";
import type * as lib_n8nPayloads from "../lib/n8nPayloads.js";
import type * as lib_outbox from "../lib/outbox.js";
import type * as lib_people from "../lib/people.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_retry from "../lib/retry.js";
import type * as lib_validators from "../lib/validators.js";
import type * as loans from "../loans.js";
import type * as notifications from "../notifications.js";
import type * as seed from "../seed.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  http: typeof http;
  integrations: typeof integrations;
  "lib/activity": typeof lib_activity;
  "lib/auth": typeof lib_auth;
  "lib/config": typeof lib_config;
  "lib/constants": typeof lib_constants;
  "lib/dates": typeof lib_dates;
  "lib/errors": typeof lib_errors;
  "lib/hmac": typeof lib_hmac;
  "lib/loanRules": typeof lib_loanRules;
  "lib/n8nPayloads": typeof lib_n8nPayloads;
  "lib/outbox": typeof lib_outbox;
  "lib/people": typeof lib_people;
  "lib/permissions": typeof lib_permissions;
  "lib/retry": typeof lib_retry;
  "lib/validators": typeof lib_validators;
  loans: typeof loans;
  notifications: typeof notifications;
  seed: typeof seed;
  tools: typeof tools;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
