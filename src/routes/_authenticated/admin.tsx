import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInquiries, exportInquiriesXlsx, deleteInquiry } from "@/lib/inquiries.functions";
import { ensureAdminRole } from "@/lib/admin-bootstrap.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, LogOut, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Inquiries · Admin" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listInquiries);
  const exportFn = useServerFn(exportInquiriesXlsx);
  const del = useServerFn(deleteInquiry);
  const bootstrap = useServerFn(ensureAdminRole);

  const { data, isLoading, error } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      await bootstrap(); // grants admin role on first visit if email matches
      return list();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function downloadXlsx() {
    try {
      const { base64, filename } = await exportFn();
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive">Access denied. Only the admin account can view inquiries.</p>
          <Button className="mt-4" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  const inquiries = data?.inquiries ?? [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl">Inquiries</h1>
            <p className="text-sm text-muted-foreground">{inquiries.length} total · only you can see this</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
            <Button size="sm" onClick={downloadXlsx} disabled={inquiries.length === 0}>
              <Download className="w-4 h-4" /> Download Excel
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">No inquiries yet. New submissions will appear here.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Phone</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Interest</th>
                    <th className="text-left p-3 font-medium">Message</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((i: any) => (
                    <tr key={i.id} className="border-t border-border hover:bg-secondary/40">
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {new Date(i.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium">{i.name}</td>
                      <td className="p-3"><a href={`tel:${i.phone}`} className="hover:underline">{i.phone}</a></td>
                      <td className="p-3">{i.email ?? "—"}</td>
                      <td className="p-3">{i.interest ?? "—"}</td>
                      <td className="p-3 max-w-md truncate">{i.message ?? "—"}</td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            if (confirm("Delete this inquiry?")) deleteMut.mutate(i.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
