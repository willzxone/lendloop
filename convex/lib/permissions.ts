/**
 * Pure authorisation rules. The require* helpers in ./auth.ts load the data
 * and call these, so the rules themselves can be unit tested without a database.
 */
import type { Doc } from "../_generated/dataModel";

type User = Pick<Doc<"users">, "_id" | "role">;
type Tool = Pick<Doc<"tools">, "ownerId">;
type Loan = Pick<Doc<"loans">, "borrowerId" | "lenderId">;

export const isAdmin = (user: User) => user.role === "admin";

/** Only the owner edits a listing. Admins can remove listings but not edit them. */
export const canEditTool = (user: User, tool: Tool) => tool.ownerId === user._id;

export const canRemoveTool = (user: User, tool: Tool) => tool.ownerId === user._id || isAdmin(user);

/** Approve, decline and mark returned are the lender's decisions only. */
export const canDecideLoan = (user: User, loan: Loan) => loan.lenderId === user._id;

export const canViewLoan = (user: User, loan: Loan) =>
  loan.borrowerId === user._id || loan.lenderId === user._id || isAdmin(user);
