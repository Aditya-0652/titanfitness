// Plain browser-side data access — no server functions, no service-role.
// All access control is enforced server-side by Supabase RLS policies.
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

// ---------- Inquiries ----------
export type InquiryInput = {
  name: string;
  phone: string;
  email?: string;
  interest?: string;
  message?: string;
};

export async function submitInquiry(input: InquiryInput) {
  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  if (name.length < 1 || name.length > 100) throw new Error("Name is required.");
  if (phone.length < 4 || phone.length > 20) throw new Error("Phone is required.");

  const row = {
    name,
    phone,
    email: input.email?.trim() || null,
    interest: input.interest?.trim() || null,
    message: input.message?.trim() || null,
  };

  const { error } = await supabase.from("inquiries").insert(row);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listInquiries() {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { inquiries: data ?? [] };
}

export async function deleteInquiry(id: string) {
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

function downloadXlsx(rows: Record<string, unknown>[], sheetName: string, filename: string, widths: number[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const url = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportInquiriesXlsx() {
  const { inquiries } = await listInquiries();
  const out = inquiries.map((r: any) => ({
    Date: new Date(r.created_at).toLocaleString(),
    Name: r.name,
    Phone: r.phone,
    Email: r.email ?? "",
    Interest: r.interest ?? "",
    Message: r.message ?? "",
  }));
  downloadXlsx(
    out,
    "Inquiries",
    `titan-fitness-inquiries-${new Date().toISOString().slice(0, 10)}.xlsx`,
    [20, 22, 16, 28, 18, 50],
  );
}

// ---------- Reviews ----------
export type ReviewInput = { name: string; rating: number; text: string };

export async function submitReview(input: ReviewInput) {
  const name = input.name.trim();
  const text = input.text.trim();
  if (name.length < 1 || name.length > 60) throw new Error("Name is required.");
  if (text.length < 5 || text.length > 500) throw new Error("Review is too short.");
  if (input.rating < 1 || input.rating > 5) throw new Error("Invalid rating.");
  const { error } = await supabase.from("reviews").insert({ name, rating: input.rating, text });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, name, rating, text, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return { reviews: data ?? [] };
}

// ---------- Members ----------
export type MemberInput = {
  name: string;
  phone: string;
  email?: string;
  plan?: string;
  start_date: string;
  end_date: string;
  notes?: string;
};

function normalizeMember(m: MemberInput) {
  return {
    name: m.name.trim(),
    phone: m.phone.trim(),
    email: m.email?.trim() || null,
    plan: m.plan?.trim() || null,
    start_date: m.start_date,
    end_date: m.end_date,
    notes: m.notes?.trim() || null,
  };
}

export async function listMembers() {
  const { data, error } = await (supabase as any)
    .from("members")
    .select("*")
    .order("end_date", { ascending: false });
  if (error) throw new Error(error.message);
  return { members: data ?? [] };
}

export async function addMember(member: MemberInput) {
  const { error } = await (supabase as any).from("members").insert(normalizeMember(member));
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateMember(id: string, member: MemberInput) {
  const { error } = await (supabase as any).from("members").update(normalizeMember(member)).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteMember(id: string) {
  const { error } = await (supabase as any).from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function exportMembersXlsx() {
  const { members } = await listMembers();
  const today = new Date().toISOString().slice(0, 10);
  const out = members.map((r: any) => ({
    Name: r.name,
    Phone: r.phone,
    Email: r.email ?? "",
    Plan: r.plan ?? "",
    "Start Date": r.start_date,
    "End Date": r.end_date,
    Status: r.end_date >= today ? "Active" : "Expired",
    Notes: r.notes ?? "",
  }));
  downloadXlsx(out, "Members", `titan-fitness-members-${today}.xlsx`, [22, 16, 26, 16, 12, 12, 10, 40]);
}
