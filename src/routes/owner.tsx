import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listInquiries, exportInquiriesXlsx, deleteInquiry } from "@/lib/inquiries.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Trash2, LogOut } from "lucide-react";

export const Route = createFileRoute("/owner")({
  ssr: false,
  head: () => ({ meta: [{ title: "Owner · Inquiries" }] }),
  component: OwnerPage,
});

const STORAGE_KEY = "titan_owner_passcode";

function OwnerPage() {
  const list = useServerFn(listInquiries);
  const exportFn = useServerFn(exportInquiriesXlsx);
  const del = useServerFn(deleteInquiry);

  const [passcode, setPasscode] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "" : "",
  );
  const [unlocked, setUnlocked] = useState(false);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadList(code: string) {
    setLoading(true);
    try {
      const res = await list({ data: { passcode: code } });
      setInquiries(res.inquiries);
      setUnlocked(true);
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load");
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) return;
    await loadList(passcode);
  }

  async function download() {
    try {
      const { base64, filename } = await exportFn({ data: { passcode } });
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this inquiry?")) return;
    try {
      await del({ data: { passcode, id } });
      setInquiries((xs) => xs.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  }

  function lock() {
    localStorage.removeItem(STORAGE_KEY);
    setPasscode("");
    setUnlocked(false);
    setInquiries([]);
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <form onSubmit={onUnlock} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</a>
          <h1 className="mt-4 text-2xl sm:text-3xl text-display">OWNER ACCESS</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your passcode to view inquiries.</p>
          <div className="mt-5">
            <Label htmlFor="pc">Passcode</Label>
            <Input
              id="pc"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoFocus
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-4 w-full" size="lg">
            {loading ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl text-display truncate">INQUIRIES</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{inquiries.length} total · only you can see this</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={lock}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Lock</span>
            </Button>
            <Button size="sm" onClick={download} disabled={inquiries.length === 0}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {inquiries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">No inquiries yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 sm:hidden">
              {inquiries.map((i) => (
                <div key={i.id} className="rounded-xl bg-card border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <a href={`tel:${i.phone}`} className="text-sm text-primary">{i.phone}</a>
                    </div>
                    <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
                  {i.email && <div className="mt-2 text-sm break-all">{i.email}</div>}
                  {i.interest && <div className="mt-1 text-sm"><span className="text-muted-foreground">Interest:</span> {i.interest}</div>}
                  {i.message && <div className="mt-2 text-sm">{i.message}</div>}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden">
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
                    {inquiries.map((i) => (
                      <tr key={i.id} className="border-t border-border hover:bg-secondary/40">
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(i.created_at).toLocaleString()}</td>
                        <td className="p-3 font-medium">{i.name}</td>
                        <td className="p-3"><a href={`tel:${i.phone}`} className="hover:underline">{i.phone}</a></td>
                        <td className="p-3">{i.email ?? "—"}</td>
                        <td className="p-3">{i.interest ?? "—"}</td>
                        <td className="p-3 max-w-md truncate">{i.message ?? "—"}</td>
                        <td className="p-3">
                          <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
