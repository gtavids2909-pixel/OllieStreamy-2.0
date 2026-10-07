import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  ExternalLink,
  Users,
  Circle,
  MessageSquare,
  Hash,
  Volume2,
  Shield,
  Sparkles,
  Bell,
  Copy,
  Check,
  Megaphone,
  Film,
  Tv,
  HelpCircle,
  Bot,
  Heart,
  Crown,
  ChevronDown,
  Calendar,
  Zap,
} from 'lucide-react';

const GUILD_ID = '1513370660028682340'; // resolved from invite T4BQqsFsn
const INVITE = 'https://discord.gg/T4BQqsFsn';
const INVITE_CODE = INVITE.split('/').pop();

const FEATURED_CHANNELS = [
  { icon: Megaphone, name: 'announcements', desc: 'Site updates, new features, and server status', kind: 'text' },
  { icon: MessageSquare, name: 'general', desc: 'Hang out and chat about anything', kind: 'text' },
  { icon: Film, name: 'movies', desc: 'Recommend, discuss & rate movies', kind: 'text' },
  { icon: Tv, name: 'tv-shows', desc: 'Episode discussions, season finales, theories', kind: 'text' },
  { icon: Sparkles, name: 'requests', desc: 'Suggest titles you want added to OllieStreamy', kind: 'text' },
  { icon: HelpCircle, name: 'help & support', desc: 'Server down? A player not working? Ask here', kind: 'text' },
  { icon: Volume2, name: 'Movie Night VC', desc: 'Synced watch parties with the community', kind: 'voice' },
  { icon: Volume2, name: 'Lounge', desc: 'Casual voice chat anytime', kind: 'voice' },
];

const STEPS = [
  { title: 'Click "Join Server"', desc: 'You\'ll be sent straight to the Discord invite.' },
  { title: 'Sign in or create a free Discord account', desc: 'Takes about 30 seconds — works on web, desktop & mobile apps.' },
  { title: 'Read the rules in #welcome', desc: 'Quick read so everyone knows what\'s up.' },
  { title: 'Say hi in #general', desc: 'Introduce yourself — we don\'t bite.' },
];

const FAQ = [
  {
    q: 'Is the server free to join?',
    a: 'Yes, 100% free. All you need is a free Discord account.',
  },
  {
    q: 'What happens at movie nights?',
    a: 'We pick a film by vote, then watch it in sync on a voice channel with a shared player. Bring snacks.',
  },
  {
    q: 'A streaming server isn\'t working — can you fix it?',
    a: 'The embeds are run by third-party providers. We always have backup servers — switch between them on the watch page. Mods will post in #announcements if a provider is down.',
  },
  {
    q: 'Can I request a movie or show to be added?',
    a: 'Yep — drop the title in #requests. Most things on TMDB are already playable. If something\'s missing, we look into it.',
  },
  {
    q: 'How do I report bad behaviour?',
    a: 'DM any moderator or open a ticket in #support. We take it seriously.',
  },
];

const BOTS = [
  { name: 'MEE6', desc: 'Levels, welcome messages and moderation', color: '#ff6b6b' },
  { name: 'Carl-bot', desc: 'Reaction roles, automod and reminders', color: '#ffa94d' },
  { name: 'Watch Together', desc: 'Synced viewing in voice channels', color: '#5865F2' },
];

export default function DiscordPage() {
  const [widget, setWidget] = useState(null);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Step 1: resolve real guild ID from invite (always works, no widget setting needed)
        const invRes = await fetch(
          `https://discord.com/api/v10/invites/${INVITE_CODE}?with_counts=true`
        );
        const inv = invRes.ok ? await invRes.json() : null;
        if (cancelled) return;
        setInvite(inv);
        const realGuildId = inv?.guild?.id || GUILD_ID;

        // Step 2: try live widget (member list) — needs widget enabled in server settings
        try {
          const wRes = await fetch(`https://discord.com/api/guilds/${realGuildId}/widget.json`);
          if (wRes.ok) {
            const w = await wRes.json();
            if (!cancelled) setWidget(w);
          } else if (!cancelled) {
            setWidgetEnabled(false);
          }
        } catch {
          if (!cancelled) setWidgetEnabled(false);
        }
      } catch {
        if (!cancelled) setWidgetEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefer live widget counts, fall back to invite counts (which always work)
  const memberCount =
    widget?.members?.length ??
    invite?.approximate_member_count ??
    null;
  const onlineCount =
    widget?.presence_count ??
    invite?.approximate_presence_count ??
    null;
  const serverName = widget?.name || invite?.guild?.name || 'OllieStreamy';

  const copyInvite = () => {
    navigator.clipboard.writeText(INVITE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              'radial-gradient(60% 60% at 20% 20%, rgba(88,101,242,0.4), transparent 60%), radial-gradient(60% 60% at 80% 30%, rgba(124,131,255,0.25), transparent 60%)',
          }}
        />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/15 border border-[#5865F2]/30 text-[#a8aeff] text-xs font-semibold mb-5">
                <DiscordIcon className="w-3.5 h-3.5" /> Community
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
                Join the{' '}
                <span className="bg-gradient-to-r from-[#5865F2] to-[#a78bff] bg-clip-text text-transparent">
                  OllieStreamy
                </span>{' '}
                Discord
              </h1>
              <p className="text-zinc-300 text-lg max-w-2xl leading-relaxed mb-6">
                Chat about movies and shows, request titles, get help when a server is down, and
                join community watch parties. Everyone's welcome.
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <a
                  href={INVITE}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#5865F2] hover:bg-[#6d77f5] text-white font-semibold transition-colors"
                >
                  <DiscordIcon className="w-5 h-5" /> Join Server
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={copyInvite}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Invite
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg">
                <StatCard
                  icon={Users}
                  label="Members"
                  value={loading ? '—' : memberCount ? `${memberCount}` : 'Join us'}
                  hint="and growing"
                />
                <StatCard
                  icon={Circle}
                  label="Online"
                  value={loading ? '—' : onlineCount ?? '—'}
                  hint="right now"
                  pulse
                />
                <StatCard icon={Hash} label="Channels" value="10+" hint="text & voice" />
              </div>
            </div>

            {/* Live widget */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#101018] shadow-2xl">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
                <span className="text-sm font-semibold">Live Server Widget</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
                </span>
              </div>
              {widgetEnabled && (widget || invite) ? (
                <iframe
                  src={`https://discord.com/widget?id=${invite?.guild?.id || GUILD_ID}&theme=dark`}
                  width="100%"
                  height="500"
                  allowtransparency="true"
                  frameBorder="0"
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  title="Discord widget"
                  className="block w-full"
                />
              ) : (
                <div className="p-6">
                  <div className="text-center mb-5">
                    <DiscordIcon className="w-12 h-12 mx-auto text-[#5865F2] mb-3" />
                    <p className="text-white font-semibold mb-1">
                      Enable the widget to show live members
                    </p>
                    <p className="text-zinc-400 text-sm">
                      It takes 10 seconds — owner-only step
                    </p>
                  </div>
                  <ol className="space-y-2 text-sm text-zinc-300 mb-5">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-[#5865F2]/30 text-[#a8aeff] text-xs flex items-center justify-center font-bold">1</span>
                      Open Discord → Server Settings
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-[#5865F2]/30 text-[#a8aeff] text-xs flex items-center justify-center font-bold">2</span>
                      Click <b className="text-white mx-1">Widget</b> in the sidebar
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-[#5865F2]/30 text-[#a8aeff] text-xs flex items-center justify-center font-bold">3</span>
                      Toggle <b className="text-white mx-1">Enable Server Widget</b> on
                    </li>
                  </ol>
                  <a
                    href={INVITE}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#6d77f5] font-semibold transition-colors"
                  >
                    <DiscordIcon className="w-4 h-4" /> Join Anyway
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Perks strip */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Calendar, title: 'Movie nights', desc: 'Weekly synced watch parties.' },
            { icon: Sparkles, title: 'Title requests', desc: 'Suggest what to add next.' },
            { icon: Zap, title: 'Early access', desc: 'Try new features before launch.' },
            { icon: Heart, title: 'Direct support', desc: 'Mods help fast when servers act up.' },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-xl border border-white/5 bg-[#101018] p-5 hover:border-[#5865F2]/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-[#a8aeff]" />
                </div>
                <h3 className="font-bold text-lg mb-1">{p.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured channels */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
        <h2 className="text-2xl md:text-3xl font-black mb-1">Channels you'll find inside</h2>
        <p className="text-zinc-400 mb-6">A handpicked tour of the server</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURED_CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.name}
                className="flex items-start gap-3 px-4 py-4 rounded-xl bg-[#101018] border border-white/5 hover:border-[#5865F2]/30 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${
                    c.kind === 'voice'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#5865F2]/15 text-[#a8aeff] border border-[#5865F2]/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-sm font-bold text-white">
                    {c.kind === 'voice' ? (
                      <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    {c.name}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How to join */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
        <h2 className="text-2xl md:text-3xl font-black mb-1">How to join</h2>
        <p className="text-zinc-400 mb-6">From zero to chatting in under a minute</p>
        <div className="grid md:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-white/5 bg-[#101018] p-5"
            >
              <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-gradient-to-br from-[#5865F2] to-[#a78bff] flex items-center justify-center font-black text-sm">
                {i + 1}
              </div>
              <h3 className="font-bold text-lg mb-1 mt-2">{s.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rules */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
        <h2 className="text-2xl md:text-3xl font-black mb-1">Server rules</h2>
        <p className="text-zinc-400 mb-6">Keep it chill, keep it welcoming</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Shield, title: 'Be respectful', desc: 'No harassment, hate speech, or personal attacks.' },
            { icon: MessageSquare, title: 'Stay on topic', desc: 'Use the right channels for what you\'re posting.' },
            { icon: Sparkles, title: 'No spam or self-promo', desc: 'Don\'t flood channels or promote without permission.' },
            { icon: Bell, title: 'No piracy talk', desc: 'No download links or stolen accounts. We discuss streams.' },
          ].map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} className="flex gap-4 p-5 rounded-xl border border-white/5 bg-[#101018]">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#a8aeff]" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">
                    {i + 1}. {r.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bots */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
        <h2 className="text-2xl md:text-3xl font-black mb-1">Bots that run the place</h2>
        <p className="text-zinc-400 mb-6">Tools that keep the server fun and safe</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {BOTS.map((b) => (
            <div
              key={b.name}
              className="rounded-xl border border-white/5 bg-[#101018] p-5 hover:border-[#5865F2]/40 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${b.color}22`, border: `1px solid ${b.color}55` }}
              >
                <Bot className="w-5 h-5" style={{ color: b.color }} />
              </div>
              <h3 className="font-bold text-lg mb-1">{b.name}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
        <h2 className="text-2xl md:text-3xl font-black mb-1">Frequently asked</h2>
        <p className="text-zinc-400 mb-6">Quick answers before you join</p>
        <div className="max-w-3xl space-y-2">
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-white/5 bg-[#101018] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <span className="font-semibold text-white">{f.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 transition-transform ${
                      open ? 'rotate-180 text-[#a8aeff]' : ''
                    }`}
                  />
                </button>
                {open && (
                  <div className="px-5 pb-4 text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Online members (only if widget data exists) */}
      {widget?.members?.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
          <h2 className="text-2xl md:text-3xl font-black mb-1">Online right now</h2>
          <p className="text-zinc-400 mb-6">A glimpse at who's around</p>
          <div className="flex flex-wrap gap-3">
            {widget.members.slice(0, 24).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#101018] border border-white/5"
                title={m.username}
              >
                <div className="relative w-7 h-7">
                  <img
                    src={m.avatar_url}
                    alt={m.username}
                    className="w-7 h-7 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#101018] ${
                      m.status === 'online'
                        ? 'bg-emerald-500'
                        : m.status === 'idle'
                        ? 'bg-amber-500'
                        : m.status === 'dnd'
                        ? 'bg-red-500'
                        : 'bg-zinc-500'
                    }`}
                  />
                </div>
                <span className="text-sm font-medium truncate max-w-[140px]">{m.username}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#5865F2]/20 via-[#7c83ff]/10 to-transparent p-10 text-center">
          <div
            className="absolute inset-0 -z-0 opacity-50"
            style={{
              background:
                'radial-gradient(60% 80% at 50% 0%, rgba(88,101,242,0.35), transparent 70%)',
            }}
          />
          <div className="relative">
            <Crown className="w-10 h-10 mx-auto text-[#a8aeff] mb-3" />
            <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to hang out?</h2>
            <p className="text-zinc-300 max-w-xl mx-auto mb-6">
              One click and you're in. See you in the channels.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={INVITE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#5865F2] hover:bg-[#6d77f5] text-white font-semibold transition-colors"
              >
                <DiscordIcon className="w-5 h-5" /> Join the Server
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={copyInvite}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" /> Copy Invite
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-5">{INVITE}</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, pulse }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#101018] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 mb-1">
        <Icon className={`w-3.5 h-3.5 ${pulse ? 'text-emerald-400' : 'text-[#a8aeff]'}`} />
        {label}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{hint}</div>
    </div>
  );
}

function DiscordIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
