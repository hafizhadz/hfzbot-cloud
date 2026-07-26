import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import {
  Bot,
  Menu,
  X,
  Shield,
  Trophy,
  MessageCircle,
  BarChart3,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Wifi,
  Users,
  Activity,
  Gauge,
  Sparkles,
  Coins,
  Lock,


  Gamepad2,
  ShoppingBag,
  Zap,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface Problem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

interface Step {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface PricingPlan {
  duration: string;
  price: string;
  period: string;
  badge?: string;
  highlighted?: boolean;
}

interface FaqItem {
  q: string;
  a: string;
}

/* ── Data ── */

const PROBLEMS: Problem[] = [
  {
    icon: <ExternalLink className="h-5 w-5" />,
    title: "Spam Links",
    description: "Auto-detect and remove spam links before anyone sees them",
  },
  {
    icon: <DropletsIcon className="h-5 w-5" />,
    title: "Message Flooding",
    description: "Prevent chat flooding automatically with rate limits",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Bad Content",
    description: "Filter inappropriate content with smart detection",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Dead Communities",
    description: "Keep members engaged with interactive games and economy",
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "No Control",
    description: "Give admins real moderation tools with granular permissions",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "No Insights",
    description: "Understand your community with detailed analytics",
  },
];

const FEATURES: Feature[] = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Smart Moderation",
    items: [
      "Anti-link & anti-spam filters",
      "Anti-flood & anti-capslock",
      "Bad word filter & anti-mention",
      "Warnings, mute, kick, ban",
      "Moderation logs & alerts",
    ],
  },
  {
    icon: <Gamepad2 className="h-5 w-5" />,
    title: "Community Games",
    items: [
      "Quiz & trivia games",
      "Guessing games & RPS",
      "Dice & coin flip",
      "Challenges & events",
      "Leaderboard integration",
    ],
  },
  {
    icon: <ShoppingBag className="h-5 w-5" />,
    title: "Economy System",
    items: [
      "Virtual currency & balance",
      "Daily rewards & work",
      "Player-to-player transfer",
      "Shop & inventory",
      "Achievements & rewards",
    ],
  },
  {
    icon: <Trophy className="h-5 w-5" />,
    title: "XP & Levels",
    items: [
      "Level-up system",
      "Activity-based XP",
      "Rank & leaderboard",
      "Level-up messages",
      "Role rewards",
    ],
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: "Welcome & Auto-Reply",
    items: [
      "Custom welcome messages",
      "Goodbye messages",
      "Auto-replies & triggers",
      "Group rules display",
      "Member count tracking",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Analytics",
    items: [
      "Message volume stats",
      "Active user tracking",
      "Moderation activity",
      "Game & economy stats",
      "Activity trends",
    ],
  },
];

const STEPS: Step[] = [
  {
    number: "01",
    icon: <UserPlus className="h-6 w-6" />,
    title: "Create Account",
    description: "Sign up with email or Google in seconds",
  },
  {
    number: "02",
    icon: <CreditCard className="h-6 w-6" />,
    title: "Choose Plan",
    description: "Pick your subscription duration — all features included",
  },
  {
    number: "03",
    icon: <Wifi className="h-6 w-6" />,
    title: "Connect Bot",
    description: "Scan your WhatsApp QR code to link your bot",
  },
  {
    number: "04",
    icon: <Layers className="h-6 w-6" />,
    title: "Configure & Go",
    description: "Set up your groups and let the bot work automatically",
  },
];

const PRICING_PLANS: PricingPlan[] = [
  {
    duration: "7 Days",
    price: "Rp 10.000",
    period: "one-time",
  },
  {
    duration: "30 Days",
    price: "Rp 30.000",
    period: "one-time",
    badge: "Popular",
    highlighted: true,
  },
  {
    duration: "90 Days",
    price: "Rp 75.000",
    period: "one-time",
    badge: "Best Value",
  },
  {
    duration: "365 Days",
    price: "Rp 250.000",
    period: "one-time",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "What is HfzBot Cloud?",
    a: "HfzBot Cloud is a SaaS platform that provides a powerful WhatsApp community management bot. It handles moderation, engagement games, economy systems, XP tracking, and analytics — all from a beautiful dashboard.",
  },
  {
    q: "How does the WhatsApp bot work?",
    a: "The bot connects to your WhatsApp via an authorized session using QR code pairing. Once connected, it joins your groups and starts moderating, engaging, and analyzing automatically. No coding required.",
  },
  {
    q: "Do I need coding knowledge?",
    a: "Not at all. Everything is configured through our dashboard. You can set up moderation rules, games, economy, and auto-replies with simple toggle switches and forms.",
  },
  {
    q: "What features are included?",
    a: "All features are included in every subscription — moderation, games, economy, XP/levels, welcome messages, auto-reply, analytics, and more. We don't lock features behind higher tiers.",
  },
  {
    q: "Is there a VIP bot?",
    a: "No. Every subscriber gets the same fully-featured bot. The only difference is subscription duration (7/30/90/365 days). All features are available to everyone.",
  },
  {
    q: "What happens when my subscription expires?",
    a: "Your bot will be suspended until you renew. All your settings and data are preserved, so you can pick up right where you left off after renewing.",
  },
  {
    q: "Can I add multiple bot owners?",
    a: "Yes! You can add co-owners to your bot, and each group can have its own set of administrators with granular permission controls.",
  },
  {
    q: "Can each group have different settings?",
    a: "Absolutely. Each group gets its own configuration — independent moderation rules, game settings, economy balances, auto-replies, and permission settings.",
  },
];

/* ── Inline Icons (avoiding naming conflicts) ── */

function DropletsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function UserPlus({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function CreditCard({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

/* ── Animated Section Wrapper ── */

function SectionWrapper({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("w-full", className)}
    >
      {children}
    </motion.section>
  );
}

/* ── Section Heading ── */

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl [text-wrap:balance]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground mt-4 text-lg">{subtitle}</p>
      )}
    </div>
  );
}

/* ── FAQ Accordion (custom) ── */

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={cn(
              "border-border/50 rounded-xl border bg-card transition-all",
              isOpen && "border-primary/30",
            )}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-foreground font-medium">{item.q}</span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid overflow-hidden transition-all duration-300",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="text-muted-foreground border-border/50 border-t px-6 py-4 text-sm leading-relaxed">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Stagger Animation Variants ── */

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

/* ══════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ══════════════════════════════════════════════ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Context-aware link: redirect authenticated users to subscription
  const getStartedLink = isAuthenticated ? "/dashboard/subscription" : "/register";

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-background min-h-screen">
      {/* ═══ NAVBAR ═══ */}
      <header className="bg-background fixed top-0 right-0 left-0 z-50 border-b border-border/30">
        <Navbar
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)}
          onNavClick={scrollTo}
        />
      </header>

      {/* ═══ HERO ═══ */}
      <HeroSection />

      {/* ═══ PROBLEM SECTION ═══ */}
      <SectionWrapper id="features">
        <section className="px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              title="Managing a community shouldn't feel like a full-time job"
              subtitle="HfzBot Cloud handles the hard parts so you can focus on growing your community"
            />
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {PROBLEMS.map((problem, index) => (
                <motion.div key={index} variants={staggerItem}>
                  <div className="group flex items-start gap-4 rounded-lg border border-border/30 p-5 transition-colors hover:border-primary/20 hover:bg-muted/30">
                    <span className="mt-0.5 shrink-0 text-primary/70">
                      {problem.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {problem.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {problem.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </SectionWrapper>

      {/* ═══ FEATURE SHOWCASE ═══ */}
      <SectionWrapper>
        <section className="bg-muted/30 px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              title="Everything your community needs"
              subtitle="All features are included in every subscription — no artificial tiers"
            />
            <Tabs
              defaultValue="moderation"
              className="mx-auto max-w-4xl"
            >
              <TabsList className="mx-auto mb-8 flex flex-wrap justify-center">
                <TabsTrigger value="moderation"><Shield className="mr-1.5 size-3.5" />Moderation</TabsTrigger>
                <TabsTrigger value="games"><Gamepad2 className="mr-1.5 size-3.5" />Games</TabsTrigger>
                <TabsTrigger value="economy"><Coins className="mr-1.5 size-3.5" />Economy</TabsTrigger>
                <TabsTrigger value="levels"><Sparkles className="mr-1.5 size-3.5" />XP & Levels</TabsTrigger>
                <TabsTrigger value="welcome"><MessageCircle className="mr-1.5 size-3.5" />Welcome</TabsTrigger>
                <TabsTrigger value="analytics"><BarChart3 className="mr-1.5 size-3.5" />Analytics</TabsTrigger>
              </TabsList>

              {FEATURES.map((feature) => (
                <TabsContent key={feature.title} value={feature.title.toLowerCase().replace(/[^a-z]/g, "")}>
                  <Card className="border-border/50">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                          {feature.icon}
                        </div>
                        <CardTitle className="text-foreground text-xl">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {feature.items.map((item) => (
                          <li
                            key={item}
                            className="text-muted-foreground flex items-center gap-2 text-sm"
                          >
                            <Check className="text-primary h-4 w-4 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>
      </SectionWrapper>

      {/* ═══ DASHBOARD PREVIEW ═══ */}
      <SectionWrapper>
        <section className="px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              title="Beautiful dashboard. Total control."
              subtitle="Monitor, configure, and manage everything from one place"
            />
            <DashboardPreview />
          </div>
        </section>
      </SectionWrapper>

      {/* ═══ HOW IT WORKS ═══ */}
      <SectionWrapper>
        <section className="bg-muted/30 px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              title="From zero to protected in minutes"
              subtitle="Get your bot up and running fast"
            />
            <div className="relative">
              {/* Connecting line (desktop) */}
              <div className="bg-primary/20 absolute top-16 left-0 hidden h-0.5 w-full lg:block" />

              <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 }}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Step number (desktop) */}
                    <div className="bg-primary text-primary-foreground mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="bg-card border-border/50 mb-4 flex h-14 w-14 items-center justify-center rounded-xl border shadow-sm">
                      <div className="text-primary">{step.icon}</div>
                    </div>

                    <h3 className="text-foreground mb-1 text-lg font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground max-w-xs text-sm">
                      {step.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SectionWrapper>

      {/* ═══ PRICING ═══ */}
      <SectionWrapper id="pricing">
        <section className="px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              title="Simple, transparent pricing"
              subtitle="All features included. No hidden fees. No feature tiers."
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PRICING_PLANS.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-6 transition-all duration-300",
                    plan.highlighted
                      ? "border-primary/50 bg-card shadow-xl shadow-primary/5 scale-105"
                      : "border-border/50 bg-card hover:border-border",
                  )}
                >
                  {plan.badge && (
                    <Badge
                      variant={plan.highlighted ? "default" : "secondary"}
                      className="absolute -top-2.5 right-4"
                    >
                      {plan.badge}
                    </Badge>
                  )}

                  <h3 className="text-foreground mb-1 text-lg font-semibold">
                    {plan.duration}
                  </h3>

                  <div className="mb-4">
                    <span className="text-foreground text-3xl font-bold">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground ml-1 text-sm">
                      /{plan.period}
                    </span>
                  </div>

                  <ul className="mb-6 flex-1 space-y-2">
                    {["All Features Included"].map((feature) => (
                      <li
                        key={feature}
                        className="text-muted-foreground flex items-center gap-2 text-sm"
                      >
                        <Check className="text-primary h-4 w-4 shrink-0" />
                        {feature}
                      </li>
                    ))}
                    <li className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Check className="text-primary h-4 w-4 shrink-0" />
                      {plan.duration} access
                    </li>
                    <li className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Check className="text-primary h-4 w-4 shrink-0" />
                      No auto-renewal
                    </li>
                  </ul>

                  <Link to={getStartedLink}>
                    <Button
                      variant={plan.highlighted ? "default" : "outline"}
                      className="w-full"
                    >
                      Get Started
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionWrapper>

      {/* ═══ FAQ ═══ */}
      <SectionWrapper id="faq">
        <section className="bg-muted/30 px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              title="Frequently asked questions"
              subtitle="Everything you need to know about HfzBot Cloud"
            />
            <FaqAccordion items={FAQS} />
          </div>
        </section>
      </SectionWrapper>

      {/* ═══ FINAL CTA ═══ */}
      <SectionWrapper>
        <section className="relative overflow-hidden px-4 py-24">
          {/* Background glow */}
          <div className="bg-primary/10 absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Your community deserves better tools
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg"
            >
              Start managing your WhatsApp community like a pro. No coding
              required.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8"
            >
              <Link to={getStartedLink}>
                <Button size="lg" className="gap-2 px-8 py-6 text-base">
                  Get Started Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </SectionWrapper>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-border/40 border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Bot className="text-primary h-5 w-5" />
              <span className="text-foreground text-sm font-semibold">
                HfzBot<span className="text-secondary">Cloud</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} HfzBot Cloud. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════
   NAVBAR
   ══════════════════════════════════════════════ */

function Navbar({
  mobileMenuOpen,
  onToggleMobile,
  onNavClick,
}: {
  mobileMenuOpen: boolean;
  onToggleMobile: () => void;
  onNavClick: (id: string) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useAuth();
  const getStartedLink = isAuthenticated ? "/dashboard/subscription" : "/register";
  const loginLink = isAuthenticated ? "/dashboard" : "/login";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "Features", target: "features" },
    { label: "Pricing", target: "pricing" },
    { label: "FAQ", target: "faq" },
  ];

  return (
    <div
      data-scrolled={scrolled}
      className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 transition-all sm:px-6 lg:px-8"
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <Bot className="text-primary h-6 w-6" />
        <span className="text-foreground text-xl font-bold tracking-tight">
          HfzBot<span className="text-secondary">Cloud</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-8 md:flex">
        {links.map((link) => (
          <button
            key={link.target}
            onClick={() => onNavClick(link.target)}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Desktop buttons */}
      <div className="hidden items-center gap-3 md:flex">
        <Link to={loginLink}>
          <Button variant="ghost" size="sm">
            Login
          </Button>
        </Link>
        <Link to={getStartedLink}>
          <Button size="sm">Get Started</Button>
        </Link>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={onToggleMobile}
        className="text-foreground md:hidden"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background border-border/40 absolute top-16 left-0 right-0 border-b px-4 pb-6 pt-4 shadow-lg md:hidden"
        >
          <nav className="mb-4 flex flex-col gap-3">
            {links.map((link) => (
              <button
                key={link.target}
                onClick={() => onNavClick(link.target)}
                className="text-muted-foreground hover:text-foreground w-full text-left text-sm font-medium transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-2">
            <Link to={loginLink} className="w-full">
              <Button variant="outline" className="w-full" size="sm">
                Login
              </Button>
            </Link>
            <Link to={getStartedLink} className="w-full">
              <Button className="w-full" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   HERO SECTION
   ══════════════════════════════════════════════ */

function HeroSection() {
  const { isAuthenticated } = useAuth();
  const getStartedLink = isAuthenticated ? "/dashboard/subscription" : "/register";
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-20">
      {/* Background gradient */}
      <div className="bg-primary/5 absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs">
              WhatsApp Community Platform
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-foreground mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            One Bot.{" "}
            <span className="text-primary">
              Smarter Communities.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg sm:text-xl"
          >
            Manage, protect, and engage your WhatsApp communities with powerful
            moderation, games, economy, automation, and analytics — all from one
            beautiful dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link to={getStartedLink}>
              <Button size="lg" className="gap-2 px-8 py-6 text-base">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-6 text-base"
              onClick={() => {
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore Features
            </Button>
          </motion.div>
        </div>

        {/* Dashboard Preview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative mx-auto max-w-4xl"
        >
          <div className="relative flex justify-center">
            {/* Main preview card */}
            <motion.div
              initial={{ rotateX: 5, rotateY: -5 }}
              animate={{ rotateX: 0, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
              className="bg-card border-border/50 w-full max-w-2xl rounded-2xl border p-6 shadow-2xl"
              style={{ perspective: "1000px" }}
            >
              {/* Card header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Bot className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      My Bot
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground text-xs">
                        Online
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  <Wifi className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              </div>

              {/* Stats grid */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Connected Groups", value: "12", icon: <Users className="h-4 w-4" /> },
                  { label: "Messages Today", value: "2,847", icon: <Activity className="h-4 w-4" /> },
                  { label: "Active Users", value: "1,203", icon: <Users className="h-4 w-4" /> },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-muted/50 rounded-xl p-3"
                  >
                    <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                      {stat.icon}
                      {stat.label}
                    </div>
                    <p className="text-foreground text-xl font-bold">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mini activity feed */}
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
                  Recent Activity
                </p>
                <div className="space-y-2">
                  {[
                    { text: "Spam link blocked in #general", time: "2m ago" },
                    { text: "Quiz game started in #gaming", time: "15m ago" },
                    { text: "User reached level 10 in #community", time: "1h ago" },
                  ].map((item) => (
                    <div
                      key={item.text}
                      className="border-border/30 flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="text-primary h-3 w-3" />
                        <span className="text-foreground text-xs">
                          {item.text}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating stat card (right) */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-card border-border/50 absolute -right-4 -bottom-4 hidden rounded-xl border p-4 shadow-lg md:block"
            >
              <div className="text-muted-foreground mb-1 text-xs">
                Moderation
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="text-primary h-4 w-4" />
                <span className="text-foreground text-sm font-semibold">
                  98.5% Accuracy
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   DASHBOARD PREVIEW
   ══════════════════════════════════════════════ */

function DashboardPreview() {
  const sidebarItems = [
    { icon: <Layers className="h-4 w-4" />, label: "Overview", active: true },
    { icon: <Bot className="h-4 w-4" />, label: "My Bot" },
    { icon: <Users className="h-4 w-4" />, label: "Groups" },
    { icon: <BarChart3 className="h-4 w-4" />, label: "Analytics" },
    { icon: <CreditCard className="h-4 w-4" />, label: "Subscription" },
    { icon: <SettingsIcon className="h-4 w-4" />, label: "Settings" },
  ];

  return (
    <div className="relative mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="bg-card border-border/50 overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="flex min-h-[400px]">
          {/* Sidebar mockup */}
          <div className="bg-muted/30 hidden w-48 border-r border-border/50 p-3 sm:block">
            <div className="mb-4 flex items-center gap-2 px-2">
              <Bot className="text-primary h-5 w-5" />
              <span className="text-foreground text-sm font-bold">HfzBot</span>
            </div>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                    item.active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </nav>
          </div>

          {/* Main area mockup */}
          <div className="flex-1 p-4 sm:p-6">
            <div className="mb-6">
              <h3 className="text-foreground text-lg font-bold">Overview</h3>
              <p className="text-muted-foreground text-xs">
                Welcome back! Here&apos;s your community at a glance.
              </p>
            </div>

            {/* Stat cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Bot Status", value: "Online", color: "text-green-500" },
                { label: "Subscription", value: "Active", color: "text-primary" },
                { label: "Days Remaining", value: "23", color: "text-foreground" },
                { label: "Groups", value: "12", color: "text-foreground" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-muted/30 rounded-xl border border-border/30 p-3"
                >
                  <div className="text-muted-foreground mb-1 text-xs">
                    {stat.label}
                  </div>
                  <div className={cn("text-sm font-bold", stat.color)}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart placeholder */}
            <div className="mb-6 rounded-xl border border-border/30 bg-muted/20 p-4">
              <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
                Messages This Week
              </p>
              <div className="flex h-24 items-end gap-2">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="bg-primary/40 hover:bg-primary/60 flex-1 rounded-t transition-colors"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span key={d} className="text-muted-foreground text-xs">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Latest Activity
              </p>
              {[
                { text: "Member joined #general", time: "Just now" },
                { text: "Daily reward claimed by 15 users", time: "1m ago" },
                { text: "3 spam messages blocked", time: "5m ago" },
                { text: "Quiz: Highest score today — 85%", time: "12m ago" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="border-border/20 flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-foreground text-xs">
                    {item.text}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Small helper icons for dashboard preview ── */

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
