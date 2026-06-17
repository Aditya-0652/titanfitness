import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { submitInquiry, submitReview, listReviews } from "@/lib/inquiries.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Phone, MapPin, Clock, Star, Dumbbell, Music2, Bike, Flame, ArrowRight, ExternalLink } from "lucide-react";

import heroImg from "@/assets/hero-gym.jpg";
import ptImg from "@/assets/personal-training.jpg";
import zumbaImg from "@/assets/zumba.jpg";
import cyclingImg from "@/assets/cycling.jpg";
import crossfitImg from "@/assets/crossfit.jpg";
import steamImg from "@/assets/steam.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

const programs = [
  { title: "Crossfit", desc: "High-intensity functional training built for real-world strength.", img: crossfitImg, Icon: Flame },
  { title: "Personal Training", desc: "1-on-1 coaching. Real accountability. Faster results.", img: ptImg, Icon: Dumbbell },
  { title: "Zumba & Dance", desc: "Sweat to the beat. Lose track of time.", img: zumbaImg, Icon: Music2 },
  { title: "Cycling", desc: "Cinematic spin classes that push your limits.", img: cyclingImg, Icon: Bike },
];

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <Hero />
      <Programs />
      <Pillars />
      <Reviews />
      <Visit />
      <InquirySection />
      <Footer />
    </div>
  );
}

const seedReviews = [
  { id: "s1", name: "Rahul Sharma", text: "Best gym in Sonipat — coaches actually care about your form. Lost 8 kg in 3 months.", rating: 5 },
  { id: "s2", name: "Priya Verma", text: "The Zumba classes are super fun and the steam bath after is just heaven.", rating: 5 },
  { id: "s3", name: "Aman Singh", text: "Equipment is top-notch and the crossfit sessions are intense. Highly recommend.", rating: 5 },
  { id: "s4", name: "Neha Kapoor", text: "Personal trainer built a plan that fit my busy schedule. Results in 6 weeks.", rating: 5 },
];

const GOOGLE_REVIEW_URL =
  "https://www.google.com/search?q=Titan+Fitness+Parsvnath+City+Sector+8+Sonipat#lrd=0x0:0x0,1";

function Reviews() {
  const [items, setItems] = useState<Array<{ id: string; name: string; text: string; rating: number }>>(seedReviews);
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  async function reload() {
    try {
      const { reviews } = await listReviews();
      if (reviews.length) setItems([...reviews, ...seedReviews]);
    } catch {}
  }
  useEffect(() => { reload(); }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const text = String(fd.get("text") || "").trim();
    if (!name || text.length < 5) {
      toast.error("Add your name and a short review.");
      return;
    }
    setLoading(true);
    try {
      await submitReview({ name, text, rating });
      toast.success("Thanks for the review!");
      (e.target as HTMLFormElement).reset();
      setRating(5);
      reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit review.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-20 bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-primary font-medium tracking-widest text-xs uppercase">— What members say</p>
        <h2 className="mt-3 text-4xl sm:text-5xl md:text-6xl text-display">5 STARS.<br />NOT BY ACCIDENT.</h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((r) => (
            <figure key={r.id} className="rounded-2xl bg-background border border-border p-6 flex flex-col gap-4">
              <div className="flex">
                {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
              </div>
              <blockquote className="text-sm leading-relaxed">"{r.text}"</blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-3 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary grid place-items-center font-display">
                  {r.name[0]}
                </div>
                <div className="text-sm flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <a
                    href={GOOGLE_REVIEW_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View on Google <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-12 max-w-2xl mx-auto rounded-2xl bg-background border border-border p-6 sm:p-8 shadow-sm">
          <h3 className="text-2xl text-display">LEAVE A REVIEW</h3>
          <p className="text-sm text-muted-foreground mt-1">Share your experience — it helps other members.</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-name">Name *</Label>
                <Input id="r-name" name="name" required maxLength={60} placeholder="Your name" />
              </div>
              <div>
                <Label>Rating *</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setRating(n)}
                      aria-label={`${n} stars`}
                      className="p-1"
                    >
                      <Star className={`w-6 h-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="r-text">Your review *</Label>
              <Textarea id="r-text" name="text" rows={3} maxLength={500} required placeholder="What did you love about training here?" />
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Posting…" : "Post review"}</Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display text-lg">T</span>
          <span className="font-display text-lg tracking-wide">TITAN FITNESS</span>
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <a href="#programs" className="hover:text-primary">Programs</a>
          <a href="#visit" className="hover:text-primary">Visit</a>
          <a href="#inquiry" className="hover:text-primary">Contact</a>
        </nav>
        <a href="#inquiry"><Button size="sm">Free Trial</Button></a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-primary font-medium tracking-widest text-xs uppercase">— Parsvnath City · Sector 8 · Sonipat</p>
          <h1 className="mt-5 text-5xl sm:text-6xl md:text-7xl text-display break-words">
            FORGE THE<br />
            <span className="text-primary">STRONGEST</span><br />
            VERSION OF YOU.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-lg">
            Titan Fitness is Sonipat's home for serious training. Crossfit, personal coaching, Zumba,
            cycling and steam recovery — under one roof, open till 10 PM.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#inquiry"><Button size="lg" className="text-base">Book a Free Trial <ArrowRight className="w-4 h-4" /></Button></a>
            <a href="tel:09813828549"><Button size="lg" variant="outline" className="text-base">
              <Phone className="w-4 h-4" /> Call 098138 28549
            </Button></a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
              </div>
              <span className="text-sm font-medium">5.0 on Google</span>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div className="text-sm">
              <span className="text-primary font-medium">Open now</span>
              <span className="text-muted-foreground"> · Closes 10 PM</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
          <img
            src={heroImg}
            alt="Athlete deadlifting in Titan Fitness gym"
            width={1600}
            height={1100}
            className="relative rounded-3xl object-cover aspect-[4/5] w-full shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}

function Programs() {
  return (
    <section id="programs" className="py-20 bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-primary font-medium tracking-widest text-xs uppercase">— What we train</p>
        <h2 className="mt-3 text-4xl sm:text-5xl md:text-6xl text-display">PICK YOUR<br />BATTLEGROUND.</h2>
        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          {programs.map((p) => (
            <article key={p.title} className="group relative overflow-hidden rounded-2xl aspect-[4/3] shadow-md">
              <img src={p.img} alt={p.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p.Icon className="w-6 h-6 text-primary mb-2" />
                <h3 className="text-2xl text-display">{p.title.toUpperCase()}</h3>
                <p className="mt-1 text-sm text-white/80">{p.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const items = [
    { n: "01", t: "TRAIN WITH PROS", d: "Certified coaches who actually correct your form — not just count reps." },
    { n: "02", t: "RECOVER LIKE A PRO", d: "Steam bath access included with every membership. Train hard. Repair harder." },
    { n: "03", t: "PLANS THAT FIT YOU", d: "Nutrition consults built around your goals, your schedule, what's on your plate." },
  ];
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-3 gap-5">
        {items.map((i) => (
          <div key={i.n} className="rounded-2xl bg-card border border-border p-7 shadow-sm">
            <div className="text-primary font-display text-2xl">{i.n}</div>
            <h3 className="mt-4 text-2xl text-display">{i.t}</h3>
            <p className="mt-2 text-muted-foreground text-sm">{i.d}</p>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-5 grid md:grid-cols-2 gap-5">
        <img src={steamImg} alt="Steam room" loading="lazy" className="rounded-2xl aspect-[16/10] object-cover w-full" />
        <div className="rounded-2xl bg-primary text-primary-foreground p-8 flex flex-col justify-center">
          <h3 className="text-3xl text-display">WALK IN. WALK OUT A WEAPON.</h3>
          <p className="mt-3 opacity-90">Every membership includes unlimited classes, steam access and a personal program review.</p>
          <a href="#inquiry" className="mt-6"><Button size="lg" variant="secondary">Start training</Button></a>
        </div>
      </div>
    </section>
  );
}

function Visit() {
  return (
    <section id="visit" className="py-20 bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12">
        <div>
          <p className="text-primary font-medium tracking-widest text-xs uppercase">— Hours & location</p>
          <h2 className="mt-3 text-4xl sm:text-5xl md:text-6xl text-display">WHEN WE'RE<br />OPEN.</h2>
          <div className="mt-8 space-y-5">
            <div className="flex gap-4">
              <Clock className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <div className="font-medium">Monday – Saturday</div>
                <div className="text-muted-foreground text-sm">5:00 AM – 10:00 PM</div>
                <div className="font-medium mt-2">Sunday</div>
                <div className="text-muted-foreground text-sm">Closed (Off day)</div>
              </div>
            </div>
            <div className="flex gap-4">
              <MapPin className="w-5 h-5 text-primary mt-1 shrink-0" />
              <div>
                <div className="font-medium">Parsvnath City, Sector 8</div>
                <div className="text-muted-foreground text-sm">Sonipat, Haryana</div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="https://maps.google.com/?q=Parsvnath+City+Sector+8+Sonipat" target="_blank" rel="noreferrer"><Button>Directions</Button></a>
            <a href="tel:09813828549"><Button variant="outline">Call</Button></a>
            <a href="https://wa.me/919813828549" target="_blank" rel="noreferrer"><Button variant="outline">WhatsApp</Button></a>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border aspect-[4/3]">
          <iframe
            title="Titan Fitness location"
            src="https://www.google.com/maps?q=Parsvnath+City+Sector+8+Sonipat&output=embed"
            className="w-full h-full"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

function InquirySection() {
  const submit = useServerFn(submitInquiry);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await submit({
        data: {
          name: String(fd.get("name") || ""),
          phone: String(fd.get("phone") || ""),
          email: String(fd.get("email") || ""),
          interest: String(fd.get("interest") || ""),
          message: String(fd.get("message") || ""),
        },
      });
      setDone(true);
      toast.success("We'll be in touch shortly.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="inquiry" className="py-20">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center">
          <p className="text-primary font-medium tracking-widest text-xs uppercase">— Get in touch</p>
          <h2 className="mt-3 text-4xl sm:text-5xl md:text-6xl text-display">SEND US AN<br />INQUIRY.</h2>
          <p className="mt-4 text-muted-foreground">Drop your details and we'll call you back the same day.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-sm space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required maxLength={100} placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" required maxLength={20} placeholder="9999999999" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" maxLength={255} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="interest">Interested in</Label>
              <select id="interest" name="interest" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select…</option>
                <option>Crossfit</option>
                <option>Personal Training</option>
                <option>Zumba & Dance</option>
                <option>Cycling</option>
                <option>Steam & Recovery</option>
                <option>Membership</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={4} maxLength={1000} placeholder="Tell us about your goals…" />
          </div>
          <Button type="submit" size="lg" disabled={loading || done} className="w-full sm:w-auto">
            {done ? "Received ✓" : loading ? "Sending…" : "Send inquiry"} {!done && !loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 mt-10">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} Titan Fitness, Sonipat. All rights reserved.</div>
        <a href="/owner" className="hover:text-foreground">Owner login</a>
      </div>
    </footer>
  );
}
