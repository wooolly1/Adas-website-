import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
  useCallback,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  LayoutGroup,
} from 'framer-motion';

/* ============================================================
 *  MINI HASH ROUTER — self-contained, single React instance.
 * ==========================================================*/

const RouterCtx = createContext({ path: '/', navigate: () => {} });
const useLocation = () => {
  const { path } = useContext(RouterCtx);
  return { pathname: path };
};
const useNavigate = () => {
  const { navigate } = useContext(RouterCtx);
  return navigate;
};

function HashRouter({ children }) {
  const getPath = () => {
    const h = window.location.hash.replace(/^#/, '') || '/';
    return h.startsWith('/') ? h : '/' + h;
  };
  const [path, setPath] = useState(getPath());
  useEffect(() => {
    const onChange = () => setPath(getPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((to) => {
    if (!to) return;
    const clean = to.startsWith('/') ? to : '/' + to;
    if (window.location.hash !== '#' + clean) window.location.hash = clean;
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return <RouterCtx.Provider value={{ path, navigate }}>{children}</RouterCtx.Provider>;
}

function Link({ to, children, className = '', onClick, ...rest }) {
  const navigate = useNavigate();
  const handle = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(to);
  };
  return (
    <a href={'#' + to} onClick={handle} className={className} {...rest}>
      {children}
    </a>
  );
}

function NavLink({ to, children, className, onClick, end = false, ...rest }) {
  const { pathname } = useLocation();
  const isActive = end || to === '/' ? pathname === to : pathname === to || pathname.startsWith(to + '/');
  const cls = typeof className === 'function' ? className({ isActive }) : className;
  return (
    <Link to={to} onClick={onClick} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/* ============================================================
 *  DATA
 * ==========================================================*/

const PROJECTS = [
  { id: 'private-palace', title: 'Private Palace', category: 'Residential', year: '2024', location: 'Jeddah, KSA', size: 'Architecture & Interior', role: 'Lead Architect · Interiors', tagline: 'A private palace where Hijazi tradition meets contemporary restraint.',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80', span: 'tall' },
  { id: 'lulus-recipe-obhur', title: "Lulu's Recipe — Obhur", category: 'Commercial & Entertainment', year: '2023', location: 'Obhur, Jeddah', size: 'Interior · Fit-out', role: 'Interior Architecture', tagline: 'A coastal flagship for a beloved family-recipe brand.',
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80', span: 'wide' },
  { id: 'lulus-recipe-naeem', title: "Lulu's Recipe — Naeem", category: 'Commercial & Entertainment', year: '2024', location: 'Naeem, Jeddah', size: 'Interior · Fit-out', role: 'Interior Architecture', tagline: 'A second chapter for the family-recipe brand, drawn into the city.',
    img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'sub-and-ship', title: 'Sub & Ship', category: 'Commercial & Entertainment', year: '2024', location: 'Jeddah, KSA', size: 'F&B Interior', role: 'Interior Architecture', tagline: 'A submarine-themed sandwich bar — playful, compact, and tightly composed.',
    img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'al-ula-resort', title: 'Al Ula Resort', category: 'Hospitality & Admin', year: '2024', location: 'Al Ula, KSA', size: 'Hospitality Masterplan', role: 'Architecture · Landscape', tagline: 'Suites quarried into sandstone, framing a thousand-year horizon.',
    img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'private-house', title: 'Private House', category: 'Residential', year: '2023', location: 'Jeddah, KSA', size: 'Architecture & Interior', role: 'Architecture · Interiors', tagline: 'A family house composed around a quiet inner courtyard.',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80', span: 'tall' },
  { id: 'private-villa', title: 'Private Villa', category: 'Residential', year: '2023', location: 'Jeddah, KSA', size: 'Architecture & Interior', role: 'Architecture', tagline: 'A contemporary villa balanced against the heat of the Red Sea coast.',
    img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'gamekom-event', title: 'Gamekom Event', category: 'Commercial & Entertainment', year: '2024', location: 'Jeddah, KSA', size: 'Experiential Interior', role: 'Interior · Experience', tagline: 'A high-energy event arena designed as a single, cinematic stage.',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'magadeer', title: 'Magadeer Restaurant', category: 'Commercial & Entertainment', year: '2023', location: 'Madina, KSA', size: 'F&B Interior', role: 'Interior Architecture', tagline: 'A modern hijazi restaurant in the heart of Al-Madinah.',
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80', span: 'wide' },
  { id: 'private-house-2', title: 'Private House 2', category: 'Residential', year: '2022', location: 'Jeddah, KSA', size: 'Architecture & Interior', role: 'Architecture · Interiors', tagline: 'A house that carries old Jeddah forward, one detail at a time.',
    img: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'snb-dammam', title: 'SNB Dammam HQ', category: 'Hospitality & Admin', year: '2024', location: 'Dammam, KSA', size: 'Corporate Interior', role: 'Interior · Workplace', tagline: 'A regional banking headquarters re-imagined as a place to think.',
    img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1600&q=80', span: 'tall' },
  { id: 'knowledge-city', title: 'Knowledge City Business Park', category: 'Hospitality & Admin', year: '2024', location: 'Riyadh, KSA', size: 'Mixed-use Masterplan', role: 'Architecture · Planning', tagline: 'A campus of working buildings stitched around a green spine.',
    img: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80', span: 'wide' },
  { id: 'retail-park', title: 'Retail Park', category: 'Hospitality & Admin', year: '2024', location: 'Jeddah, KSA', size: 'Mixed-use Retail', role: 'Architecture · Interiors', tagline: 'An open-air retail park designed as a public, walkable courtyard.',
    img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'makkiyon-sales-office', title: 'Makkiyon Sales Office', category: 'Hospitality & Admin', year: '2024', location: 'Jeddah, KSA', size: 'Sales Office Interior', role: 'Interior · Workplace', tagline: 'A residential sales gallery that tells the story of the homes it sells.',
    img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'private-palace-2', title: 'Private Palace 2', category: 'Residential', year: '2023', location: 'Jeddah, KSA', size: 'Architecture & Interior', role: 'Architecture · Interiors', tagline: 'A private palace organised around light, water and stone.',
    img: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'delta-coffee', title: 'Delta Coffee', category: 'Commercial & Entertainment', year: '2023', location: 'Jeddah, KSA', size: 'Café Interior', role: 'Interior Architecture', tagline: 'A specialty coffee bar designed at the scale of a hand.',
    img: 'https://images.unsplash.com/photo-1496564203457-11bb12075d90?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
];

const CATEGORIES = ['All', 'Residential', 'Commercial & Entertainment', 'Hospitality & Admin'];

const SERVICES = [
  { id: 's1', no: '01', name: 'Architecture Design', blurb: 'Buildings drawn with precision and purpose.',
    detail: 'From concept to completion, we design buildings that stand as testaments to innovation, functionality and enduring aesthetic quality — tailored to every client\'s vision.',
    points: ['Concept Design', 'Technical Drawings', '3D Visualization', 'Permitting'] },
  { id: 's2', no: '02', name: 'Interior Design', blurb: 'Interiors that balance beauty with purpose.',
    detail: 'We curate spatial narratives, material palettes, joinery and lighting — transforming rooms into remarkable, lived-in experiences.',
    points: ['Space Planning', 'Material Selection', 'FF&E', 'Lighting Design'] },
  { id: 's3', no: '03', name: 'Project Supervision', blurb: 'Design intent, protected on site.',
    detail: 'Our expert supervision ensures every project is executed with precision and integrity — maintaining design quality from the first brick to the final finish.',
    points: ['Site Inspection', 'Quality Control', 'Contractor Coordination', 'Hand-over'] },
  { id: 's4', no: '04', name: 'Design Management', blurb: 'A single conductor for many drawing boards.',
    detail: 'We coordinate architects, engineers and consultants under one programme — keeping the design legible, the budget honest, and the timeline live.',
    points: ['Programme & Brief', 'Multi-discipline Coordination', 'Stakeholder Management', 'Delivery Tracking'] },
  { id: 's5', no: '05', name: 'Revit / BIM Training', blurb: 'Professional and student BIM packages.',
    detail: 'Beginner and advanced 7-day Revit courses, BIM coordination sessions and one-to-one technical support — taught by practicing architects, not just instructors.',
    points: ['Revit Beginner — 7 days', 'Revit Advanced — 7 days', 'BIM Professional Session', 'Graduation Project Mentorship'] },
  { id: 's6', no: '06', name: '1-on-1 Consulting', blurb: 'A studio session, just for you.',
    detail: 'Sixty-minute professional consultations — design feedback, layout review, presentation polish and portfolio direction — with a senior architect.',
    points: ['Design Review Session', 'Layout & Space Planning', 'Portfolio Direction', 'Jury Preparation'] },
];

const TEAM = [
  { name: 'Dr. Abdulmohsin Adas', role: 'Vice Chairman · CEO',
    bio: 'Visionary architect and BIM strategist guiding ADAS\'s design vision, technology integration and professional development.',
    img: './Dr.Abdulmohsin-Adas.jpeg' },
  { name: 'Abdulkareem Adas', role: 'Chairman · Chief Projects Officer',
    bio: 'Practising architect leading project execution across ADAS — with deep expertise in BIM coordination and multi-disciplinary delivery.',
    img: './Abdulkareem-Adas.jpeg' },
  { name: 'Walaa Adas', role: 'Board Member · CMO',
    bio: 'Leads the studio\'s brand, client experience and creative direction — shaping how ADAS is read inside and outside Saudi Arabia.',
    icon: true, gender: 'f' },
  { name: 'Raneem Sobahi', role: 'Executive Secretary',
    bio: 'The diary, the desk and the door — keeps every conversation, project file and client visit moving without friction.',
    icon: true, gender: 'f' },
];

const DESIGN_TEAM = [
  { name: 'Wijdan Ashqar', role: 'Interior Designer', gender: 'f' },
  { name: 'Amani Al Hameed', role: 'Interior Designer', gender: 'f' },
  { name: 'Renad Al Gain', role: 'Architect', gender: 'f' },
  { name: 'Randy Razon', role: 'Draftsman', gender: 'm' },
  { name: 'E H', role: 'Structural Engineering Lead', gender: 'm' },
  { name: 'M Q', role: 'Electrical Engineering Lead', gender: 'm' },
];

const TIMELINE = [
  { year: '2020', t: 'Studio Founded', d: 'ADAS Architecture opens its doors in Jeddah as a multidisciplinary architectural consultancy.' },
  { year: '2021', t: 'First Residential Commissions', d: 'Private villas, family houses and palaces across Jeddah — the first volume of our portfolio.' },
  { year: '2023', t: 'Hospitality + F&B Practice', d: 'New chapters open: Lulu\'s Recipe, Magadeer, Delta Coffee and Al Ula Resort.' },
  { year: '2024', t: 'Corporate + Civic Work', d: 'Knowledge City Business Park and SNB Dammam HQ join the portfolio.' },
  { year: '2025', t: 'A New Identity', d: 'Starting fresh as ADAS — a renewed name, brand and direction for the studio.' },
  { year: '2026', t: 'BIM Academy Launched', d: 'Revit / BIM courses for professionals and students — taught by our own principal architects.' },
];

const STATS = [
  { value: 80, suffix: '+', label: 'Projects Completed' },
  { value: 6, suffix: '+', label: 'Years of Practice' },
  { value: 10, suffix: '', label: 'Team Members' },
  { value: 1, suffix: '', label: 'Country, Many Cities' },
];

const PRESS = ['JEDDAH', 'RIYADH', 'AL ULA', 'MADINA', 'DAMMAM', 'OBHUR', 'KSA', 'GCC', 'MIDDLE EAST'];

/* ============================================================
 *  CONTEXT — Theme
 * ==========================================================*/

const ThemeCtx = createContext({ theme: 'dark', setTheme: () => {} });
const useTheme = () => useContext(ThemeCtx);

/* ============================================================
 *  CUSTOM CURSOR + MOUSE GLOW
 * ==========================================================*/

function CustomCursor() {
  useEffect(() => {
    const root = document.documentElement;
    const move = (e) => {
      root.style.setProperty('--cursor-x', e.clientX + 'px');
      root.style.setProperty('--cursor-y', e.clientY + 'px');
    };
    window.addEventListener('mousemove', move, { passive: true });

    const addHover = () => document.body.classList.add('cursor-hover');
    const removeHover = () => document.body.classList.remove('cursor-hover');
    /* Track cursor inside .magnetic-btn for the radial-pulse hover effect */
    const trackPulse = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    };
    const bind = () => {
      const els = document.querySelectorAll('a, button, [role="button"], .magnetic-btn');
      els.forEach((el) => {
        if (el.__cursorBound) return;
        el.__cursorBound = true;
        el.addEventListener('mouseenter', addHover);
        el.addEventListener('mouseleave', removeHover);
        if (el.classList.contains('magnetic-btn')) {
          el.addEventListener('mousemove', trackPulse, { passive: true });
        }
      });
    };
    bind();
    const obs = new MutationObserver(() => bind());
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', move);
      obs.disconnect();
    };
  }, []);

  return (
    <>
      <div className="mouse-glow" aria-hidden="true" />
      <div className="cursor-dot" aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />
    </>
  );
}

/* ============================================================
 *  FLOATING PARTICLES + BACKGROUND GRID
 * ==========================================================*/

function FloatingParticles({ count = 26 }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        duration: 18 + Math.random() * 18,
        delay: -Math.random() * 25,
        size: 1 + Math.random() * 2.5,
        drift: (Math.random() - 0.5) * 200,
        // every fourth particle gets the lilac secondary
        lilac: i % 4 === 0,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <span key={i} className="particle"
          style={{
            left: p.left + '%', width: p.size + 'px', height: p.size + 'px',
            animationDuration: p.duration + 's', animationDelay: p.delay + 's',
            '--drift': p.drift + 'px',
            ...(p.lilac
              ? { background: '#cab8e8', boxShadow: '0 0 10px rgba(202,184,232,0.75)' }
              : {}),
          }} />
      ))}
    </div>
  );
}

function BackgroundGrid() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (v) => v * 0.08);
  return (
    <motion.div style={{ y }}
      className="pointer-events-none fixed inset-0 -z-10 bg-blueprint-grid bg-grid opacity-[0.45]"
      aria-hidden="true" />
  );
}

/* ============================================================
 *  LOADING SCREEN
 * ==========================================================*/

function LoadingScreen({ onDone }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const total = 2400;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / total);
      setPct(Math.round(t * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 350);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.77, 0, 0.18, 1] }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-white grain">
      <div className="pointer-events-none absolute inset-0 bg-blueprint-grid bg-grid opacity-30" />
      <div className="relative z-10 flex w-[min(560px,86vw)] flex-col items-center text-ink-900">
        <svg viewBox="0 0 320 200" className="h-44 w-auto">
          <defs>
            <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#b8dc7a" />
              <stop offset="100%" stopColor="#9bcc53" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#lg)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(155,204,83,0.45))' }}>
            {['M20,170 L20,90 L80,40 L140,90 L140,170 Z',
              'M140,170 L140,60 L220,20 L300,60 L300,170',
              'M40,170 L40,120 L60,120 L60,170',
              'M80,170 L80,110 L120,110 L120,170',
              'M160,170 L160,90 L200,90 L200,170',
              'M220,170 L220,80 L260,80 L260,170',
              'M0,170 L320,170', 'M20,90 L300,60',
            ].map((d, i) => (
              <path key={i} d={d} strokeDasharray="700" strokeDashoffset="700"
                style={{ animation: `draw 1.8s ${i * 0.12}s cubic-bezier(0.77,0,0.18,1) forwards`, '--len': 700 }} />
            ))}
            <circle cx="220" cy="20" r="3" fill="#b8dc7a" stroke="none" />
            <circle cx="80" cy="40" r="3" fill="#b8dc7a" stroke="none" />
          </g>
        </svg>

        <div className="mt-10 flex w-full items-center justify-between stamp text-ink-800/80">
          <span>ADAS · ARCHITECTURE STUDIO</span>
          <span>EST · MMXIV</span>
        </div>
        <div className="mt-3 h-px w-full overflow-hidden bg-ink-900/15">
          <div className="h-full bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500"
            style={{ width: pct + '%', transition: 'width 80ms linear' }} />
        </div>
        <div className="mt-3 flex w-full items-center justify-between stamp text-ink-700/70">
          <span>LOADING ATELIER</span>
          <span>{String(pct).padStart(3, '0')}%</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
 *  NAVBAR + FOOTER + THEME TOGGLE
 * ==========================================================*/

const NAV = [
  { to: '/', label: 'Home', i: '01' },
  { to: '/about', label: 'About', i: '02' },
  { to: '/services', label: 'Services', i: '03' },
  { to: '/projects', label: 'Projects', i: '04' },
  { to: '/contact', label: 'Contact', i: '05' },
];

/* Strip white from logo.jpg and produce BOTH a white-stroke and a dark-stroke version */
let _logoSrcCache = null; // { light, dark }
function useTransparentLogo(srcPath = './logo.jpg', threshold = 235) {
  const [pair, setPair] = useState(_logoSrcCache);
  useEffect(() => {
    if (_logoSrcCache) { setPair(_logoSrcCache); return; }
    const img = new Image();
    img.src = srcPath;
    img.onload = () => {
      try {
        // Inset crop to drop the printed border around the JPG canvas.
        const inset = Math.round(Math.min(img.naturalWidth, img.naturalHeight) * 0.10);
        const cropW = img.naturalWidth - inset * 2;
        const cropH = img.naturalHeight - inset * 2;
        const make = (strokeR, strokeG, strokeB) => {
          const c = document.createElement('canvas');
          c.width = cropW; c.height = cropH;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, inset, inset, cropW, cropH, 0, 0, cropW, cropH);
          const d = ctx.getImageData(0, 0, cropW, cropH);
          const px = d.data;
          for (let i = 0; i < px.length; i += 4) {
            const r = px[i], g = px[i + 1], b = px[i + 2];
            if (r > threshold && g > threshold && b > threshold) {
              px[i + 3] = 0; continue;
            }
            if (g > 120 && g > r + 20 && g > b + 20) continue; // lime bar
            px[i] = strokeR; px[i + 1] = strokeG; px[i + 2] = strokeB;
          }
          ctx.putImageData(d, 0, 0);
          return c.toDataURL('image/png');
        };
        _logoSrcCache = {
          light: make(255, 255, 255),       // white strokes — for dark backgrounds
          dark: make(0x23, 0x1f, 0x20),     // ink-900 strokes — for light backgrounds
        };
        setPair(_logoSrcCache);
      } catch (e) {
        console.warn('[logo] canvas fallback:', e?.message);
      }
    };
  }, [srcPath, threshold]);
  return pair;
}

function Logo({ className = '', dark = false }) {
  const pair = useTransparentLogo();
  // Fallback: use raw jpg until processed
  const src = pair ? (dark ? pair.dark : pair.light) : './logo.jpg';
  return (
    <Link to="/" className={'group flex items-center gap-3 ' + className}>
      <img
        src={src}
        alt="ADAS"
        draggable="false"
        className="h-11 w-auto select-none transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ background: 'transparent' }}
      />
      <span className="hidden flex-col gap-[2px] leading-none sm:flex">
        <span className="stamp text-[8px] tracking-[0.28em]">Architecture Studio</span>
        <span className="stamp text-[7px] tracking-[0.22em] text-lilac-500/80">Jeddah · KSA</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button aria-label="Toggle colour scheme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="magnetic-btn glass relative grid h-10 w-10 place-items-center rounded-full">
      <span className="relative h-4 w-4">
        <motion.span key={theme}
          initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0 grid place-items-center">
          {isDark ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-bone-100">
              <path fill="currentColor" d="M21 12.8A9 9 0 1 1 11.2 3a1 1 0 0 1 1 1.4 7 7 0 0 0 8.4 8.4 1 1 0 0 1 1.4 1z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-900">
              <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.5" fill="currentColor" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </g>
            </svg>
          )}
        </motion.span>
      </span>
    </button>
  );
}

function Navbar({ onOpenMenu }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 30));
    return () => unsub();
  }, [scrollY]);

  return (
    <motion.header initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.77, 0, 0.18, 1], delay: 0.1 }}
      className={'fixed inset-x-0 top-0 z-[80] transition-all duration-500 ' + (scrolled ? 'py-3' : 'py-6')}>
      <div className="mx-auto flex w-[min(1500px,94vw)] items-center justify-between">
        <div className={'flex items-center gap-4 rounded-full px-4 py-2 transition-all duration-500 ' +
          (scrolled ? 'glass shadow-soft text-ink-900' : 'bg-transparent text-white')}>
          <Logo dark={scrolled} />
        </div>
        <nav className={'hidden items-center gap-1 rounded-full px-2 py-1.5 transition-all duration-500 md:flex ' +
          (scrolled ? 'glass shadow-soft' : 'bg-transparent')}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) =>
                'nav-link relative px-5 py-2 text-[12px] uppercase tracking-widest-2 ' +
                (isActive ? 'active text-gold-300' : 'text-ink-800/80 hover:text-ink-900')
              }>
              <span className="mr-2 font-mono text-[10px] text-ink-700/50">{n.i}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/contact"
            className="magnetic-btn hidden rounded-full border border-gold-400/40 px-5 py-2 text-[11px] uppercase tracking-widest-2 text-gold-300 transition hover:bg-gold-400/10 md:inline-flex">
            Start a Project
          </Link>
          <ThemeToggle />
          <button aria-label="Menu" onClick={onOpenMenu}
            className="glass grid h-10 w-10 place-items-center rounded-full md:hidden">
            <span className="flex flex-col gap-1">
              <span className="block h-px w-4 bg-bone-50" />
              <span className="block h-px w-4 bg-bone-50" />
            </span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}

function MobileMenu({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-white/90 backdrop-blur-xl md:hidden">
          <div className="flex h-full flex-col px-8 py-10">
            <div className="flex items-center justify-between">
              <Logo dark />
              <button onClick={onClose} aria-label="Close"
                className="grid h-10 w-10 place-items-center rounded-full border border-ink-900/15 text-ink-900">
                <span className="relative block h-4 w-4">
                  <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-bone-50" />
                  <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-bone-50" />
                </span>
              </button>
            </div>
            <nav className="mt-16 flex flex-1 flex-col justify-center gap-2 font-display text-5xl">
              {NAV.map((n, i) => (
                <motion.div key={n.to} initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                  <NavLink to={n.to} end={n.to === '/'} onClick={onClose}
                    className={({ isActive }) =>
                      'flex items-baseline gap-4 py-2 ' + (isActive ? 'text-gold-300' : 'text-ink-900/90')
                    }>
                    <span className="stamp text-ink-700/50">{n.i}</span>
                    <span>{n.label}</span>
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="border-t border-ink-900/10 pt-6 text-sm text-ink-700/70">
              <p>office@adas.com.sa</p>
              <p className="mt-1 stamp">JEDDAH · KSA</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-bone-200 bg-bone-50 text-ink-800">
      <FloatingParticles count={10} />
      <div className="mx-auto grid w-[min(1500px,94vw)] grid-cols-1 gap-12 px-2 py-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo dark />
          <h3 className="mt-6 font-display text-3xl leading-tight text-ink-900 md:text-4xl">
            Architecture is the<br />
            <span className="font-titling not-italic font-medium text-gold-600">quietest argument</span> we make
            <br />about how to live.
          </h3>
          <div className="mt-8 grid grid-cols-2 gap-6 text-sm text-ink-800/80">
            <div>
              <p className="stamp text-ink-700/60">Studio</p>
              <p className="mt-2">Jada 30, Al-Madinah Al-Munawarah Rd<br />Obhor Al-Janobiya, Jeddah</p>
            </div>
            <div>
              <p className="stamp text-ink-700/60">Get In Touch</p>
              <p className="mt-2">+966 55 859 3937<br />office@adas.com.sa</p>
            </div>
          </div>
        </div>
        <div className="md:col-span-3">
          <p className="stamp text-ink-700/60">Atlas</p>
          <ul className="mt-4 space-y-2 text-ink-800">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="nav-link relative inline-block py-1">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-4">
          <p className="stamp text-ink-700/60">Newsletter — Quarterly</p>
          <p className="mt-3 text-ink-800/80">Four pieces of writing a year. Slow, considered, and never about us.</p>
          <form className="mt-6 flex items-center overflow-hidden rounded-full bg-white"
            onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder="your.address@studio.com"
              className="flex-1 border-0 bg-transparent px-5 py-3 text-sm text-ink-900 placeholder-ink-700/40 outline-none focus:border-0 focus:outline-none focus:ring-0" />
            <button className="bg-gold-400 px-5 py-3 text-[11px] uppercase tracking-widest-2 text-ink-900 transition hover:bg-gold-500 hover:text-white">
              Subscribe
            </button>
          </form>
          <div className="mt-8 flex items-center gap-3">
            {['IG', 'BE', 'IN', 'PIN', 'X'].map((s) => (
              <a key={s} href="#" onClick={(e) => e.preventDefault()}
                className="grid h-10 w-10 place-items-center rounded-full border border-ink-900/15 text-[10px] uppercase tracking-widest-2 text-ink-800 transition hover:border-gold-500 hover:text-gold-600">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-ink-900/10">
        <div className="mx-auto flex w-[min(1500px,94vw)] flex-col items-center justify-between gap-3 px-2 py-6 stamp text-ink-700/60 md:flex-row">
          <span>© ADAS ARCHITECTURE · MMXX — MMXXVI · ALL RIGHTS RESERVED</span>
          <span>DESIGNED WITH ♥ IN JEDDAH</span>
          <span>KONAMI: ↑↑↓↓←→←→BA</span>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
 *  REVEAL + IMAGE
 * ==========================================================*/

function Reveal({ children, delay = 0, y = 30, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}>
      {children}
    </motion.div>
  );
}

function SplitHeading({ text, className = '', delay = 0 }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span initial={{ y: '110%' }} animate={{ y: 0 }}
              transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.06 }}
              className="inline-block">
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </span>
  );
}

function PrettyImg({ src, fallback, alt, className = '', objectPosition, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(src);
  return (
    <div className={'img-fallback relative overflow-hidden ' + className} {...rest}>
      <motion.img src={current} alt={alt} loading="lazy" decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (fallback && current !== fallback) {
            setLoaded(false);
            setCurrent(fallback);
          } else {
            e.currentTarget.style.opacity = 0;
          }
        }}
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: loaded ? 1 : 1.08, opacity: loaded ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={objectPosition ? { objectPosition } : undefined}
        className="crisp-img h-full w-full object-cover" />
    </div>
  );
}

/* ============================================================
 *  HOME PAGE
 * ==========================================================*/

function HomeHero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[680px] w-full overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <PrettyImg
          src="./hero.jpg"
          fallback="https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=2400&q=80"
          objectPosition="center 38%"
          alt="ADAS architecture — pool and villa at dusk"
          className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/30 to-ink-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/70 via-transparent to-transparent" />
      </motion.div>
      <FloatingParticles count={22} />
      <div className="pointer-events-none absolute inset-0">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1.6 }}
          className="absolute right-[6%] top-[18%] h-44 w-44 border border-gold-400/30" />
        <motion.div initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: 360 }}
          transition={{ delay: 0.8, duration: 90, ease: 'linear', repeat: Infinity }}
          className="absolute right-[10%] top-[22%] h-32 w-32 border border-lilac-400/55"
          style={{ borderRadius: '40% 60% 50% 50% / 50% 40% 60% 50%' }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 1.4 }}
          className="absolute left-[8%] bottom-[18%] h-20 w-20 border border-lilac-400/45" />
      </div>

      <motion.div style={{ opacity }}
        className="relative z-10 mx-auto flex h-full w-[min(1500px,94vw)] flex-col justify-end pb-20 md:pb-28">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 md:col-span-9">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1 }} className="stamp mb-6 text-gold-300">
              ARCHITECTURE · INTERIOR DESIGN · INNOVATION
            </motion.p>
            <h1 className="font-display text-[clamp(2.6rem,7.5vw,7.5rem)] font-light leading-[0.95] text-white">
              <SplitHeading text="Spaces that" delay={0.3} />{' '}
              <span className="font-titling not-italic font-medium text-gold-500">
                <SplitHeading text="inspire" delay={0.5} />
              </span>
              <br />
              <SplitHeading text="lives that flourish" delay={0.7} />
            </h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 1 }}
              className="mt-8 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
              ADAS is a premier architecture and interior design studio crafting
              environments of lasting distinction across Saudi Arabia and beyond.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 1 }}
              className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/projects"
                className="magnetic-btn group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gold-400 px-7 py-3.5 text-[12px] uppercase tracking-widest-2 text-ink-950 transition hover:bg-gold-300">
                <span>Explore Portfolio</span>
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link to="/contact"
                className="magnetic-btn inline-flex items-center gap-3 rounded-full border border-white/40 px-7 py-3.5 text-[12px] uppercase tracking-widest-2 text-white transition hover:border-gold-300 hover:text-gold-300">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-current">
                  <span className="block h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
                </span>
                Start a Conversation
              </Link>
            </motion.div>
          </div>
          <div className="col-span-12 md:col-span-3">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.8, duration: 1 }}
              className="glass relative overflow-hidden rounded-2xl p-5">
              <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-lilac-400 to-transparent" />
              <p className="stamp text-lilac-500">Now Drawing</p>
              <p className="mt-2 font-display text-2xl text-ink-900">Private Palace</p>
              <p className="mt-1 text-xs text-ink-800/60">Jeddah · Residential</p>
              <div className="mt-4 grid grid-cols-2 gap-2 stamp text-ink-700/70">
                <span>KSA</span><span>2023</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="stamp text-white/70">SCROLL</span>
          <div className="relative h-10 w-px overflow-hidden bg-white/20">
            <motion.div animate={{ y: ['-100%', '100%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-x-0 top-0 h-1/2 bg-gold-300" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Marquee() {
  return (
    <div className="overflow-hidden border-y border-ink-900/10 bg-bone-100/40 py-5">
      <div className="marquee-track flex w-max gap-16 whitespace-nowrap stamp text-bone-200/70">
        {[...PRESS, ...PRESS, ...PRESS].map((p, i) => (
          <span key={i} className="flex items-center gap-16">
            <span className="text-ink-700/50">◆</span>
            <span>{p}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Counter({ value, suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const dur = 1800;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return <span ref={ref}>{n}{suffix}</span>;
}

function StatsBand() {
  return (
    <section className="relative isolate border-y border-ink-900/10 bg-bone-100/30 py-20">
      <div className="absolute inset-0 bg-blueprint-grid bg-grid opacity-30" />
      <div className="relative mx-auto grid w-[min(1500px,94vw)] grid-cols-2 gap-y-12 md:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} className="text-center">
            <p className="font-titling text-6xl font-medium leading-none text-gold-600 md:text-7xl">
              <Counter value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-3 stamp text-ink-700/70">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function PhilosophyStrip() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['10%', '-30%']);
  return (
    <section ref={ref} className="relative overflow-hidden py-32">
      <motion.div style={{ x }}
        className="font-display text-[12vw] leading-none text-ink-900/[0.05] whitespace-nowrap">
        Architecture · Interiors · Urbanism · Visualization ·
      </motion.div>
      <div className="mx-auto mt-12 grid w-[min(1500px,94vw)] grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-4">
          <p className="stamp text-gold-300">— OUR THESIS</p>
          <Reveal>
            <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
              Slow drawings,<br />
              <span className="font-titling not-italic font-medium text-gold-500">long buildings.</span>
            </h2>
          </Reveal>
        </div>
        <div className="col-span-12 grid grid-cols-1 gap-10 md:col-span-8 md:grid-cols-2">
          {[
            { t: 'Cinematic', d: 'We design as a film director composes a frame — light, line, shadow and silence as raw material.' },
            { t: 'Considered', d: 'Each building begins with a question, not a brief. We refuse to draw what we have not first defended.' },
            { t: 'Crafted', d: 'From the joinery to the masterplan, we sweat the millimetres. Buildings are read at arms length.' },
            { t: 'Climate-Aware', d: 'Every line carries an embodied carbon cost. We design like the next century is already here.' },
          ].map((b, i) => (
            <Reveal key={b.t} delay={i * 0.08}>
              <div className="border-t border-ink-900/12 pt-5">
                <p className="font-titling text-2xl text-gold-300">{b.t}</p>
                <p className="mt-3 text-ink-800/70">{b.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedSlider() {
  const featured = PROJECTS.slice(0, 5);
  const [i, setI] = useState(0);
  const next = () => setI((p) => (p + 1) % featured.length);
  const prev = () => setI((p) => (p - 1 + featured.length) % featured.length);
  useEffect(() => {
    const id = setInterval(next, 6500);
    return () => clearInterval(id);
  }, []);
  const p = featured[i];
  return (
    <section className="relative overflow-hidden bg-white py-28">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <div className="flex items-end justify-between">
          <div>
            <p className="stamp text-gold-300">— FEATURED WORK</p>
            <Reveal>
              <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">
                Selected projects, <span className="font-titling not-italic font-medium text-gold-500">in motion</span>.
              </h2>
            </Reveal>
          </div>
          <Link to="/projects"
            className="hidden text-[12px] uppercase tracking-widest-2 text-bone-200/70 hover:text-gold-300 md:inline">
            View All →
          </Link>
        </div>
        <div className="relative mt-12 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
              <AnimatePresence mode="wait">
                <motion.div key={p.id}
                  initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0">
                  <PrettyImg src={p.img} alt={p.title} className="h-full w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-10">
                <div>
                  <AnimatePresence mode="wait">
                    <motion.div key={p.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.6 }}>
                      <p className="stamp text-gold-300">{p.category} · {p.year}</p>
                      <h3 className="mt-2 font-display text-3xl text-white md:text-5xl">{p.title}</h3>
                      <p className="mt-2 text-white/75">{p.location} · {p.size}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="hidden items-center gap-3 md:flex">
                  <button onClick={prev} aria-label="Previous"
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/40 text-white transition hover:border-gold-300 hover:text-gold-300">←</button>
                  <button onClick={next} aria-label="Next"
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/40 text-white transition hover:border-gold-300 hover:text-gold-300">→</button>
                </div>
              </div>
            </div>
            <div className="mt-4 h-px overflow-hidden bg-bone-100/10">
              <motion.div key={p.id} initial={{ width: 0 }} animate={{ width: '100%' }}
                transition={{ duration: 6.5, ease: 'linear' }} className="h-full bg-gold-400" />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <ul className="flex flex-col gap-2">
              {featured.map((f, idx) => (
                <li key={f.id}>
                  <button onClick={() => setI(idx)}
                    className={'group flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition ' +
                      (idx === i ? 'glass border-gold-400/40' : 'border border-transparent hover:border-ink-900/12')}>
                    <div>
                      <p className="stamp text-ink-700/60">{String(idx + 1).padStart(2, '0')}</p>
                      <p className={'mt-1 font-display text-xl ' + (idx === i ? 'text-gold-500' : 'text-ink-900')}>{f.title}</p>
                    </div>
                    <span className="text-ink-700/50 group-hover:text-gold-300">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlueprintSection() {
  const [hover, setHover] = useState(null);
  const [picked, setPicked] = useState(null);
  const rooms = [
    { id: 'a', label: 'Atrium',  x: 16, y: 18, w: 40, h: 28, info: 'Atrium · 220 m² · 9.6m clear height · north-lit',
      photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80' },
    { id: 'b', label: 'Library', x: 60, y: 18, w: 28, h: 28, info: 'Library · 96 m² · oak millwork · 4,200 volumes',
      photo: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80' },
    { id: 'c', label: 'Salon',   x: 16, y: 50, w: 28, h: 28, info: 'Salon · 88 m² · fluted plaster · concealed AV',
      photo: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80' },
    { id: 'd', label: 'Garden',  x: 48, y: 50, w: 40, h: 28, info: 'Garden Court · 160 m² · monolithic basalt floor',
      photo: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80' },
  ];
  return (
    <section className="relative overflow-hidden bg-bone-100/40 py-28">
      <div className="mx-auto grid w-[min(1500px,94vw)] grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-4">
          <p className="stamp text-gold-300">— ANATOMY OF A PROJECT</p>
          <Reveal>
            <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              Step inside a <span className="font-titling not-italic font-medium text-gold-500">working blueprint</span>.
            </h2>
          </Reveal>
          <p className="mt-6 max-w-md text-ink-800/70">
            Click a room name to see how it looks in the real world. Every room we draw
            has a story — and a number. This is the ground floor of Atelier 9, our Paris
            residence on Rue de Sévigné.
          </p>
          <div className="mt-8 space-y-3">
            {rooms.map((r) => (
              <div key={r.id} className="border-b border-ink-900/10">
                <button
                  onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}
                  onClick={() => setPicked((p) => (p === r.id ? null : r.id))}
                  className={'flex w-full items-center justify-between py-3 text-left transition ' +
                    (hover === r.id || picked === r.id ? 'text-gold-500' : 'text-ink-800/80')}>
                  <span className="font-display text-xl">{r.label}</span>
                  <span className="stamp text-ink-700/50">{picked === r.id ? '— OPEN' : r.id.toUpperCase() + ' —'}</span>
                </button>
                <AnimatePresence>
                  {picked === r.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden">
                      <div className="relative my-3 aspect-[5/3] w-full overflow-hidden rounded-md">
                        <PrettyImg src={r.photo} alt={r.label} className="h-full w-full" />
                        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold-400/30" />
                        <div className="absolute bottom-2 left-2 stamp rounded bg-ink-900/70 px-2 py-1 text-white">
                          {r.label.toUpperCase()} · IN SITU
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
        <div className="relative col-span-12 lg:col-span-8">
          <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-gold-400/20 bg-white">
            <div className="absolute inset-0 bg-blueprint-grid bg-grid-sm opacity-60" />
            <svg viewBox="0 0 100 80" className="absolute inset-0 h-full w-full">
              <defs>
                <pattern id="hatch" patternUnits="userSpaceOnUse" width="2" height="2" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="2" stroke="#9bcc53" strokeWidth="0.3" opacity="0.4" />
                </pattern>
              </defs>
              <g fill="none" stroke="#9bcc53" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="10" width="80" height="60" />
                <rect x="11" y="11" width="78" height="58" />
                <line x1="50" y1="10" x2="50" y2="40" />
                <line x1="10" y1="40" x2="90" y2="40" />
                <line x1="42" y1="40" x2="42" y2="70" />
                <line x1="42" y1="55" x2="90" y2="55" />
                <path d="M28 10 a6 6 0 0 1 6 6" />
                <path d="M70 40 a6 6 0 0 1 -6 6" />
                <line x1="10" y1="5" x2="50" y2="5" />
                <line x1="50" y1="5" x2="90" y2="5" />
                <line x1="10" y1="4" x2="10" y2="6" />
                <line x1="50" y1="4" x2="50" y2="6" />
                <line x1="90" y1="4" x2="90" y2="6" />
                <circle cx="22" cy="22" r="2" />
                <circle cx="22" cy="32" r="2" />
                <rect x="60" y="18" width="10" height="6" />
                <rect x="60" y="28" width="14" height="2" />
                <rect x="18" y="50" width="10" height="6" />
                <rect x="60" y="58" width="20" height="6" fill="url(#hatch)" />
                <circle cx="78" cy="22" r="3" />
              </g>
              {rooms.map((r) => {
                const active = picked === r.id;
                const lit = hover === r.id || active;
                return (
                <g key={r.id}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h}
                    fill={active ? '#cab8e8' : '#9bcc53'}
                    fillOpacity={active ? 0.30 : (lit ? 0.18 : 0)}
                    stroke={active ? '#a98cd9' : 'none'}
                    strokeWidth="0.3"
                    onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}
                    onClick={() => setPicked((p) => (p === r.id ? null : r.id))}
                    style={{ transition: 'fill-opacity 0.4s ease, fill 0.4s ease', cursor: 'none' }} />
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 1}
                    textAnchor="middle" fontSize="2"
                    fill={active ? '#7f5fb8' : (lit ? '#b8dc7a' : '#dec9b2')}
                    style={{ pointerEvents: 'none', fontFamily: 'JetBrains Mono', letterSpacing: '0.2em' }}>
                    {r.label.toUpperCase()}
                  </text>
                </g>
                );
              })}
              <g transform="translate(85,64)" stroke="#9bcc53" strokeWidth="0.2" fill="none">
                <circle r="3" /><line y1="-3" y2="3" /><line x1="-3" x2="3" />
                <text y="-3.6" textAnchor="middle" fontSize="1.6" fill="#9bcc53" style={{ fontFamily: 'JetBrains Mono' }}>N</text>
              </g>
            </svg>
            <div className="absolute bottom-4 left-4 stamp text-gold-300/80">ADAS · DWG · A-101 · 1:50</div>
            <div className="absolute right-4 top-4 stamp text-gold-300/60">SHEET 04 / 28</div>
            <AnimatePresence>
              {hover && (
                <motion.div key={'hov-' + hover}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute bottom-4 right-4 glass max-w-[280px] rounded-xl p-4 stamp text-lilac-600">
                  {rooms.find((r) => r.id === hover)?.info}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const steps = [
    { n: '01', t: 'Listen', d: 'A long conversation about site, brief, climate and ambition.' },
    { n: '02', t: 'Draw', d: 'Sketches by hand, then in plan, section and model — all in dialogue.' },
    { n: '03', t: 'Test', d: 'We build the building four times in software before we touch a stone.' },
    { n: '04', t: 'Deliver', d: 'On site, in fabrication, at every joint. We do not leave the room.' },
  ];
  return (
    <section className="relative py-28">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 md:col-span-6">
            <p className="stamp text-gold-300">— THE METHOD</p>
            <Reveal>
              <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">
                Four rooms in <span className="font-titling not-italic font-medium text-gold-500">one house</span>.
              </h2>
            </Reveal>
          </div>
          <p className="col-span-12 max-w-md text-ink-800/70 md:col-span-6">
            We do not split design and delivery. The same team that draws the first
            line walks the building on opening day.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink-900/10 bg-ink-900/5 md:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="group relative h-full overflow-hidden bg-white p-8 md:p-10">
                <div className="absolute -right-6 -top-6 font-titling font-black text-[8rem] leading-none text-gold-400/[0.06] transition-colors duration-500 group-hover:text-gold-400/20">
                  {s.n}
                </div>
                <p className="stamp text-gold-300">{s.n}</p>
                <h3 className="mt-3 font-display text-3xl text-ink-900">{s.t}</h3>
                <p className="mt-3 text-ink-800/70">{s.d}</p>
                <div className="mt-6 h-px w-12 bg-gold-300 transition-all duration-500 group-hover:w-24" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTABand() {
  return (
    <section className="relative isolate overflow-hidden border-y border-ink-900/10 bg-bone-100/40 py-28">
      <div className="absolute inset-0 bg-blueprint-grid bg-grid opacity-30" />
      <div className="absolute inset-0">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="absolute -right-40 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full border border-gold-400/15" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
          className="absolute -right-20 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full border border-gold-400/10" />
      </div>
      <div className="relative mx-auto w-[min(1500px,94vw)] text-center">
        <Reveal>
          <h2 className="font-display text-5xl leading-tight md:text-7xl">
            A new building <span className="font-titling not-italic font-medium text-gold-500">to draw</span>?
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mx-auto mt-6 max-w-xl text-ink-800/70">
            We accept four new projects each year. If yours feels right for our table,
            we would be glad to talk.
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/contact"
              className="magnetic-btn rounded-full bg-gold-400 px-8 py-4 text-[12px] uppercase tracking-widest-2 text-ink-950 hover:bg-gold-300">
              Start the Conversation
            </Link>
            <Link to="/projects"
              className="magnetic-btn rounded-full border border-ink-900/20 px-8 py-4 text-[12px] uppercase tracking-widest-2 text-ink-900 hover:border-gold-300 hover:text-gold-300">
              See the Work →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <>
      <HomeHero />
      <Marquee />
      <StatsBand />
      <PhilosophyStrip />
      <FeaturedSlider />
      <BlueprintSection />
      <ProcessSection />
      <CTABand />
    </>
  );
}

/* ============================================================
 *  PAGE HEADER (shared)
 * ==========================================================*/

function PageHeader({ tag, title, subtitle, accent }) {
  return (
    <section className="relative isolate overflow-hidden pt-40 pb-20">
      <div className="absolute inset-0 bg-blueprint-grid bg-grid opacity-20" />
      <FloatingParticles count={12} />
      <div className="relative mx-auto w-[min(1500px,94vw)]">
        <Reveal>
          <p className="stamp text-gold-300">{tag}</p>
        </Reveal>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,7vw,6.5rem)] font-light leading-[0.95]">
          <SplitHeading text={title} />
          {accent && (
            <>{' '}<span className="font-titling not-italic font-medium text-gold-500"><SplitHeading text={accent} delay={0.3} /></span></>
          )}
        </h1>
        {subtitle && (
          <Reveal delay={0.4}>
            <p className="mt-6 max-w-2xl text-lg text-ink-800/70">{subtitle}</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ============================================================
 *  ABOUT PAGE
 * ==========================================================*/

function AboutStory() {
  return (
    <section className="relative py-24">
      <div className="mx-auto grid w-[min(1500px,94vw)] grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-5">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <PrettyImg src="./Office.jpeg"
                fallback="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80"
                alt="ADAS studio office" className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
              <div className="absolute bottom-6 left-6 stamp text-white/90">JEDDAH · STUDIO ATELIER · 2024</div>
            </div>
          </Reveal>
        </div>
        <div className="col-span-12 lg:col-span-7 lg:pl-10">
          <p className="stamp text-gold-300">— OUR STORY</p>
          <Reveal>
            <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              A consultancy built on <span className="font-titling not-italic font-medium text-gold-500">excellence</span>.
            </h2>
          </Reveal>
          <div className="mt-8 space-y-6 text-ink-800/75">
            <p>ADAS Architecture is a multidisciplinary architectural consultancy firm
              specializing in architecture, interior design, supervision and design
              management services.</p>
            <p>Driven by innovation, precision and a commitment to excellence, the studio
              delivers tailored design solutions that balance functionality, aesthetics
              and long-term value.</p>
            <p>Through a collaborative and client-focused approach, ADAS Architecture
              creates distinctive environments that reflect the identity of each project
              while enhancing the human experience and shaping meaningful spaces across
              Saudi Arabia.</p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-ink-900/10 pt-8">
            <div><p className="font-titling text-4xl font-bold text-gold-600">80+</p><p className="stamp text-ink-700/70">Projects</p></div>
            <div><p className="font-titling text-4xl font-bold text-gold-600">6+</p><p className="stamp text-ink-700/70">Years</p></div>
            <div><p className="font-titling text-4xl font-bold text-gold-600">10</p><p className="stamp text-ink-700/70">Team Members</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VisionMission() {
  const items = [
    { tag: 'Vision', t: 'A leading consultancy, recognised by its work.',
      d: 'To become a leading architectural consultancy firm recognised for delivering innovative, human-centred and timeless design solutions that positively shape communities, enhance lifestyles and contribute to the future of the built environment in Saudi Arabia and beyond.' },
    { tag: 'Mission', t: 'Visions translated into distinctive spaces.',
      d: 'To deliver high-quality architectural, interior design and consultancy services through creativity, technology and professional excellence — understanding our clients\' visions and transforming them into functional, sustainable and visually distinctive spaces that promote wellbeing, identity and long-term value.' },
  ];
  return (
    <section className="relative bg-bone-100/30 py-24">
      <div className="mx-auto grid w-[min(1500px,94vw)] grid-cols-12 gap-10">
        {items.map((it, i) => (
          <Reveal key={it.tag} delay={i * 0.1} className="col-span-12 md:col-span-6">
            <div className="glass relative h-full overflow-hidden rounded-2xl p-10">
              <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-gold-400/0 via-lilac-400 to-gold-400/0" />
              <div className={'absolute -right-12 -top-12 font-titling font-black text-[10rem] leading-none ' + (i % 2 === 0 ? 'text-lilac-400/20' : 'text-gold-400/10')}>{it.tag[0]}</div>
              <p className={'stamp ' + (i % 2 === 0 ? 'text-lilac-500' : 'text-gold-300')}>{it.tag}</p>
              <h3 className="mt-4 font-display text-4xl leading-tight">{it.t}</h3>
              <p className="mt-5 text-ink-800/75">{it.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function TimelineSection() {
  return (
    <section className="relative py-24">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <p className="stamp text-gold-300">— OUR EXPERIENCE</p>
        <Reveal>
          <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">
            Six years, <span className="font-titling not-italic font-medium text-gold-500">one continuous line</span>.
          </h2>
        </Reveal>
        <div className="relative mt-16">
          <div className="absolute left-2 top-0 h-full w-px bg-gradient-to-b from-transparent via-gold-400/40 to-transparent md:left-1/2 md:-translate-x-1/2" />
          {TIMELINE.map((t, i) => (
            <Reveal key={t.year} delay={i * 0.08}>
              <div className={'relative grid grid-cols-12 gap-6 pb-12 ' + (i % 2 === 0 ? '' : 'md:[direction:rtl]')}>
                <div className="col-span-12 md:col-span-6 md:[direction:ltr]">
                  <div className="relative pl-10 md:pl-0">
                    <span className="absolute left-0 top-3 grid h-4 w-4 -translate-x-[7px] place-items-center rounded-full bg-white md:hidden">
                      <span className="block h-2 w-2 rounded-full bg-gold-300" />
                    </span>
                    <p className="font-titling text-5xl font-black tracking-tight text-gold-600 md:text-7xl">{t.year}</p>
                    <h3 className="mt-2 font-display text-2xl">{t.t}</h3>
                    <p className="mt-3 max-w-md text-ink-800/70">{t.d}</p>
                  </div>
                </div>
                <div className="hidden md:relative md:col-span-6 md:block md:[direction:ltr]">
                  <span className="absolute left-1/2 top-6 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-full bg-white ring-1 ring-lilac-400">
                    <span className="block h-2 w-2 rounded-full bg-lilac-400" />
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonIcon({ gender = 'm', className = '' }) {
  // female: flared body coming to a centre point + feet · male: trapezoid body
  return (
    <svg viewBox="0 0 48 70" className={className} fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="11" r="8" />
      {gender === 'f' ? (
        <path d="M24 22 L9 58 L19 58 L24 66 L29 58 L39 58 Z" />
      ) : (
        <path d="M11 26 L37 26 L24 62 Z" />
      )}
    </svg>
  );
}

function TeamSection() {
  return (
    <section className="relative bg-bone-100/30 py-24">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="stamp text-gold-300">— THE STUDIO</p>
            <Reveal>
              <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">
                The hands <span className="font-titling not-italic font-medium text-gold-500">behind the lines</span>.
              </h2>
            </Reveal>
          </div>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.08}>
              <div className="group relative overflow-hidden rounded-2xl border border-ink-900/10 bg-white">
                <div className="relative aspect-[3/4] overflow-hidden">
                  {m.icon ? (
                    <div className="img-fallback grid h-full w-full place-items-center">
                      <PersonIcon gender={m.gender} className="h-2/5 w-auto text-ink-900/35" />
                    </div>
                  ) : (
                    <PrettyImg src={m.img} alt={m.name} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="stamp text-gold-300">{String(i + 1).padStart(2, '0')}</p>
                    <h3 className="mt-1 font-display text-2xl text-white">{m.name}</h3>
                    <p className="text-sm text-white/75">{m.role}</p>
                  </div>
                </div>
                <div className="grid grid-rows-[0fr] overflow-hidden transition-all duration-700 group-hover:grid-rows-[1fr]">
                  <div className="min-h-0 px-6 text-sm text-ink-800/70"><p className="py-6">{m.bio}</p></div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* DESIGN TEAM */}
        <div className="mt-20">
          <div className="flex items-center gap-4">
            <span className="h-px w-8 bg-gold-400" />
            <p className="stamp text-gold-300">— DESIGN TEAM</p>
          </div>
          <Reveal>
            <h3 className="mt-3 font-display text-3xl leading-tight md:text-4xl">
              The people <span className="font-titling not-italic font-medium text-gold-500">at the drawing boards</span>.
            </h3>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {DESIGN_TEAM.map((m, i) => (
              <Reveal key={m.name} delay={(i % 6) * 0.06}>
                <div className="group flex h-full flex-col items-center rounded-2xl border border-ink-900/10 bg-white p-5 text-center transition hover:border-gold-400/50 hover:shadow-soft">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-gold-400/15 to-lilac-400/20 ring-1 ring-ink-900/5 transition group-hover:from-gold-400/25 group-hover:to-lilac-400/30">
                    <PersonIcon gender={m.gender} className="h-8 w-auto text-ink-900/45" />
                  </span>
                  <p className="mt-4 font-display text-lg leading-tight text-ink-900">{m.name}</p>
                  <p className="mt-1 stamp text-[9px] text-gold-600">{m.role}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PhilosophyDeep() {
  const pillars = [
    { n: '01', t: 'Material before form',
      d: 'We begin every project by walking through a yard of stone, a workshop of oak, a foundry of cast aluminium. The material teaches us what to draw.' },
    { n: '02', t: 'The drawing is the building',
      d: 'A bad drawing makes a worse building. We treat every line, hatch and section call-out as the building itself, drawn small.' },
    { n: '03', t: 'Slowness as a discipline',
      d: 'We schedule against pace. Every project is given the time it needs — and refused the time it does not.' },
    { n: '04', t: 'Climate as a client',
      d: 'The next century is our other client, sitting silently beside the first one. Every decision is negotiated with it in mind.' },
  ];
  return (
    <section className="relative py-24">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <p className="stamp text-gold-300">— PHILOSOPHY</p>
        <Reveal>
          <h2 className="mt-3 max-w-3xl font-display text-5xl leading-tight md:text-6xl">
            Four principles <span className="font-titling not-italic font-medium text-gold-500">pinned to every wall</span>.
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {pillars.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.08}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-ink-900/10 bg-white p-10 transition hover:border-gold-400/40">
                <div className="absolute -bottom-10 -right-6 font-titling font-black text-[12rem] leading-none text-gold-400/[0.06] transition-colors duration-700 group-hover:text-gold-400/20">{p.n}</div>
                <p className="stamp text-gold-300">{p.n}</p>
                <h3 className="mt-3 font-display text-3xl leading-tight">{p.t}</h3>
                <p className="mt-4 max-w-md text-ink-800/70">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <>
      <PageHeader tag="— ABOUT THE STUDIO" title="Shaping spaces." accent="Defining experiences."
        subtitle="ADAS Architecture is a multidisciplinary consultancy based in Jeddah — architecture, interior design, supervision and design management for clients across Saudi Arabia." />
      <AboutStory />
      <VisionMission />
      <TimelineSection />
      <TeamSection />
      <PhilosophyDeep />
      <CTABand />
    </>
  );
}

/* ============================================================
 *  SERVICES PAGE
 * ==========================================================*/

function ServiceCard({ s, i }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const navigate = useNavigate();
  return (
    <motion.article ref={ref} initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate('/book/' + s.id)}
      role="button"
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/10 bg-white p-8 transition-colors duration-700 hover:border-gold-400/40 md:p-10">
      <div onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
          e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
        }}
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(202,184,232,0.28), rgba(155,204,83,0.10) 35%, transparent 60%)'
        }} />
      <div className="flex items-start justify-between">
        <p className="stamp text-gold-300">{s.no} — Service</p>
        <span className="inline-grid h-10 w-10 place-items-center rounded-full border border-ink-900/12 text-ink-800/70 transition group-hover:border-gold-300 group-hover:text-gold-300">→</span>
      </div>
      <h3 className="mt-8 font-display text-3xl leading-tight md:text-4xl">{s.name}</h3>
      <p className="mt-3 italic text-gold-300">{s.blurb}</p>
      <p className="mt-5 text-ink-800/70">{s.detail}</p>
      <ul className="mt-4 space-y-2">
        {s.points.map((pt) => (
          <li key={pt} className="flex items-center gap-3 border-t border-ink-900/10 py-2 text-sm text-ink-800/80">
            <span className="block h-px w-4 bg-gold-300" />{pt}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <span className="magnetic-btn inline-flex items-center gap-3 rounded-full bg-gold-400 px-5 py-3 stamp text-ink-900 transition group-hover:bg-gold-500 group-hover:text-white">
          {s.id === 's5' ? 'Enrol Now →' : 'Book a Session →'}
        </span>
      </div>
    </motion.article>
  );
}

function ServicesPage() {
  return (
    <>
      <PageHeader tag="— SERVICES" title="What we" accent="do."
        subtitle="Architecture, interior design, supervision, design management, BIM training and one-to-one consulting — under one studio roof." />
      <section className="relative py-12 pb-32">
        <div className="mx-auto grid w-[min(1500px,94vw)] grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((s, i) => <ServiceCard key={s.id} s={s} i={i} />)}
        </div>
      </section>
      <ProcessSection />
      <CTABand />
    </>
  );
}

/* ============================================================
 *  PROJECTS PAGE
 * ==========================================================*/

function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const wrapRef = useRef(null);
  const dragging = useRef(false);

  const onMove = useCallback((clientX) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setPos(p);
  }, []);

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return;
      onMove(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const up = () => (dragging.current = false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [onMove]);

  return (
    <section className="relative bg-bone-100/30 py-24">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="stamp text-gold-300">— BEFORE / AFTER</p>
            <Reveal>
              <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">
                A site, <span className="font-titling not-italic font-medium text-gold-500">re-imagined</span>.
              </h2>
            </Reveal>
            <p className="mt-4 max-w-xl text-ink-800/70">
              Drag the line: the same plot of land before our intervention, and after.
              Linear Park Reimagined — Seoul, 2024.
            </p>
          </div>
          <div className="hidden gap-2 stamp text-ink-700/50 md:flex">
            <span>← BEFORE</span><span>·</span><span>AFTER →</span>
          </div>
        </div>
        <Reveal>
          <div ref={wrapRef}
            className="relative mt-10 aspect-[16/9] w-full select-none overflow-hidden rounded-2xl border border-ink-900/10 no-select"
            onMouseDown={(e) => { dragging.current = true; onMove(e.clientX); }}
            onTouchStart={(e) => { dragging.current = true; onMove(e.touches[0].clientX); }}>
            <PrettyImg src="https://images.unsplash.com/photo-1502786129293-79981df4e689?auto=format&fit=crop&w=2000&q=80"
              alt="Before" className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
              <PrettyImg src="https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=2000&q=80"
                alt="After" className="absolute inset-0 h-full w-full" />
            </div>
            <div className="absolute inset-y-0" style={{ left: pos + '%' }}>
              <div className="absolute inset-y-0 -translate-x-1/2 border-l border-gold-300/80" />
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-14 w-14 place-items-center rounded-full bg-gold-400 text-ink-950 shadow-glow">
                <span className="flex items-center gap-1 text-sm"><span>‹</span><span>›</span></span>
              </div>
            </div>
            <div className="pointer-events-none absolute left-4 top-4 stamp rounded-full bg-white/70 px-3 py-1 text-bone-100">BEFORE</div>
            <div className="pointer-events-none absolute right-4 top-4 stamp rounded-full bg-gold-400/90 px-3 py-1 text-ink-950">AFTER</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ProjectsGrid() {
  const [active, setActive] = useState('All');
  const [openId, setOpenId] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(0);
  const filtered = useMemo(() => (active === 'All' ? PROJECTS : PROJECTS.filter((p) => p.category === active)), [active]);
  const open = filtered.find((p) => p.id === openId) || PROJECTS.find((p) => p.id === openId);

  useEffect(() => { setHoverIdx(0); }, [active]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <section className="relative py-12">
      <div className="mx-auto w-[min(1500px,94vw)]">
        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setActive(c)}
              className={'magnetic-btn relative rounded-full border px-5 py-2 text-[11px] uppercase tracking-widest-2 transition ' +
                (active === c
                  ? 'border-gold-400 bg-gold-400/15 text-gold-600'
                  : 'border-ink-900/12 text-ink-800/80 hover:border-gold-400 hover:text-gold-600')}>
              {c}
            </button>
          ))}
          <span className="ml-auto stamp text-ink-700/50">
            {String(filtered.length).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')} PROJECTS
          </span>
        </div>

        {/* Expanding horizontal-strip accordion (desktop) */}
        <div className="mt-10 hidden h-[70vh] min-h-[480px] gap-2 md:flex">
          {filtered.map((p, i) => {
            const isHover = hoverIdx === i;
            return (
              <button key={p.id}
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => setOpenId(p.id)}
                style={{ flex: isHover ? 10 : 1 }}
                className="group relative isolate min-w-[60px] overflow-hidden rounded-2xl border border-ink-900/8 text-left transition-[flex] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
                {/* photo */}
                <img src={p.img} alt={p.title}
                  className={'absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out ' + (isHover ? 'scale-100' : 'scale-[1.18]')} />
                {/* gradient */}
                <span className={'absolute inset-0 transition-opacity duration-500 ' + (isHover ? 'bg-gradient-to-t from-ink-900/80 via-ink-900/15 to-transparent opacity-100' : 'bg-ink-900/55 opacity-100')} />

                {/* COLLAPSED label — vertical title down the strip */}
                <span className={'absolute inset-0 flex items-end justify-center pb-6 transition-opacity duration-300 ' + (isHover ? 'opacity-0' : 'opacity-100')}>
                  <span className="flex flex-col items-center gap-3 text-white">
                    <span className="stamp text-[9px] text-gold-300">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-display text-xl whitespace-nowrap [writing-mode:vertical-rl] [transform:rotate(180deg)]">{p.title}</span>
                    <span className="stamp text-[9px] text-white/60">{p.year}</span>
                  </span>
                </span>

                {/* HOVERED content */}
                <span className={'absolute inset-0 flex flex-col justify-end p-8 transition-all duration-700 ' + (isHover ? 'translate-y-0 opacity-100 delay-200' : 'translate-y-3 opacity-0')}>
                  <span className="flex items-center gap-3 stamp text-gold-300">
                    <span>{String(i + 1).padStart(2, '0')}</span><span>·</span>
                    <span>{p.category}</span><span>·</span>
                    <span>{p.year}</span>
                  </span>
                  <h3 className="mt-3 font-display text-4xl leading-tight text-white md:text-6xl">{p.title}</h3>
                  <p className="mt-2 text-white/85">{p.location} · {p.size}</p>
                  <p className="mt-4 max-w-xl text-sm italic text-white/85">{p.tagline}</p>
                  <span className="mt-6 inline-flex items-center gap-2 stamp text-gold-300">OPEN PROJECT →</span>
                </span>

                {/* glow line at top when hovered */}
                <span className={'absolute inset-x-4 top-3 h-px bg-gold-400 transition-opacity duration-500 ' + (isHover ? 'opacity-100' : 'opacity-0')} />
              </button>
            );
          })}
        </div>

        {/* Mobile fallback: clean stacked cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:hidden">
          {filtered.map((p, i) => (
            <button key={p.id} onClick={() => setOpenId(p.id)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl text-left">
              <img src={p.img} alt={p.title} className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
                <span className="stamp text-gold-300">{String(i + 1).padStart(2, '0')} · {p.category} · {p.year}</span>
                <span className="font-display text-2xl">{p.title}</span>
                <span className="text-sm text-white/75">{p.location}</span>
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-10 text-center text-ink-700/60">No projects in this category yet.</p>
        )}
      </div>

      <AnimatePresence>
        {open && <ProjectModal project={open} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </section>
  );
}

function ProjectModal({ project, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] grid place-items-center bg-ink-900/40 px-4 py-10 backdrop-blur-xl"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass relative max-h-[88vh] w-[min(1100px,96vw)] overflow-y-auto rounded-2xl">
        <div className="relative aspect-[16/9] overflow-hidden">
          <PrettyImg src={project.img} alt={project.title} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
          <button onClick={onClose}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-ink-900/40 text-white transition hover:border-gold-300 hover:text-gold-300"
            aria-label="Close">
            <span className="relative block h-4 w-4">
              <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-current" />
              <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-current" />
            </span>
          </button>
          <div className="absolute inset-x-0 bottom-0 p-8">
            <p className="stamp text-gold-300">{project.category} · {project.year}</p>
            <h3 className="mt-2 font-display text-4xl leading-tight text-white md:text-6xl">{project.title}</h3>
            <p className="mt-2 text-white/80">{project.location} · {project.size}</p>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6 p-8">
          <div className="col-span-12 md:col-span-7">
            <p className="text-lg italic text-gold-300">{project.tagline}</p>
            <p className="mt-5 text-ink-800/75">
              {project.title} was developed across an eighteen-month design phase and twenty-six
              months of construction. The project was led from our {project.location.split(',')[0]} desk,
              with structural and façade consultation through our engineering atelier. The building
              opened in {project.year} to public and critical reception.
            </p>
            <p className="mt-5 text-ink-800/75">
              The design centres on a single material gesture — a continuous architectural line that
              binds the elevation, the section and the plan. Inside, light is treated as a primary
              material; outside, the building keeps a quiet conversation with its city.
            </p>
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {[['Role', project.role], ['Location', project.location], ['Size', project.size],
                ['Year', project.year], ['Status', 'Built'], ['Award', 'Domus 100, 2024']
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="stamp text-ink-700/50">{k}</p>
                  <p className="mt-1 text-ink-800/90">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 border-t border-ink-900/10 pt-6">
              <p className="stamp text-ink-700/50">Press</p>
              <p className="mt-2 text-ink-800/80">Featured in Dezeen, Domus, Wallpaper* and Frame magazine.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProjectsPage() {
  return (
    <>
      <PageHeader tag="— PORTFOLIO" title="Project" accent="Portfolio."
        subtitle="Eighty-plus residential, commercial and hospitality projects across Saudi Arabia — filter by category, click a tile to step inside." />
      <ProjectsGrid />
      <BeforeAfter />
      <CTABand />
    </>
  );
}

/* ============================================================
 *  CONTACT PAGE
 * ==========================================================*/

function Field({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="stamp text-ink-700/60">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
        className="mt-2 w-full border-b border-ink-900/12 bg-transparent py-3 text-ink-900 outline-none transition placeholder:text-ink-700/40 focus:border-gold-300" />
    </div>
  );
}

function ContactForm() {
  const [data, setData] = useState({ name: '', email: '', budget: '', service: 'Architectural Design', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 1100);
  };
  return (
    <div className="relative">
      <AnimatePresence>
        {sent && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-white/85 backdrop-blur-md">
            <div className="text-center">
              <svg viewBox="0 0 60 60" className="mx-auto h-20 w-20 text-gold-300">
                <motion.circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="1"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
                <motion.path d="M18 30 L27 39 L43 22" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.6 }} />
              </svg>
              <h3 className="mt-6 font-display text-3xl">Letter received.</h3>
              <p className="mt-2 max-w-md text-ink-800/70">
                Thank you, {data.name || 'friend'}. One of our partners will write back within two working days.
              </p>
              <button onClick={() => {
                setSent(false);
                setData({ name: '', email: '', budget: '', service: 'Architectural Design', message: '' });
              }}
                className="mt-8 rounded-full border border-gold-300/40 px-6 py-3 stamp text-gold-300 hover:bg-gold-300/10">
                Send another →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={submit} className="glass space-y-8 rounded-2xl p-8 md:p-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Your name" value={data.name} onChange={set('name')} required />
          <Field label="Email" type="email" value={data.email} onChange={set('email')} required />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Estimated budget" value={data.budget} onChange={set('budget')} placeholder="USD 2M — 8M" />
          <div>
            <label className="stamp text-ink-700/60">Service</label>
            <select value={data.service} onChange={set('service')}
              className="mt-2 w-full appearance-none border-b border-ink-900/12 bg-transparent py-3 text-ink-900 outline-none transition focus:border-gold-300">
              {SERVICES.map((s) => (<option key={s.id} className="bg-white text-ink-900">{s.name}</option>))}
              <option className="bg-white text-ink-900">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="stamp text-ink-700/60">Tell us about the project</label>
          <textarea rows={6} value={data.message} onChange={set('message')} required
            className="mt-2 w-full resize-none border-b border-ink-900/12 bg-transparent py-3 text-ink-900 outline-none transition placeholder:text-ink-700/40 focus:border-gold-300"
            placeholder="A site, a programme, a feeling, a deadline — anything that helps us imagine the room." />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="stamp text-ink-700/50">WE REPLY WITHIN 2 WORKING DAYS</p>
          <button type="submit" disabled={sending}
            className="magnetic-btn group inline-flex items-center gap-3 rounded-full bg-gold-400 px-8 py-3.5 stamp text-ink-950 transition hover:bg-gold-300 disabled:opacity-60">
            {sending ? 'SENDING…' : 'SEND THE LETTER'}
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function FuturisticMap() {
  return (
    <section className="relative isolate overflow-hidden border-t border-ink-900/10 bg-white py-24">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="stamp text-gold-300">— FIND THE STUDIO</p>
            <Reveal>
              <h2 className="mt-3 font-display text-5xl leading-tight md:text-6xl">
                Three workrooms, <span className="font-titling not-italic font-medium text-gold-500">one practice</span>.
              </h2>
            </Reveal>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-gold-400/20 bg-bone-100">
              <svg viewBox="0 0 1200 720" className="absolute inset-0 h-full w-full">
                <defs>
                  <pattern id="mapgrid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M60 0 L0 0 0 60" fill="none" stroke="rgba(155,204,83,0.15)" strokeWidth="0.5" />
                  </pattern>
                  <radialGradient id="ping" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#b8dc7a" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#9bcc53" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#9bcc53" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="1200" height="720" fill="url(#mapgrid)" />
                <g fill="none" stroke="rgba(155,204,83,0.45)" strokeWidth="1.1" strokeLinejoin="round">
                  <path d="M180 290 Q260 240 320 280 Q360 320 340 380 Q300 430 250 410 Q200 380 180 340 Z" />
                  <path d="M520 200 Q620 180 690 240 Q760 320 730 400 Q650 450 580 420 Q500 360 520 280 Z" />
                  <path d="M820 240 Q920 220 990 280 Q1060 350 1010 420 Q930 460 860 410 Q800 340 820 280 Z" />
                  <path d="M360 460 Q420 480 460 520 Q470 580 420 600 Q360 590 340 540 Z" />
                </g>
                <g fill="none" stroke="#9bcc53" strokeWidth="1.2" strokeDasharray="6 6" opacity="0.7">
                  <motion.path d="M610 340 Q780 200 920 320"
                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: 'easeInOut' }} viewport={{ once: true }} />
                  <motion.path d="M610 340 Q500 240 420 300"
                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 0.3, ease: 'easeInOut' }} viewport={{ once: true }} />
                </g>
                {[
                  { x: 610, y: 360, name: 'JEDDAH', tag: 'STUDIO', big: true },
                  { x: 670, y: 340, name: 'RIYADH', tag: 'ACTIVE PROJECT' },
                  { x: 620, y: 320, name: 'AL ULA', tag: 'RESORT' },
                ].map((p) => (
                  <g key={p.name} transform={`translate(${p.x},${p.y})`}>
                    <motion.circle r="40" fill="url(#ping)"
                      animate={{ scale: [0.6, 1.4], opacity: [0.7, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }} />
                    <circle r={p.big ? 10 : 7} fill="#9bcc53" />
                    <circle r={p.big ? 4 : 3} fill="#231f20" />
                    <g transform="translate(16, 4)" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '0.3em' }}>
                      <text fontSize="12" fill="#f4eada">{p.name}</text>
                      <text fontSize="9" y="14" fill="#9bcc53">{p.tag}</text>
                    </g>
                  </g>
                ))}
              </svg>
              <div className="absolute left-4 top-4 stamp text-gold-300/80">ADAS · GLOBAL ATLAS · 2026</div>
              <div className="absolute bottom-4 right-4 stamp text-gold-300/60">PROJ · MOLLWEIDE</div>
            </div>
          </div>
          <div className="col-span-12 space-y-3 lg:col-span-4">
            {[
              { city: 'Jeddah', addr: 'Jada 30, Al-Madinah Rd, Obhor Al-Janobiya', tag: 'STUDIO' },
              { city: 'Riyadh', addr: 'Knowledge City Business Park · On-site', tag: 'PROJECT' },
              { city: 'Al Ula', addr: 'Al Ula Resort · Active site', tag: 'PROJECT' },
            ].map((o, i) => (
              <Reveal key={o.city} delay={i * 0.08}>
                <div className="glass flex items-center justify-between rounded-2xl p-5">
                  <div>
                    <p className="stamp text-gold-300">{o.tag}</p>
                    <p className="mt-1 font-display text-2xl">{o.city}</p>
                    <p className="text-sm text-ink-800/70">{o.addr}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-ink-900/12 text-ink-800/70">→</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactPage() {
  return (
    <>
      <PageHeader tag="— LET'S CONNECT" title="Get in" accent="Touch."
        subtitle="Tell us about your project and our team will respond within 24 hours. Architecture, interiors, supervision, BIM courses or a quick consultation — we're listening." />
      <section className="relative pb-24">
        <div className="mx-auto grid w-[min(1500px,94vw)] grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-7"><ContactForm /></div>
          <div className="col-span-12 space-y-5 lg:col-span-5">
            <div className="glass rounded-2xl p-8">
              <p className="stamp text-gold-300">— WRITE TO US</p>
              <p className="mt-4 font-display text-3xl leading-tight">office@adas.com.sa</p>
              <p className="mt-1 stamp text-ink-700/50">NEW PROJECTS · PRESS · GENERAL</p>
              <div className="mt-6 border-t border-ink-900/10 pt-6">
                <p className="font-display text-2xl">+966 55 859 3937</p>
                <p className="mt-1 stamp text-ink-700/50">WHATSAPP · 09 — 17 GMT+3</p>
              </div>
              <div className="mt-6 border-t border-ink-900/10 pt-6">
                <p className="font-display text-2xl">Jada 30, Al-Madinah Rd</p>
                <p className="mt-1 text-ink-800/70">Obhor Al-Janobiya, Jeddah</p>
              </div>
            </div>
            <div className="glass rounded-2xl p-8">
              <p className="stamp text-gold-300">— FOLLOW US</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { l: 'WhatsApp', h: '+966 55 859 3937' }, { l: 'Instagram', h: '@adas.architecture' },
                  { l: 'LinkedIn', h: '/adas-architecture' }, { l: 'Behance', h: '/adasarchitecture' },
                  { l: 'X', h: '@adas_ksa' }, { l: 'Maps', h: 'View on Google' },
                ].map((s) => (
                  <a href="#" onClick={(e) => e.preventDefault()} key={s.l}
                    className="group flex flex-col items-start rounded-xl border border-ink-900/10 p-3 transition hover:border-gold-300">
                    <span className="stamp text-ink-700/50 group-hover:text-gold-300">{s.l}</span>
                    <span className="mt-1 text-sm text-ink-900">{s.h}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-8">
              <p className="stamp text-gold-300">— OPENING HOURS</p>
              <div className="mt-4 space-y-2 text-ink-800/80">
                <div className="flex justify-between"><span>Sun — Thu</span><span className="stamp text-ink-700/70">09:00 — 18:00</span></div>
                <div className="flex justify-between"><span>Fri</span><span className="stamp text-ink-700/70">10:00 — 14:00</span></div>
                <div className="flex justify-between"><span>Sat</span><span className="stamp text-ink-700/70">CLOSED</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <FuturisticMap />
    </>
  );
}

/* ============================================================
 *  FLOATING ACTIONS + EASTER EGG
 * ==========================================================*/

function FloatingActions() {
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setShow(v > 500));
    return () => unsub();
  }, [scrollY]);
  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">
      <a href="https://wa.me/966558593937" target="_blank" rel="noopener"
        className="magnetic-btn glass group grid h-12 w-12 place-items-center rounded-full text-ink-900 shadow-soft transition hover:text-gold-300"
        aria-label="WhatsApp">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </a>
      <a href="mailto:office@adas.com.sa"
        className="magnetic-btn glass group grid h-12 w-12 place-items-center rounded-full text-ink-900 shadow-soft transition hover:text-gold-300"
        aria-label="Email">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </a>
      <AnimatePresence>
        {show && (
          <motion.button initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="grid h-12 w-12 place-items-center rounded-full bg-gold-400 text-ink-950 shadow-glow hover:bg-gold-300"
            aria-label="Back to top">↑</motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

function EasterEgg() {
  const [open, setOpen] = useState(false);
  const buffer = useRef([]);
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buffer.current = [...buffer.current, k].slice(-KONAMI.length);
      if (buffer.current.join(',') === KONAMI.join(',')) {
        setOpen(true);
        buffer.current = [];
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[180] grid place-items-center bg-white/95" onClick={() => setOpen(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[min(720px,90vw)] rounded-3xl border border-gold-400/40 bg-bone-100 p-10 text-center">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-blueprint-grid bg-grid opacity-30" />
            <FloatingParticles count={20} />
            <p className="stamp text-gold-300">// HIDDEN ROOM UNLOCKED</p>
            <h3 className="mt-4 font-display text-5xl">
              You found the <span className="font-titling not-italic font-medium text-gold-500">draughtsman's table</span>.
            </h3>
            <p className="mx-auto mt-4 max-w-md text-ink-800/70">
              A small confession: ADAS started as a drawing of a building that never got
              built. We keep the original pencil sketch above the front door.
            </p>
            <svg viewBox="0 0 200 120" className="mx-auto mt-8 h-32 w-64">
              <g fill="none" stroke="#9bcc53" strokeWidth="0.8" strokeLinecap="round">
                {['M10 100 L40 30 L70 100 L100 50 L130 100 L160 40 L190 100',
                  'M10 100 L190 100',
                  'M40 30 L40 80', 'M70 100 L70 70', 'M100 50 L100 100', 'M130 100 L130 70', 'M160 40 L160 90',
                ].map((d, i) => (
                  <path key={i} d={d} strokeDasharray="500" strokeDashoffset="500"
                    style={{ animation: `draw 1.4s ${i * 0.12}s cubic-bezier(0.77,0,0.18,1) forwards`, '--len': 500 }} />
                ))}
              </g>
            </svg>
            <button onClick={() => setOpen(false)}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold-300/40 px-6 py-3 stamp text-gold-300 hover:bg-gold-300/10">
              CLOSE THE ROOM (ESC)
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
 *  PAGE SWITCHER (uses our hash router)
 * ==========================================================*/

/* ============================================================
 *  BOOK PAGE — multi-step sign-up → calendar → confirm/pay
 *  Note: real email + payment require a backend or 3rd-party
 *  service (Stripe, EmailJS, Formspree). This UI simulates both.
 * ==========================================================*/

const ENGINEERS = [
  { id: 'kareem', name: 'Abdulkareem Adas',     role: 'Chairman · CPO',       email: 'abdulkareem.a@adas.com.sa', img: './Abdulkareem-Adas.jpeg' },
  { id: 'mohsin', name: 'Dr. Abdulmohsin Adas', role: 'Vice Chairman · CEO',  email: 'abdulmohsin.a@adas.com.sa', img: './Dr.Abdulmohsin-Adas.jpeg' },
];

/* Per-service default contact (the user can still pick the other engineer) */
const TEAM_DEFAULT = {
  s1: 'kareem', s2: 'mohsin', s3: 'kareem',
  s4: 'mohsin', s5: 'mohsin', s6: 'mohsin',
};

/* 17:00 — 21:00, evening sessions */
const TIME_SLOTS = ['17:00', '18:00', '19:00', '20:00', '21:00'];

/* Bookings backend — paste your Google Apps Script Web App URL (ends with /exec).
 * Leave '' to run the site without availability sync (nothing is closed/saved). */
const BOOKINGS_API = '';

/* A slot is unique per date + time + engineer; a Revit course is unique per week + engineer. */
const slotKey = (date, time, eng) => `S|${date}|${time}|${eng}`;
const weekKey = (week, eng) => `W|${week}|${eng}`;

/* Revit / BIM packages — split by track (Student / Professional) */
const REVIT_PACKS = {
  professional: [
    { id: 'p-beg',  label: 'Revit Beginner — 7 days',     fee: 2000, suffix: 'SAR', sub: '7-day course · 3-hour sessions per day' },
    { id: 'p-adv',  label: 'Revit Advanced — 7 days',     fee: 3000, suffix: 'SAR', sub: '7-day course · 3-hour sessions per day' },
  ],
  student: [
    { id: 's-beg',  label: 'Revit Beginner — 7 days',          fee: 1800, suffix: 'SAR',     sub: '7-day course · student rate' },
    { id: 's-adv',  label: 'Revit Advanced — 7 days',          fee: 2200, suffix: 'SAR',     sub: '7-day course · student rate' },
  ],
};

/* 1-on-1 Consulting — split by track (Professional / Student) */
const CONSULT_PACKS = {
  professional: [
    { id: 'c-bim', label: 'BIM Professional Session', fee: 300, suffix: 'SAR', sub: '60-minute one-to-one technical support' },
    { id: 'c-rev', label: 'Design Review Session',    fee: 500, suffix: 'SAR', sub: '60-minute professional consultation' },
  ],
  student: [
    { id: 'c-int',  label: 'Graduation Project — Intensive',  fee: 700,  suffix: 'SAR',     sub: '2-hour one-time comprehensive review' },
    { id: 'c-ment', label: 'Graduation Project — Mentorship', fee: 1200, suffix: 'SAR / mo', sub: '4 physical + 4 online sessions / month' },
  ],
};

/* services that use the 2-track picker + payment flow */
const TRACK_PACKS = { s5: REVIT_PACKS, s6: CONSULT_PACKS };
const TRACK_META = {
  s5: {
    label: 'REVIT / BIM TRAINING',
    intro: 'Different packages and rates for students and professionals. Pick the one that fits you.',
    professional: 'For architects, engineers, BIM coordinators and offices.',
    student: 'For architecture & engineering students working on academic projects.',
  },
  s6: {
    label: '1-ON-1 CONSULTING',
    intro: 'Sessions and rates for students and professionals. Pick the track that fits you.',
    professional: 'One-to-one technical support and design reviews for practitioners.',
    student: 'Graduation-project reviews and mentorship for students.',
  },
};
const fmtSAR = (n) => n.toLocaleString('en-US');

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* upcoming course weeks — each starts on a Saturday (KSA work week Sat–Thu) */
function upcomingWeeks(count = 8) {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  d.setDate(d.getDate() + (((6 - d.getDay() + 7) % 7) || 7)); // next Saturday
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(isoOf(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/* "6 — 12 Jun 2026" : the 7-day span of a course week from its Saturday start */
function fmtWeekRange(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sd = start.getDate();
  const ed = end.getDate();
  const sMon = start.toLocaleDateString('en-GB', { month: 'short' });
  const eMon = end.toLocaleDateString('en-GB', { month: 'short' });
  return sameMonth
    ? `${sd} — ${ed} ${eMon} ${end.getFullYear()}`
    : `${sd} ${sMon} — ${ed} ${eMon} ${end.getFullYear()}`;
}

function PayMark({ id, className = 'h-6 w-auto' }) {
  switch (id) {
    case 'mada':
      return (
        <span className={'flex items-center gap-[2px] font-bold lowercase ' + className} style={{ fontFamily: 'Manrope', letterSpacing: '-0.02em' }}>
          <span style={{ color: '#84B540' }}>m</span>
          <span style={{ color: '#231F20' }}>a</span>
          <span style={{ color: '#231F20' }}>d</span>
          <span style={{ color: '#1E78C2' }}>a</span>
        </span>
      );
    case 'visa':
      return (
        <span className={'font-black italic ' + className} style={{ fontFamily: 'Manrope', color: '#1A1F71', letterSpacing: '-0.02em' }}>VISA</span>
      );
    case 'master':
      return (
        <span className={'relative inline-flex items-center ' + className}>
          <span className="block h-5 w-5 rounded-full" style={{ background: '#EB001B' }} />
          <span className="-ml-2 block h-5 w-5 rounded-full mix-blend-multiply" style={{ background: '#F79E1B' }} />
        </span>
      );
    case 'amex':
      return (
        <span className={'rounded px-2 py-1 text-[10px] font-black tracking-widest ' + className} style={{ background: '#2E77BB', color: 'white' }}>AMEX</span>
      );
    case 'apple':
      return (
        <span className={'flex items-center gap-1 ' + className} style={{ color: '#231F20' }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M16.36 12.7c-.02-2.66 2.17-3.94 2.27-4-1.24-1.81-3.17-2.06-3.85-2.09-1.64-.17-3.2.97-4.04.97-.84 0-2.12-.95-3.49-.92-1.8.03-3.46 1.05-4.39 2.66-1.87 3.25-.48 8.05 1.34 10.69.89 1.29 1.95 2.74 3.34 2.69 1.34-.05 1.85-.87 3.48-.87 1.62 0 2.08.87 3.5.84 1.45-.02 2.36-1.31 3.25-2.61 1.02-1.5 1.45-2.95 1.47-3.03-.03-.01-2.82-1.08-2.88-4.31zM13.75 4.94c.74-.9 1.24-2.14 1.1-3.38-1.07.04-2.36.71-3.13 1.6-.69.79-1.29 2.06-1.13 3.27 1.2.09 2.42-.61 3.16-1.49z" />
          </svg>
          <span className="text-sm font-medium">Pay</span>
        </span>
      );
    case 'bank':
      return (
        <span className={'flex items-center gap-1 text-ink-900 ' + className}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 10l9-6 9 6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-semibold">Bank</span>
        </span>
      );
    default:
      return null;
  }
}

function MiniCalendar({ value, onPick }) {
  const today = new Date();
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
  const monthEnd = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay(); // 0 Sun
  const daysInMonth = monthEnd.getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isPast = (d) => d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isFri = (d) => d.getDay() === 5;
  const monthLabel = view.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-full border border-ink-900/12 text-ink-800/70 hover:border-gold-300 hover:text-gold-600">←</button>
        <span className="stamp text-ink-800">{monthLabel}</span>
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-full border border-ink-900/12 text-ink-800/70 hover:border-gold-300 hover:text-gold-600">→</button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center stamp text-ink-700/50">
        {['S','M','T','W','T','F','S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={i} className="aspect-square" />;
          const dStr = fmt(d);
          const disabled = isPast(d) || isFri(d);
          const picked = value === dStr;
          return (
            <button key={i}
              disabled={disabled}
              onClick={() => onPick(dStr)}
              className={
                'aspect-square rounded-md text-sm transition ' +
                (picked
                  ? 'bg-gold-400 text-ink-900 font-semibold'
                  : disabled
                  ? 'text-ink-700/25'
                  : 'text-ink-900 hover:bg-gold-400/15')
              }>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const serviceId = pathname.split('/')[2] || 's1';
  const service = SERVICES.find((s) => s.id === serviceId) || SERVICES[0];
  const isRevit = service.id === 's5';
  const trackPackData = TRACK_PACKS[service.id] || null;  // s5 (Revit) & s6 (Consulting)
  const isTracked = !!trackPackData;
  const [engineerId, setEngineerId] = useState(TEAM_DEFAULT[service.id] || 'kareem');
  const team = ENGINEERS.find((e) => e.id === engineerId) || ENGINEERS[0];
  const [trackId, setTrackId] = useState(null);  // 'professional' | 'student'
  const [packId, setPackId] = useState(null);
  const packs = trackId && trackPackData ? trackPackData[trackId] : [];
  const pack = packs.find((p) => p.id === packId) || packs[0] || (trackPackData ? trackPackData.professional[0] : null);
  const chooseTrack = (t) => { setTrackId(t); setPackId(trackPackData[t][0].id); };
  const [payMethod, setPayMethod] = useState('mada');  // mada | visa | master | amex | apple | bank
  const [bankAck, setBankAck] = useState(false);

  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: '', email: '', phone: '', company: '', message: '',
    date: '', time: '', week: '',
    card: '', exp: '', cvv: '', cardName: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e?.target ? e.target.value : e }));

  /* Shared availability — taken slots fetched from the bookings sheet on mount */
  const [taken, setTaken] = useState([]);
  useEffect(() => {
    if (!BOOKINGS_API) return;
    let alive = true;
    fetch(BOOKINGS_API)
      .then((r) => r.json())
      .then((d) => { if (alive && d && d.ok) setTaken(d.slots || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const takenSet = useMemo(() => {
    const s = new Set();
    taken.forEach((b) => {
      if (b.week) s.add(weekKey(b.week, b.engineerId));
      else if (b.date && b.time) s.add(slotKey(b.date, b.time, b.engineerId));
    });
    return s;
  }, [taken]);
  const isSlotTaken = (date, time) => takenSet.has(slotKey(date, time, engineerId));
  const isWeekTaken = (week) => takenSet.has(weekKey(week, engineerId));

  const canStep1 = data.name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) && data.phone.length >= 6;
  const canStep2 = isRevit
    ? (!!data.week && !isWeekTaken(data.week))
    : (data.date && data.time && !isSlotTaken(data.date, data.time));
  const cardValid = data.card.replace(/\s/g,'').length >= 12 && data.exp && data.cvv && data.cardName;
  const isCardMethod = ['mada','visa','master','amex'].includes(payMethod);
  const canStep3 = !isTracked
    || payMethod === 'apple'
    || (payMethod === 'bank' && bankAck)
    || (isCardMethod && cardValid);

  const submit = async () => {
    setBusy(true);
    const payload = {
      serviceId: service.id, serviceName: service.name,
      track: trackId || '', packageId: packId || '',
      packageLabel: pack ? pack.label : '', fee: pack ? pack.fee : '',
      currency: pack ? pack.suffix : 'SAR',
      engineerId, engineerName: team.name, engineerEmail: team.email,
      date: data.date, time: data.time, week: data.week,
      name: data.name, email: data.email, phone: data.phone,
      company: data.company, payMethod: isTracked ? payMethod : '',
      message: data.message,
    };
    if (BOOKINGS_API) {
      try {
        await fetch(BOOKINGS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
      } catch (_) { /* keep the UX flowing even if the sheet write fails */ }
    } else {
      await new Promise((r) => setTimeout(r, isTracked ? 1700 : 1100));
    }
    /* close the slot locally so it shows taken immediately */
    setTaken((prev) => [...prev, { date: data.date, time: data.time, week: data.week, engineerId }]);
    setBusy(false);
    setDone(true);
  };

  /* ── TRACK PICKER (Revit & Consulting — shown before anything else) ── */
  if (isTracked && !trackId) {
    const meta = TRACK_META[service.id];
    return (
      <section className="relative isolate min-h-screen overflow-hidden bg-bone-50 pt-32 pb-24">
        <div className="absolute inset-0 bg-blueprint-grid bg-grid opacity-20" />
        <FloatingParticles count={12} />
        <div className="relative mx-auto w-[min(960px,94vw)]">
          <button onClick={() => navigate('/services')}
            className="stamp text-ink-700/60 hover:text-gold-600">← Back to Services</button>
          <p className="mt-6 stamp text-gold-500">— {service.no} · {meta.label}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
            Choose your <span className="font-titling not-italic font-medium text-gold-500">track</span>.
          </h1>
          <p className="mt-4 max-w-xl text-ink-800/70">
            {meta.intro}
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              { id: 'professional', t: 'Professional', d: meta.professional },
              { id: 'student',      t: 'Student',      d: meta.student },
            ].map((tr) => (
              <button key={tr.id}
                onClick={() => chooseTrack(tr.id)}
                className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/10 bg-white p-8 text-left transition hover:border-gold-400/60 hover:shadow-soft">
                <p className="stamp text-gold-500">— {tr.id === 'student' ? 'STUDENT TRACK' : 'PROFESSIONAL TRACK'}</p>
                <h3 className="mt-3 font-display text-3xl text-ink-900">{tr.t}</h3>
                <p className="mt-3 text-sm text-ink-800/70">{tr.d}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="stamp text-ink-700/60">From</span>
                  <span className="font-display text-2xl text-gold-600">{fmtSAR(Math.min(...trackPackData[tr.id].map((p) => p.fee)))}</span>
                  <span className="stamp text-ink-700/60">SAR</span>
                </div>
                <ul className="mt-5 space-y-1 text-sm text-ink-800/80">
                  {trackPackData[tr.id].map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 border-t border-ink-900/8 py-1.5">
                      <span>{p.label}</span>
                      <span className="stamp text-ink-700/60">{fmtSAR(p.fee)}</span>
                    </li>
                  ))}
                </ul>
                <span className="magnetic-btn mt-6 inline-flex items-center gap-2 self-start rounded-full bg-gold-400 px-5 py-2 stamp text-ink-900 transition group-hover:bg-gold-500 group-hover:text-white">
                  Continue as {tr.t} →
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── DONE STATE ── */
  if (done) {
    return (
      <section className="relative isolate min-h-screen overflow-hidden bg-bone-50 pt-40 pb-24">
        <FloatingParticles count={18} />
        <div className="relative mx-auto w-[min(720px,92vw)] text-center">
          <svg viewBox="0 0 60 60" className="mx-auto h-20 w-20 text-gold-500">
            <motion.circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="1"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
            <motion.path d="M18 30 L27 39 L43 22" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.6 }} />
          </svg>
          <p className="mt-6 stamp text-gold-500">— BOOKING CONFIRMED</p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
            {isTracked ? 'Payment received.' : 'Session booked.'}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-ink-800/75">
            {isRevit
              ? `Thank you, ${data.name}. Your enrolment for ${service.name} is confirmed.`
              : `Thank you, ${data.name}. Your ${service.name} session is confirmed.`}
          </p>
          <div className="glass mx-auto mt-8 grid max-w-md grid-cols-2 gap-y-3 rounded-2xl p-6 text-left">
            <span className="stamp text-ink-700/60">Service</span><span className="text-ink-900">{service.name}</span>
            <span className="stamp text-ink-700/60">Date</span><span className="text-ink-900">{fmtDate(data.date)}</span>
            <span className="stamp text-ink-700/60">Time</span><span className="text-ink-900">{data.time}</span>
            <span className="stamp text-ink-700/60">With</span><span className="text-ink-900">{team.name}</span>
            <span className="stamp text-ink-700/60">Notice</span>
            <span className="text-ink-800/80">
              We've emailed <span className="text-gold-600">{team.email}</span> with your booking details.
              You'll receive a copy at <span className="text-gold-600">{data.email}</span>.
            </span>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate('/services')}
              className="magnetic-btn rounded-full bg-gold-400 px-7 py-3 stamp text-ink-900 hover:bg-gold-500 hover:text-white">
              Back to Services
            </button>
            <button onClick={() => navigate('/')}
              className="magnetic-btn rounded-full border border-ink-900/20 px-7 py-3 stamp text-ink-900 hover:border-gold-400">
              Home →
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ── ACTIVE FORM ── */
  return (
    <section className="relative isolate overflow-hidden bg-bone-50 pt-32 pb-24">
      <div className="absolute inset-0 bg-blueprint-grid bg-grid opacity-20" />
      <FloatingParticles count={12} />
      <div className="relative mx-auto w-[min(960px,94vw)]">
        <button onClick={() => navigate('/services')}
          className="stamp text-ink-700/60 hover:text-gold-600">← Back to Services</button>
        <p className="mt-6 stamp text-gold-500">— {service.no} · {service.name.toUpperCase()}</p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          {isRevit ? 'Enrol in' : 'Book a session for'}{' '}
          <span className="font-titling not-italic font-medium text-gold-500">{service.name}</span>.
        </h1>
        <p className="mt-4 max-w-xl text-ink-800/70">{service.detail}</p>

        {/* Stepper */}
        <div className="mt-10 flex items-center gap-2">
          {[
            { n: 1, t: 'Your details' },
            { n: 2, t: isRevit ? 'Session information' : 'Pick a slot' },
            { n: 3, t: isTracked ? 'Payment' : 'Confirm' },
          ].map((st, i, arr) => (
            <React.Fragment key={st.n}>
              <div className="flex items-center gap-2">
                <span className={'grid h-7 w-7 place-items-center rounded-full stamp ' +
                  (step >= st.n ? 'bg-gold-400 text-ink-900' : 'bg-ink-900/10 text-ink-700/60')}>
                  {st.n}
                </span>
                <span className={'stamp ' + (step >= st.n ? 'text-ink-900' : 'text-ink-700/50')}>{st.t}</span>
              </div>
              {i < arr.length - 1 && <span className="mx-2 h-px flex-1 bg-ink-900/10" />}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Active step */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="glass rounded-2xl p-8 md:p-10">
                {step === 1 && (
                  <>
                    <p className="stamp text-gold-500">— STEP 01</p>
                    <h2 className="mt-2 font-display text-3xl">Tell us who you are.</h2>
                    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                      <Field label="Full name" value={data.name} onChange={set('name')} required placeholder="Khalid Al-Rashid" />
                      <Field label="Email" type="email" value={data.email} onChange={set('email')} required placeholder="you@email.com" />
                      <Field label="Phone / WhatsApp" type="tel" value={data.phone} onChange={set('phone')} required placeholder="+966 …" />
                      <Field label="Company (optional)" value={data.company} onChange={set('company')} placeholder="Studio / Firm" />
                    </div>
                    <div className="mt-5">
                      <label className="stamp text-ink-700/60">A few words about your project</label>
                      <textarea rows={4} value={data.message} onChange={set('message')}
                        className="mt-2 w-full resize-none border-b border-ink-900/12 bg-transparent py-3 text-ink-900 outline-none transition placeholder:text-ink-700/40 focus:border-gold-400"
                        placeholder="Site, programme, deadline — anything that helps us prepare." />
                    </div>
                  </>
                )}
                {step === 2 && (
                  <>
                    <p className="stamp text-gold-500">— STEP 02</p>
                    <h2 className="mt-2 font-display text-3xl">
                      {isRevit ? 'Pick your instructor & week.' : 'Pick your engineer, date & time.'}
                    </h2>
                    <p className="mt-2 text-sm text-ink-800/70">
                      {isRevit
                        ? 'Courses run Sat — Thu, 17:00 — 21:00 · 3-hour sessions per day · Fridays closed.'
                        : 'Sat — Thu, 17:00 — 21:00 · Fridays closed.'}
                    </p>

                    {/* Engineer picker */}
                    <p className="mt-6 stamp text-ink-700/60">Meet with</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {ENGINEERS.map((eng) => {
                        const active = engineerId === eng.id;
                        return (
                          <button key={eng.id}
                            onClick={() => setEngineerId(eng.id)}
                            className={
                              'group flex items-center gap-3 rounded-xl border p-3 text-left transition ' +
                              (active
                                ? 'border-gold-400 bg-gold-400/10 ring-1 ring-gold-400'
                                : 'border-ink-900/12 bg-white hover:border-gold-400/60')
                            }>
                            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-bone-100">
                              <img src={eng.img} alt={eng.name} className="h-full w-full object-cover" draggable="false" />
                            </span>
                            <span className="flex flex-col">
                              <span className="font-display text-lg leading-tight text-ink-900">{eng.name}</span>
                              <span className="stamp text-[9px] text-gold-600">{eng.role}</span>
                            </span>
                            {active && <span className="ml-auto stamp text-gold-600">SELECTED</span>}
                          </button>
                        );
                      })}
                    </div>

                    {isRevit ? (
                      <div className="mt-8">
                        <p className="stamp text-ink-700/60">Choose a course week</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {upcomingWeeks(8).map((wk) => {
                            const active = data.week === wk;
                            const booked = isWeekTaken(wk);
                            return (
                              <button key={wk}
                                disabled={booked}
                                title={booked ? 'Already booked' : undefined}
                                onClick={() => set('week')(wk)}
                                className={
                                  'flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-sm transition ' +
                                  (active
                                    ? 'border-gold-400 bg-gold-400/10 ring-1 ring-gold-400'
                                    : booked
                                    ? 'border-ink-900/8 bg-ink-900/[0.02] text-ink-700/30'
                                    : 'border-ink-900/12 bg-white hover:border-gold-400/60')
                                }>
                                <span className={booked ? 'text-ink-700/40 line-through' : 'text-ink-900'}>{fmtWeekRange(wk)}</span>
                                {booked ? <span className="stamp text-ink-700/40">BOOKED</span> : active && <span className="stamp text-gold-600">SELECTED</span>}
                              </button>
                            );
                          })}
                        </div>
                        {data.week && (
                          <p className="mt-4 text-sm text-ink-800/70">
                            Selected week: <span className="text-gold-600">{fmtWeekRange(data.week)}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                    <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                      <MiniCalendar value={data.date} onPick={(d) => setData((p) => ({ ...p, date: d, time: '' }))} />
                      <div>
                        <p className="stamp text-ink-700/60">Time slots</p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {TIME_SLOTS.map((t) => {
                            const booked = data.date && isSlotTaken(data.date, t);
                            return (
                            <button key={t}
                              disabled={!data.date || booked}
                              title={booked ? 'Already booked' : undefined}
                              onClick={() => set('time')(t)}
                              className={
                                'rounded-md px-3 py-2 text-sm stamp transition ' +
                                (data.time === t
                                  ? 'bg-gold-400 text-ink-900'
                                  : booked
                                  ? 'border border-ink-900/8 text-ink-700/30 line-through'
                                  : data.date
                                  ? 'border border-ink-900/12 text-ink-800/80 hover:border-gold-400'
                                  : 'border border-ink-900/8 text-ink-700/30')
                              }>
                              {t}
                            </button>
                            );
                          })}
                        </div>
                        {data.date && (
                          <p className="mt-4 text-sm text-ink-800/70">
                            Selected: <span className="text-gold-600">{fmtDate(data.date)}{data.time && ' · ' + data.time}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    )}
                  </>
                )}
                {step === 3 && !isTracked && (
                  <>
                    <p className="stamp text-gold-500">— STEP 03</p>
                    <h2 className="mt-2 font-display text-3xl">Confirm your booking.</h2>
                    <p className="mt-2 text-sm text-ink-800/70">A summary email goes to you and to {team.name}.</p>
                    <div className="mt-6 grid grid-cols-2 gap-y-3 rounded-xl border border-ink-900/10 bg-white p-6">
                      <span className="stamp text-ink-700/60">Service</span><span className="text-ink-900">{service.name}</span>
                      <span className="stamp text-ink-700/60">Date</span><span className="text-ink-900">{fmtDate(data.date)}</span>
                      <span className="stamp text-ink-700/60">Time</span><span className="text-ink-900">{data.time}</span>
                      <span className="stamp text-ink-700/60">With</span><span className="text-ink-900">{team.name}</span>
                      <span className="stamp text-ink-700/60">Name</span><span className="text-ink-900">{data.name}</span>
                      <span className="stamp text-ink-700/60">Email</span><span className="text-ink-900">{data.email}</span>
                      <span className="stamp text-ink-700/60">Phone</span><span className="text-ink-900">{data.phone}</span>
                    </div>
                  </>
                )}
                {step === 3 && isTracked && (
                  <>
                    <p className="stamp text-gold-500">— STEP 03 · PAYMENT</p>
                    <h2 className="mt-2 font-display text-3xl">{isRevit ? 'Secure your seat.' : 'Secure your session.'}</h2>
                    <p className="mt-2 text-sm text-ink-800/70">
                      {pack.label} — {pack.sub}
                    </p>
                    <div className="mt-6 flex items-end justify-between rounded-xl bg-gold-400/15 px-5 py-4">
                      <div>
                        <p className="stamp text-ink-700/70">Total to pay · {pack.label}</p>
                        <p className="mt-1 font-display text-3xl text-ink-900">{fmtSAR(pack.fee)} <span className="text-base">{pack.suffix}</span></p>
                      </div>
                      <p className="stamp text-gold-600">VAT INCLUDED</p>
                    </div>

                    {/* Payment method picker */}
                    <p className="mt-6 stamp text-ink-700/60">Payment method</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {[
                        { id: 'mada',   label: 'mada' },
                        { id: 'visa',   label: 'VISA' },
                        { id: 'master', label: 'Mastercard' },
                        { id: 'amex',   label: 'AMEX' },
                        { id: 'apple',  label: ' Pay' },
                        { id: 'bank',   label: 'Bank' },
                      ].map((m) => {
                        const active = payMethod === m.id;
                        return (
                          <button key={m.id}
                            onClick={() => setPayMethod(m.id)}
                            className={
                              'group flex h-16 items-center justify-center rounded-lg border transition ' +
                              (active
                                ? 'border-gold-400 bg-gold-400/10 ring-1 ring-gold-400'
                                : 'border-ink-900/10 bg-white hover:border-gold-400/60')
                            }>
                            <PayMark id={m.id} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Method-specific content */}
                    <div className="mt-6">
                      {isCardMethod && (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                          <Field label="Cardholder name" value={data.cardName} onChange={set('cardName')} required placeholder="As printed on card" />
                          <Field label="Card number" value={data.card} onChange={(e) => set('card')({ target: { value: e.target.value.replace(/[^0-9 ]/g,'').slice(0,19) } })} required
                            placeholder={
                              payMethod === 'mada'   ? '4464 0000 0000 0000' :
                              payMethod === 'amex'   ? '3700 000000 00000' :
                              payMethod === 'master' ? '5400 0000 0000 0000' :
                                                       '4242 4242 4242 4242'
                            } />
                          <Field label="Expiry (MM/YY)" value={data.exp} onChange={(e) => set('exp')({ target: { value: e.target.value.replace(/[^0-9/]/g,'').slice(0,5) } })} required placeholder="08/27" />
                          <Field label={payMethod === 'amex' ? 'CID (4 digits)' : 'CVV'} type="password" value={data.cvv} onChange={(e) => set('cvv')({ target: { value: e.target.value.replace(/\D/g,'').slice(0,4) } })} required placeholder={payMethod === 'amex' ? '••••' : '•••'} />
                        </div>
                      )}

                      {payMethod === 'apple' && (
                        <div className="rounded-xl border border-ink-900/10 bg-white p-6 text-center">
                          <PayMark id="apple" className="mx-auto h-8 w-auto" />
                          <p className="mt-3 text-sm text-ink-800/70">
                            Tap <strong>Pay {fmtSAR(pack.fee)} SAR</strong> below — you'll be asked to confirm with Face ID / Touch ID on your Apple device.
                          </p>
                        </div>
                      )}

                      {payMethod === 'bank' && (
                        <div className="rounded-xl border border-ink-900/10 bg-white p-6">
                          <p className="stamp text-ink-700/60">Bank Transfer · Wire to</p>
                          <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                            <p className="flex justify-between gap-3 md:col-span-2"><span className="shrink-0 text-ink-700/60">Beneficiary</span><span className="text-right text-ink-900">Abdulkareem Adas and Partners Company for Engineering</span></p>
                            <p className="flex justify-between"><span className="text-ink-700/60">Bank</span><span className="text-ink-900">SNB (Saudi National Bank)</span></p>
                            <p className="flex justify-between"><span className="text-ink-700/60">Account No.</span><span className="font-mono text-ink-900">01400003824808</span></p>
                            <p className="flex justify-between md:col-span-2"><span className="text-ink-700/60">IBAN</span><span className="font-mono text-ink-900">SA59 1000 0001 4000 0382 4808</span></p>
                            <p className="flex justify-between"><span className="text-ink-700/60">SWIFT</span><span className="font-mono text-ink-900">NCBKSAJE</span></p>
                            <p className="flex justify-between"><span className="text-ink-700/60">Reference</span><span className="text-gold-600">ADAS-{(pack.id||'').toUpperCase()}-{(data.name||'').split(' ')[0].toUpperCase()}</span></p>
                          </div>
                          <label className="mt-5 flex items-start gap-2 text-sm text-ink-800/80">
                            <input type="checkbox" checked={bankAck} onChange={(e)=>setBankAck(e.target.checked)}
                              className="mt-0.5 h-4 w-4 accent-gold-500" />
                            I have made the transfer of <strong>&nbsp;{fmtSAR(pack.fee)} SAR&nbsp;</strong> using the above reference. We will verify and confirm by email.
                          </label>
                        </div>
                      )}
                    </div>

                    <p className="mt-4 text-xs text-ink-700/50">
                      🔒 Test mode — no real charge. In production, a payment gateway (HyperPay / Stripe / Apple Pay) handles the actual transaction.
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="mt-6 flex items-center justify-between">
              <button
                disabled={step === 1 || busy}
                onClick={() => setStep((s) => s - 1)}
                className="rounded-full border border-ink-900/15 px-6 py-3 stamp text-ink-800 transition disabled:opacity-40 hover:border-gold-400">
                ← Back
              </button>
              {step < 3 ? (
                <button
                  disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
                  onClick={() => setStep((s) => s + 1)}
                  className="magnetic-btn rounded-full bg-gold-400 px-7 py-3 stamp text-ink-900 transition hover:bg-gold-500 hover:text-white disabled:opacity-40 disabled:hover:bg-gold-400 disabled:hover:text-ink-900">
                  Continue →
                </button>
              ) : (
                <button
                  disabled={!canStep3 || busy}
                  onClick={submit}
                  className="magnetic-btn rounded-full bg-gold-400 px-7 py-3 stamp text-ink-900 transition hover:bg-gold-500 hover:text-white disabled:opacity-40">
                  {busy ? (isTracked ? 'PROCESSING PAYMENT…' : 'SENDING…') : (isTracked ? ('PAY ' + fmtSAR(pack.fee) + ' SAR') : 'CONFIRM BOOKING')}
                </button>
              )}
            </div>
          </div>

          {/* Summary side panel */}
          <aside className="glass h-fit rounded-2xl p-6">
            <p className="stamp text-gold-500">— BOOKING SUMMARY</p>
            <h3 className="mt-3 font-display text-2xl">{service.name}</h3>
            <p className="mt-1 text-sm italic text-gold-600">{service.blurb}</p>

            {isTracked ? (
              /* selectable package list (filtered by chosen track) */
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="stamp text-gold-600">{trackId === 'student' ? 'STUDENT TRACK' : 'PROFESSIONAL TRACK'}</span>
                  <button onClick={() => { setTrackId(null); setPackId(null); }}
                    className="stamp text-ink-700/60 underline-offset-2 hover:text-gold-600 hover:underline">
                    Change
                  </button>
                </div>
                {packs.map((p) => {
                  const active = p.id === packId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPackId(p.id)}
                      className={
                        'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ' +
                        (active
                          ? 'border-gold-400 bg-gold-400/10 ring-1 ring-gold-400'
                          : 'border-ink-900/10 bg-white hover:border-gold-400/60')
                      }>
                      <span className="flex items-center gap-2">
                        <span className={'grid h-4 w-4 place-items-center rounded-full border ' + (active ? 'border-gold-500 bg-gold-400' : 'border-ink-900/25')}>
                          {active && <span className="block h-1.5 w-1.5 rounded-full bg-ink-900" />}
                        </span>
                        <span className="leading-tight text-ink-900">{p.label}</span>
                      </span>
                      <span className={'stamp shrink-0 ' + (active ? 'text-gold-600' : 'text-ink-700/60')}>
                        {fmtSAR(p.fee)}
                      </span>
                    </button>
                  );
                })}
                <p className="px-1 text-xs text-ink-700/60">{pack.sub}</p>
              </div>
            ) : (
              <ul className="mt-5 space-y-2 text-sm text-ink-800/80">
                {service.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2">
                    <span className="block h-px w-3 bg-gold-400" />{pt}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-ink-900/10 pt-5 space-y-2 text-sm">
              <p className="flex justify-between"><span className="stamp text-ink-700/60">With</span><span className="text-ink-900">{team.name}</span></p>
              {isRevit
                ? (data.week && <p className="flex justify-between"><span className="stamp text-ink-700/60">Week</span><span className="text-ink-900">{fmtWeekRange(data.week)}</span></p>)
                : (
                  <>
                    {data.date && <p className="flex justify-between"><span className="stamp text-ink-700/60">Date</span><span className="text-ink-900">{fmtDate(data.date)}</span></p>}
                    {data.time && <p className="flex justify-between"><span className="stamp text-ink-700/60">Time</span><span className="text-ink-900">{data.time}</span></p>}
                  </>
                )}
              {isTracked && (
                <p className="flex justify-between">
                  <span className="stamp text-ink-700/60">Fee</span>
                  <span className="text-ink-900">{fmtSAR(pack.fee)} {pack.suffix}</span>
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PageSwitcher() {
  const { pathname } = useLocation();
  let Page = HomePage;
  if (pathname === '/about') Page = AboutPage;
  else if (pathname === '/services') Page = ServicesPage;
  else if (pathname === '/projects') Page = ProjectsPage;
  else if (pathname === '/contact') Page = ContactPage;
  else if (pathname.startsWith('/book/')) Page = BookPage;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main key={pathname}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative">
        <CurtainSweep keyId={pathname} />
        <Page />
      </motion.main>
    </AnimatePresence>
  );
}

function CurtainSweep({ keyId }) {
  return (
    <motion.div key={'sweep-' + keyId}
      initial={{ scaleY: 1 }} animate={{ scaleY: 0 }}
      transition={{ duration: 0.85, ease: [0.77, 0, 0.18, 1] }}
      style={{ transformOrigin: 'top' }}
      className="pointer-events-none fixed inset-0 z-[110] bg-white">
      <div className="absolute inset-0 grid place-items-center">
        <svg viewBox="0 0 40 40" className="h-12 w-12 text-gold-300 opacity-80">
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M6 32 L20 8 L34 32" />
            <path d="M12 24 L28 24" />
          </g>
        </svg>
      </div>
    </motion.div>
  );
}

/* ============================================================
 *  APP ROOT
 * ==========================================================*/

function AppShell() {
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState('light');

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') { root.classList.add('dark'); root.classList.remove('light'); }
    else { root.classList.remove('dark'); }
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      <BackgroundGrid />
      <CustomCursor />
      <EasterEgg />

      <AnimatePresence>
        {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      </AnimatePresence>

      <Navbar onOpenMenu={() => setMenu(true)} />
      <MobileMenu open={menu} onClose={() => setMenu(false)} />

      <PageSwitcher />

      <Footer />
      <FloatingActions />
    </ThemeCtx.Provider>
  );
}

function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
