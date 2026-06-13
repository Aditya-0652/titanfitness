import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Simple owner passcode. The owner uses this on /owner to see inquiries.
// Change here if you ever want to rotate it.
const OWNER_PASSCODE = "titan-owner-2026";

const InquirySchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(4).max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("").transform(() => undefined)),
  interest: z.string().trim().max(50).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().max(1000).optional().or(z.literal("").transform(() => undefined)),
});

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InquirySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("inquiries").insert({
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      interest: data.interest ?? null,
      message: data.message ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PasscodeSchema = z.object({ passcode: z.string().min(1).max(100) });

function checkPasscode(passcode: string) {
  if (passcode !== OWNER_PASSCODE) throw new Error("Wrong passcode");
}

export const listInquiries = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PasscodeSchema.parse(data))
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { inquiries: rows ?? [] };
  });

export const exportInquiriesXlsx = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PasscodeSchema.parse(data))
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const XLSX = await import("xlsx");
    const out = (rows ?? []).map((r: any) => ({
      Date: new Date(r.created_at).toLocaleString(),
      Name: r.name,
      Phone: r.phone,
      Email: r.email ?? "",
      Interest: r.interest ?? "",
      Message: r.message ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    ws["!cols"] = [{ wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inquiries");
    const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
    return { base64: buf, filename: `titan-fitness-inquiries-${new Date().toISOString().slice(0, 10)}.xlsx` };
  });

export const deleteInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ passcode: z.string().min(1).max(100), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("inquiries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
