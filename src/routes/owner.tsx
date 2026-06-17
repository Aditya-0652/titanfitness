import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  listInquiries, exportInquiriesXlsx, deleteInquiry,
  listMembers, addMember, updateMember, deleteMember, exportMembersXlsx,
} from "@/lib/inquiries.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Trash2, LogOut, Plus, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/owner")({
  component: OwnerPage,
});

const today = () => new Date().toISOString().slice(0, 10);

type MemberForm = {
  name: string; phone: string; email: string; plan: string;
  start_date: string; end_date: string; notes: string;
};
const emptyMember = (): MemberForm => ({
  name: "", phone: "", email: "", plan: "",
  start_date: today(), end_date: "", notes: "",
});

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

function OwnerPage() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<"inquiries" | "members">("inquiries");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const [editing, setEditing] = useState<null | { id: string | null; data: MemberForm }>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([listInquiries(), listMembers()]);
      setInquiries(a.inquiries);
      setMembers(b.members);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user && (await checkIsAdmin(data.user.id))) {
        setUnlocked(true);
        await loadAll();
      }
      setBootstrapping(false);
    })();
  }, []);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const isAdmin = data.user ? await checkIsAdmin(data.user.id) : false;
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account is not an owner.");
      }
      setUnlocked(true);
      setPassword("");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUnlocked(false);
    setInquiries([]); setMembers([]);
  }

  async function downloadInquiries() {
    try { await exportInquiriesXlsx(); } catch (e: any) { toast.error(e?.message ?? "Export failed"); }
  }
  async function downloadMembers() {
    try { await exportMembersXlsx(); } catch (e: any) { toast.error(e?.message ?? "Export failed"); }
  }

  async function removeInquiry(id: string) {
    if (!confirm("Delete this inquiry?")) return;
    try {
      await deleteInquiry(id);
      setInquiries((xs) => xs.filter((x) => x.id !== id));
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  async function removeMember(id: string) {
    if (!confirm("Delete this member?")) return;
    try {
      await deleteMember(id);
      setMembers((xs) => xs.filter((x) => x.id !== id));
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  async function saveMember() {
    if (!editing) return;
    const d = editing.data;
    if (!d.name || !d.phone || !d.start_date || !d.end_date) {
      toast.error("Name, phone, start & end dates are required");
      return;
    }
    try {
      if (editing.id) {
        await updateMember(editing.id, d);
      } else {
        await addMember(d);
      }
      const res = await listMembers();
      setMembers(res.members);
      setEditing(null);
      toast.success("Saved");
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }

  const t = today();
  const filteredMembers = useMemo(() => {
    if (filter === "all") return members;
    return members.filter((m) => (filter === "active" ? m.end_date >= t : m.end_date < t));
  }, [members, filter, t]);
  const activeCount = members.filter((m) => m.end_date >= t).length;
  const expiredCount = members.length - activeCount;

  if (bootstrapping) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <form onSubmit={onSignIn} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm">
          <a href={import.meta.env.BASE_URL} className="text-sm text-muted-foreground hover:text-foreground">← Back to site</a>
          <h1 className="mt-4 text-2xl sm:text-3xl text-display">OWNER ACCESS</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your owner account.</p>
          <div className="mt-5 space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={authLoading} className="mt-4 w-full" size="lg">
            {authLoading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl text-display truncate">OWNER PANEL</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{loading ? "Loading…" : "Only you can see this"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline ml-1">Sign out</span>
          </Button>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-border">
          {(["inquiries", "members"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === k
                  ? "border-primary text-primary bg-primary/10"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {k} ({k === "inquiries" ? inquiries.length : members.length})
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {tab === "inquiries" ? (
          <>
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={downloadInquiries} disabled={inquiries.length === 0}>
                <Download className="w-4 h-4 mr-1" /> Excel
              </Button>
            </div>
            {inquiries.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground">No inquiries yet.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:hidden">
                  {inquiries.map((i) => (
                    <div key={i.id} className="rounded-xl bg-card border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{i.name}</div>
                          <a href={`tel:${i.phone}`} className="text-sm text-primary">{i.phone}</a>
                        </div>
                        <button onClick={() => removeInquiry(i.id)} className="text-muted-foreground hover:text-destructive shrink-0">
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
                              <button onClick={() => removeInquiry(i.id)} className="text-muted-foreground hover:text-destructive">
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
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap gap-2">
                {([
                  { k: "all", label: `All (${members.length})` },
                  { k: "active", label: `Active (${activeCount})` },
                  { k: "expired", label: `Expired (${expiredCount})` },
                ] as const).map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setFilter(o.k)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      filter === o.k
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={downloadMembers} disabled={members.length === 0}>
                  <Download className="w-4 h-4 mr-1" /> Excel
                </Button>
                <Button size="sm" onClick={() => setEditing({ id: null, data: emptyMember() })}>
                  <Plus className="w-4 h-4 mr-1" /> Add member
                </Button>
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground">No members to show.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:hidden">
                  {filteredMembers.map((m) => {
                    const active = m.end_date >= t;
                    return (
                      <div key={m.id} className="rounded-xl bg-card border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{m.name}</div>
                            <a href={`tel:${m.phone}`} className="text-sm text-primary">{m.phone}</a>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive"}`}>
                            {active ? "Active" : "Expired"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {m.plan ?? "—"} · {m.start_date} → {m.end_date}
                        </div>
                        {m.email && <div className="mt-1 text-sm break-all">{m.email}</div>}
                        {m.notes && <div className="mt-2 text-sm">{m.notes}</div>}
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing({ id: m.id, data: {
                            name: m.name, phone: m.phone, email: m.email ?? "", plan: m.plan ?? "",
                            start_date: m.start_date, end_date: m.end_date, notes: m.notes ?? "",
                          }})}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary text-secondary-foreground">
                        <tr>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Phone</th>
                          <th className="text-left p-3 font-medium">Plan</th>
                          <th className="text-left p-3 font-medium">Start</th>
                          <th className="text-left p-3 font-medium">End</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Notes</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => {
                          const active = m.end_date >= t;
                          return (
                            <tr key={m.id} className="border-t border-border hover:bg-secondary/40">
                              <td className="p-3 font-medium">{m.name}</td>
                              <td className="p-3"><a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a></td>
                              <td className="p-3">{m.plan ?? "—"}</td>
                              <td className="p-3 whitespace-nowrap">{m.start_date}</td>
                              <td className="p-3 whitespace-nowrap">{m.end_date}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive"}`}>
                                  {active ? "Active" : "Expired"}
                                </span>
                              </td>
                              <td className="p-3 max-w-xs truncate">{m.notes ?? "—"}</td>
                              <td className="p-3 whitespace-nowrap">
                                <button onClick={() => setEditing({ id: m.id, data: {
                                  name: m.name, phone: m.phone, email: m.email ?? "", plan: m.plan ?? "",
                                  start_date: m.start_date, end_date: m.end_date, notes: m.notes ?? "",
                                }})} className="text-muted-foreground hover:text-foreground mr-3">
                                  <Pencil className="w-4 h-4 inline" />
                                </button>
                                <button onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? "Edit member" : "Add member"}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={editing.data.name} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value }})} /></div>
                <div><Label>Phone *</Label><Input value={editing.data.phone} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, phone: e.target.value }})} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={editing.data.email} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, email: e.target.value }})} /></div>
              <div><Label>Plan</Label><Input placeholder="e.g. 3 months / Personal training" value={editing.data.plan} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, plan: e.target.value }})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start date *</Label><Input type="date" value={editing.data.start_date} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, start_date: e.target.value }})} /></div>
                <div><Label>End date *</Label><Input type="date" value={editing.data.end_date} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, end_date: e.target.value }})} /></div>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={editing.data.notes} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, notes: e.target.value }})} /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveMember}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
