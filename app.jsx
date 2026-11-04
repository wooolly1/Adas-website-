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
  { id: 'private-palace', disciplines: ['Architecture', 'Interior Design'], title: "Yousif's Palace", category: 'Residential', year: '2023', location: 'Jeddah, KSA', size: 'Architecture & Landscape', role: 'Architecture · Landscape', status: 'Design · 3D Visualisation', tagline: 'A private palace set within layered gardens, opening onto a sunlit pool court.',
    description: [
      'A family palace in Jeddah composed as a sequence of calm, stone-clad volumes. Deep overhangs and timber soffits shade the glazing, while the main living spaces open directly onto a generous pool court with in-water loungers and timber decks.',
      'Landscape is treated as architecture: olive trees, palms and bougainvillea frame the entrances, and a curved garden walk leads the family from the gate to the outdoor lounges.',
    ],
    img: './projects/private-palace-1/01.webp',
    gallery: Array.from({ length: 12 }, (_, i) => `./projects/private-palace-1/${String(i + 1).padStart(2, '0')}.webp`),
    views: {
      'Interior Design': {
        size: 'Interior Design', role: 'Interior Design',
        tagline: 'A palace interior where Hijazi geometry meets calm, contemporary luxury.',
        description: [
          'The reception floor is built for hospitality. The formal majlis is framed by tall arched panels of carved geometric lattice beneath cascading crystal chandeliers, and a double-height entrance hall rises past arched stained-glass windows and a carved screen to the upper gallery. A formal dining hall seats twenty under a sculpted brass chandelier.',
          'Beyond the formal rooms, the family wing turns warmer: a family dining room and open kitchen, garden-facing lounges behind full-height glazing, and a master suite with a tufted headboard, a dressing room, a book-matched marble bath and a private gym lined in timber slats.',
        ],
        img: './projects/private-palace-1/interior/01.webp',
        gallery: Array.from({ length: 19 }, (_, i) => `./projects/private-palace-1/interior/${String(i + 1).padStart(2, '0')}.webp`),
      },
    },
    span: 'tall' },
  { id: 'private-palace-2', disciplines: ['Architecture'], title: "Abdullah's Palace", category: 'Residential', year: '2026', location: 'Jeddah, KSA', size: 'Architecture', role: 'Architecture', status: 'Design · 3D Visualisation', tagline: 'One family palace, two façade studies: layered stone at dusk, classical white by day.',
    description: [
      'A family palace of linked residences set behind a continuous garden wall, developed through two façade options. The first layers travertine-toned stone, carved timber screens and warm concealed lighting into a composition that comes alive at dusk.',
      'The second is a classical white scheme of tall framed bays, crisp cornices and timber mashrabiya panels, with a grand double-height entrance and a formal timber door at its centre.',
    ],
    img: './projects/palace-2/01.webp',
    gallery: Array.from({ length: 10 }, (_, i) => `./projects/palace-2/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'lulus-recipe-obhur', disciplines: ['Interior Design'], title: "Lulu's Recipe — Obhur", category: 'Commercial & Entertainment', year: '2023', location: 'Obhur, Jeddah', size: 'Interior · Fit-out', role: 'Interior Architecture', tagline: 'A coastal flagship for a beloved family-recipe brand.',
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80', span: 'wide' },
  { id: 'lulus-recipe-naeem', disciplines: ['Interior Design'], title: "Lulu's Recipe — Naeem", category: 'Commercial & Entertainment', year: '2024', location: 'Naeem, Jeddah', size: 'Interior · Fit-out', role: 'Interior Architecture', tagline: 'A second chapter for the family-recipe brand, drawn into the city.',
    img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'sub-and-ship', disciplines: ['Interior Design'], title: 'Sub & Ship', category: 'Commercial & Entertainment', year: '2024', location: 'Jeddah, KSA', size: 'F&B Interior', role: 'Interior Architecture', tagline: 'A submarine-themed sandwich bar — playful, compact, and tightly composed.',
    img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'al-ula-resort', disciplines: ['Architecture'], title: 'Al Ula Resort', category: 'Hospitality & Admin', year: '2024', location: 'Al Ula, KSA', size: 'Hospitality Masterplan', role: 'Architecture · Landscape', tagline: 'Suites quarried into sandstone, framing a thousand-year horizon.',
    img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'private-villa', disciplines: ['Architecture'], title: "Dania's Villa", category: 'Residential', year: '2026', location: 'Jeddah, KSA', size: 'Architecture', role: 'Architecture', status: 'Design · 3D Visualisation', tagline: 'A contemporary family villa that reinterprets the Hijazi façade.',
    description: [
      'A family villa composed of stepped, lime-white volumes that give the street a calm, layered façade. Timber mashrabiya screens and stone-clad towers mark the principal rooms, filtering the sun while keeping the interiors private.',
      'Perforated masonry panels, recessed windows and a low garden wall soften the edge between home and street, with covered parking tucked discreetly into the base.',
    ],
    img: './projects/villa-1/01.webp',
    gallery: Array.from({ length: 3 }, (_, i) => `./projects/villa-1/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'villa-2', disciplines: ['Architecture'], title: "Amnah's Villa", category: 'Residential', year: '2026', location: 'Jeddah, KSA', size: 'Architecture', role: 'Architecture', status: 'Design · 3D Visualisation', tagline: 'A symmetrical villa façade framed in light stone and carved timber.',
    description: [
      'A family villa organised around a calm, symmetrical street façade. Deep cream-plaster frames step forward to hold tall windows, each veiled by geometric timber screens that bring privacy and dappled light to the rooms behind.',
      'A carved stone panel marks the centre of the composition, and at dusk concealed uplighting turns the frames into a soft, glowing lantern above the garden wall and covered parking.',
    ],
    img: './projects/villa-2/01.webp',
    gallery: Array.from({ length: 3 }, (_, i) => `./projects/villa-2/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'villa-3', disciplines: ['Architecture', 'Interior Design'], title: "Nadia's Villa", category: 'Residential', year: '2024', location: 'Jeddah, KSA', size: 'Architecture', role: 'Architecture', status: 'Design · 3D Visualisation', tagline: 'A garden villa crowned by a double-height arched window.',
    description: [
      'A compact family villa composed around a tall arched window that lights the main stair and living hall. A perforated stone screen beside it filters the afternoon sun, and a planted roof terrace softens the skyline.',
      'At street level, a timber pergola and bougainvillea frame the arched front door, while a sliding timber gate lets the forecourt switch between a welcoming entrance and private parking.',
    ],
    img: './projects/villa-3/01.webp',
    gallery: ['./projects/villa-3/01.webp', './projects/villa-3/02.webp'],
    views: {
      'Interior Design': {
        size: 'Interior Design', role: 'Interior Design',
        tagline: 'The villa’s arches, carried inside in warm oak and soft light.',
        description: [
          'Inside, the arch that defines the façade becomes the language of every room: arched timber doors and niches, an arched headboard in woven rattan, and a double-height living hall where rattan pendants hang beneath the great arched window.',
          'Warm oak, cream plaster and olive-green accents keep the palette calm, while a planted courtyard full of bougainvillea brings the garden into the dining room and the kitchen opens onto greenery through a tall picture window.',
        ],
        img: './projects/villa-3/interior/01.webp',
        gallery: Array.from({ length: 9 }, (_, i) => `./projects/villa-3/interior/${String(i + 1).padStart(2, '0')}.webp`),
      },
    },
    span: 'normal' },
  { id: 'villa-4', disciplines: ['Architecture', 'Interior Design'], title: "Assim's Villa", category: 'Residential', year: '2025', location: 'Jeddah, KSA', size: 'Architecture', role: 'Architecture', status: 'Design · 3D Visualisation', tagline: 'Warm stone, dark frames and a quiet, lantern-lit entrance.',
    description: [
      'A contemporary family villa built from warm stone volumes and deep, dark-framed openings, topped by a glazed roof pavilion that opens onto the terrace.',
      'The approach is choreographed as a sequence: floating lit steps lead to a tall pivot door beside a textured feature wall, while the boundary wall alternates timber fins, planted green strips and a backlit water wall that falls like a quiet waterfall. Inside the plot, a timber-decked courtyard gathers outdoor seating in front of a second, full-height water wall.',
    ],
    img: './projects/villa-4/01.webp',
    gallery: Array.from({ length: 4 }, (_, i) => `./projects/villa-4/${String(i + 1).padStart(2, '0')}.webp`),
    /* same villa, shown with its interior renders under the Interior Design tab */
    views: {
      'Interior Design': {
        size: 'Interior Design', role: 'Interior Design',
        tagline: 'Warm walnut, soft stone and light that lives inside the joinery.',
        description: [
          'The interiors carry the villa’s warm, quiet palette inside: taupe stone, walnut joinery and soft cream upholstery. A double-height living hall is lit by cascading crystal pendants and divided by slim black-framed glass partitions.',
          'Backlit shelving runs through the family lounge, dining room and master suite, and a walk-in dressing room is lined in glass-fronted wardrobes.',
        ],
        img: './projects/villa-4/interior/01.webp',
        gallery: Array.from({ length: 9 }, (_, i) => `./projects/villa-4/interior/${String(i + 1).padStart(2, '0')}.webp`),
      },
    },
    span: 'normal' },
  { id: 'villa-5', disciplines: ['Architecture'], title: "Khalid's Villa", category: 'Residential', year: '2023', location: 'Jeddah, KSA', size: 'Architecture', role: 'Architecture', status: 'Design · 3D Visualisation', tagline: 'A modern villa that turns inward to a light-filled pool court.',
    description: [
      'A modern family villa with a composed, cubic street front: pale stone volumes, a dark vertical feature panel and slim black window frames, set behind a low lit garden wall.',
      'Inside the plot the house opens up. Double-height glazing wraps a private courtyard with a long plunge pool, sheltered by a deep timber-lined canopy that keeps the living spaces shaded and connected to the water.',
    ],
    img: './projects/villa-5/01.webp',
    gallery: Array.from({ length: 3 }, (_, i) => `./projects/villa-5/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'hattan-villa', disciplines: ['Interior Design'], title: "Hattan's Villa", category: 'Residential', year: '2022', location: 'Jeddah, KSA', size: 'Interior Design', role: 'Interior Design', status: 'Design · 3D Visualisation', tagline: 'A soft, classic family home, from the formal salon to the children’s rooms.',
    description: [
      'A family villa interior in a soft classic language: panelled walls and moulded ceilings in cream and dove grey, crystal chandeliers, and a fluted glass screen with brass frames that separates the dining room from the formal salon.',
      'The family spaces relax into warm timber shelving and sage accents, opening onto a pool terrace with a planted green wall. Upstairs, the children’s suites are designed around them, with blush tones, hand-painted floral murals, arched niches and a playroom in sage and pink.',
    ],
    img: './projects/hattan-villa/01.webp',
    gallery: Array.from({ length: 10 }, (_, i) => `./projects/hattan-villa/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'raid-villa', disciplines: ['Interior Design'], title: "Raid's Villa", category: 'Residential', year: '2023', location: 'Jeddah, KSA', size: 'Interior Design', role: 'Interior Design', status: 'Design · 3D Visualisation', tagline: 'Caramel, stone and timber: a warm, gathered family home.',
    description: [
      'A warm, contemporary family interior built on polished marble floors, textured stone feature walls and caramel leather. The living and family lounges flow into one another, framed by tall windows and backlit timber shelving.',
      'A long dining table sits beneath a trio of arched mirrors, the open kitchen wraps a breakfast banquette, and the bedrooms soften into timber fins, rattan, linen and woven textures.',
    ],
    img: './projects/raid-villa/01.webp',
    gallery: Array.from({ length: 8 }, (_, i) => `./projects/raid-villa/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'ramzy-villa', disciplines: ['Interior Design'], title: "Ramzy's Villa", category: 'Residential', year: '2026', location: 'Jeddah, KSA', size: 'Interior Design', role: 'Interior Design', status: 'Design · 3D Visualisation', tagline: 'A complete family home, from onyx salons to a private cinema and gym.',
    description: [
      'A full-house interior for a large family villa. The formal salons are anchored by book-matched onyx feature walls, sculptural ring chandeliers and soft ivory seating, with marble and brass details that catch the daylight from floor-to-ceiling windows.',
      'Beyond them, every member of the family has a space of their own: a private home cinema, a neon-lit gaming lounge, a bright family lounge, a fitted kitchen, a home gym, and a series of bedroom suites with arched niches, glass-fronted wardrobes and warm backlit joinery.',
    ],
    img: './projects/ramzy-villa/01.webp',
    gallery: Array.from({ length: 18 }, (_, i) => `./projects/ramzy-villa/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'wisam-apartment', disciplines: ['Interior Design'], title: "Wisam's Apartment", category: 'Residential', year: '2020', location: 'Jeddah, KSA', size: 'Interior Design', role: 'Interior Design', status: 'Design · 3D Visualisation', tagline: 'Apartment living with the polish of a villa: marble, brass and soft panelling.',
    description: [
      'A family apartment designed with the presence of a much larger home. The living room pairs deep sofas with a sculptural brass pendant and abstract artwork, and the dining room is framed by a book-matched marble wall beneath a golden branch chandelier.',
      'The master bedroom layers a tall upholstered headboard, brass-framed glass and warm herringbone floors, while the children’s rooms bring in colour and play: a blush-pink suite with a sun motif, and a bedroom with a mountain-shaped timber headboard set against leaf-patterned wallpaper.',
    ],
    img: './projects/wisam-apartment/01.webp',
    gallery: Array.from({ length: 5 }, (_, i) => `./projects/wisam-apartment/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'yasser-villa', disciplines: ['Interior Design'], title: "Yasser's Villa", category: 'Residential', year: '2026', location: 'Jeddah, KSA', size: 'Interior Design', role: 'Interior Design', status: 'Design · 3D Visualisation', tagline: 'A family of bedroom suites, each one designed around who sleeps there.',
    description: [
      'A private-wing interior where every suite has its own character. The master bedroom is framed by hand-painted botanical panels and a soft petal pendant, with a walk-in dressing area behind; a second suite pairs timber slats with glass-fronted wardrobes.',
      'The children’s rooms are tailored to each of them: a blush-pink suite beneath a carved floral arch, and a sun-filled room with a sage-green arched niche, a long study desk and open shelving, completed by a private sitting room and ensuite bath.',
    ],
    img: './projects/yasser-villa/01.webp',
    gallery: Array.from({ length: 10 }, (_, i) => `./projects/yasser-villa/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'hasan-villa', disciplines: ['Interior Design'], title: "Hasan's Villa", category: 'Residential', year: '2024', location: 'Jeddah, KSA', size: 'Interior Design', role: 'Interior Design', status: 'Design · 3D Visualisation', tagline: 'Soft classic panelling, marble and light in a calm family home.',
    description: [
      'A bright family villa in a soft classic language: moulded wall panels, white marble feature walls and smoked-glass chandeliers set the tone for the formal living room and a relaxed majlis with deep, wraparound seating.',
      'The kitchen pairs warm oak upper cabinets with a dark stone island, the master suite layers a tall upholstered headboard with brass details, the bathrooms contrast black and white marble, and a twin girls’ room is finished in blush pink with a shared study corner.',
    ],
    img: './projects/hasan-villa/01.webp',
    gallery: Array.from({ length: 19 }, (_, i) => `./projects/hasan-villa/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'gamekom-event', disciplines: ['Interior Design'], title: 'Gamekom Event', category: 'Commercial & Entertainment', year: '2024', location: 'Jeddah, KSA', size: 'Experiential Interior', role: 'Interior · Experience', tagline: 'A high-energy event arena designed as a single, cinematic stage.',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'magadeer', disciplines: ['Interior Design'], title: 'Magadeer Restaurant', category: 'Commercial & Entertainment', year: '2023', location: 'Madina, KSA', size: 'F&B Interior', role: 'Interior Architecture', tagline: 'A modern hijazi restaurant in the heart of Al-Madinah.',
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80', span: 'wide' },
  { id: 'snb-dammam', disciplines: ['Interior Design'], title: 'SNB Dammam HQ', category: 'Hospitality & Admin', year: '2024', location: 'Dammam, KSA', size: 'Corporate Interior', role: 'Interior · Workplace', tagline: 'A regional banking headquarters re-imagined as a place to think.',
    img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1600&q=80', span: 'tall' },
  { id: 'knowledge-city', disciplines: ['Architecture'], title: 'Knowledge City Business Park', category: 'Hospitality & Admin', year: '2024', location: 'Riyadh, KSA', size: 'Mixed-use Masterplan', role: 'Architecture · Planning', tagline: 'A campus of working buildings stitched around a green spine.',
    img: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80', span: 'wide' },
  { id: 'verve', disciplines: ['Architecture'], title: 'Verve', category: 'Hospitality & Admin', year: '2024', location: 'Jeddah, KSA', size: 'Office Building', role: 'Architecture · Façade', status: 'Design · 3D Visualisation', tagline: 'A sleek glass headquarters for a workspace brand.',
    description: [
      'A two-storey office building for Verve, a workspace solutions provider. The façade wraps the corner in a gentle curve of glass held by slim dark mullions, giving the building a single, continuous presence along the street.',
      'A deep fascia band carries bilingual signage above a softly patterned upper storey, while the glazed ground floor opens onto a generous forecourt with visitor parking.',
    ],
    img: './projects/verve/01.webp',
    gallery: Array.from({ length: 4 }, (_, i) => `./projects/verve/${String(i + 1).padStart(2, '0')}.webp`),
    span: 'normal' },
  { id: 'retail-park', disciplines: ['Architecture', 'Interior Design'], title: 'Retail Park', category: 'Hospitality & Admin', year: '2024', location: 'Jeddah, KSA', size: 'Mixed-use Retail', role: 'Architecture · Interiors', tagline: 'An open-air retail park designed as a public, walkable courtyard.',
    img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'makkiyon-sales-office', disciplines: ['Interior Design'], title: 'Makkiyon Sales Office', category: 'Hospitality & Admin', year: '2024', location: 'Jeddah, KSA', size: 'Sales Office Interior', role: 'Interior · Workplace', tagline: 'A residential sales gallery that tells the story of the homes it sells.',
    img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
  { id: 'delta-coffee', disciplines: ['Interior Design'], title: 'Delta Coffee', category: 'Commercial & Entertainment', year: '2023', location: 'Jeddah, KSA', size: 'Café Interior', role: 'Interior Architecture', tagline: 'A specialty coffee bar designed at the scale of a hand.',
    img: 'https://images.unsplash.com/photo-1496564203457-11bb12075d90?auto=format&fit=crop&w=1600&q=80', span: 'normal' },
];

const CATEGORIES = ['All', 'Residential', 'Commercial & Entertainment', 'Hospitality & Admin'];
const SECTORS = CATEGORIES.slice(1);
/* a project can override its photos/copy per discipline tab via `views` */
const viewFor = (p, discipline) => (p && p.views && p.views[discipline] ? { ...p, ...p.views[discipline] } : p);
const DISCIPLINES = [
  { key: 'Architecture', i: '01', blurb: 'Buildings, masterplans and the shells that hold a life.' },
  { key: 'Interior Design', i: '02', blurb: 'Rooms, fit-outs and the details you touch every day.' },
];

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
];

const DESIGN_TEAM = [
  { name: 'Wijdan Ashqar', role: 'Interior Designer', gender: 'f' },
  { name: 'Amani Al Hameed', role: 'Interior Designer', gender: 'f' },
  { name: 'Renad Al Gain', role: 'Architect', gender: 'f' },
  { name: 'Tamem Saeedi', role: 'Architect', gender: 'm' },
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
          <span>ADAS · ARCHITECTURE</span>
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

/* wordmark: 'sm' (from 640px), 'wide' (from 1360px, header), 'none' */
function Logo({ className = '', dark: darkProp = false, wordmark = 'sm', compact = false }) {
  const pair = useTransparentLogo();
  const { theme } = useTheme();
  const dark = darkProp && theme !== 'dark'; // dark strokes only on light backgrounds
  // Fallback: use raw jpg until processed
  const src = pair ? (dark ? pair.dark : pair.light) : './logo.jpg';
  return (
    <Link to="/" aria-label="ADAS Architecture — home" className={'group flex items-center ' + className}>
      <img
        src={src}
        alt="ADAS"
        draggable="false"
        className="h-11 w-auto select-none transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ background: 'transparent' }}
      />
      {wordmark !== 'none' && (
      <span aria-hidden={compact} className={'hidden flex-col justify-center gap-[2px] overflow-hidden whitespace-nowrap leading-none transition-all duration-500 ease-out '
        + (wordmark === 'wide' ? 'min-[1360px]:flex ' : 'sm:flex ')
        + (compact ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-[220px] opacity-100')}>
        <span className="stamp text-[8px] tracking-[0.28em]">ADAS Architecture</span>
        <span className="stamp text-[7px] tracking-[0.22em] text-lilac-500/80">Jeddah · KSA</span>
      </span>
      )}
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

/* Is the page behind (x, y) dark? Ignores the header itself and anything
 * with pointer-events:none (cursor, particles, grids). Photos count as dark. */
function isDarkBehind(x, y, ignore) {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (ignore && ignore.contains(el)) continue;
    const tag = el.tagName;
    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS') return true;
    const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if (!m) continue;
    const [r, g, b, a = 1] = m.map(Number);
    if (a < 0.4) continue;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
  }
  return document.documentElement.classList.contains('dark');
}

function Navbar({ onOpenMenu }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const { path } = useContext(RouterCtx);
  const { theme } = useTheme();
  const headerRef = useRef(null);
  const logoRef = useRef(null);
  const [bgDark, setBgDark] = useState(path === '/');
  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 30));
    return () => unsub();
  }, [scrollY]);
  /* re-check the colour behind the logo on scroll, resize, route and theme change */
  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = logoRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setBgDark(isDarkBehind(r.left + r.width / 2, r.top + r.height / 2, headerRef.current));
      });
    };
    check();
    // re-check after the loading screen, page transitions and late images
    const timers = [400, 1200, 2500, 4500].map((ms) => setTimeout(check, ms));
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [path, theme]);
  /* once scrolled the header sits on its own glass pill, which follows the theme */
  const onDark = scrolled ? theme === 'dark' : bgDark;
  const overHero = onDark;

  return (
    <motion.header ref={headerRef} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.77, 0, 0.18, 1], delay: 0.1 }}
      className={'fixed inset-x-0 top-0 z-[80] transition-all duration-500 ' + (scrolled ? 'py-3' : 'py-6')}>
      {/* soft fade in the page colour so scrolling content doesn't collide with the floating pills */}
      <div aria-hidden="true" className={'header-fade pointer-events-none absolute inset-x-0 top-0 -z-10 h-[150%] transition-opacity duration-500 ' + (scrolled ? 'opacity-100' : 'opacity-0')} />
      <div className="mx-auto flex w-[min(1500px,94vw)] items-center justify-between">
        <div ref={logoRef} className={'flex items-center rounded-full py-2 transition-all duration-500 ' + (scrolled ? 'px-3 ' : 'px-3 min-[1360px]:px-4 ') +
          (scrolled ? 'glass shadow-soft ' : 'bg-transparent ') + (onDark ? 'text-white' : 'text-ink-900')}>
          <Logo dark={!onDark} wordmark="wide" compact={scrolled} />
        </div>
        <nav className={'hidden items-center gap-1 rounded-full px-2 py-1.5 transition-all duration-500 lg:flex ' +
          (scrolled ? 'glass shadow-soft' : 'bg-transparent')}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) =>
                'nav-link relative px-3 py-2 text-[12px] uppercase tracking-widest-2 xl:px-5 ' +
                (isActive ? 'active text-gold-300' : overHero ? 'text-white/85 hover:text-white' : 'text-ink-800/80 hover:text-ink-900')
              }>
              <span className={'mr-2 font-mono text-[10px] ' + (overHero ? 'text-white/50' : 'text-ink-700/50')}>{n.i}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/contact"
            className="magnetic-btn hidden rounded-full border border-gold-400/40 px-5 py-2 text-[11px] font-medium uppercase tracking-widest-2 text-gold-300 transition hover:bg-gold-400/10 whitespace-nowrap lg:inline-flex">
            Start a Project
          </Link>
          <ThemeToggle />
          <button aria-label="Menu" onClick={onOpenMenu}
            className={'glass grid h-10 w-10 place-items-center rounded-full lg:hidden ' + (onDark ? 'text-white' : 'text-ink-900')}>
            <span className="flex flex-col gap-1">
              <span className="block h-px w-4 bg-current" />
              <span className="block h-px w-4 bg-current" />
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
          className="fixed inset-0 z-[120] bg-white/90 backdrop-blur-xl lg:hidden">
          <div className="flex h-full flex-col px-8 py-10">
            <div className="flex items-center justify-between">
              <Logo dark wordmark="none" />
              <button onClick={onClose} aria-label="Close"
                className="grid h-10 w-10 place-items-center rounded-full border border-ink-900/15 text-ink-900">
                <span className="relative block h-4 w-4">
                  <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-current" />
                  <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-current" />
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

/* Office contact links (Contact page, footer) */
const CONTACT = {
  whatsapp: 'https://wa.me/966558593937?text=' + encodeURIComponent('Hello ADAS, I would like to ask about a project.'),
  maps: 'https://www.google.com/maps/search/?api=1&query=21.723028%2C39.134389',
};

const MAP_PIN = 'M12 0C7.3 0 3.5 3.8 3.5 8.5 3.5 14.9 12 24 12 24s8.5-9.1 8.5-15.5C20.5 3.8 16.7 0 12 0zm0 12.3a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6z';

/* Footer social links (simple-icons glyphs, 24×24) */
const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/adasarchitect',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 0 0-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13a5.88 5.88 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/adas-gabson',
    path: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z' },
  { label: 'Snapchat', href: 'https://www.snapchat.com/@adasgarchitect',
    path: 'M12 2c3.1 0 5.4 2.4 5.4 5.6v2.6c.3.1.7.2 1.1.1.5-.1.9.2 1 .6.1.5-.3.8-.7 1-.6.2-1.4.5-1.6 1 -.1.3 0 .6.2 1 .8 1.6 2.3 3 4.1 3.4.4.1.6.5.4.9-.3.6-1.4 1-2.7 1.2-.2.3-.2.9-.5 1.2-.3.3-1 .1-1.7 0 -.9-.1-1.8.1-2.6.7-.8.6-1.6 1.2-3 1.2s-2.2-.6-3-1.2c-.8-.6-1.7-.8-2.6-.7-.7.1-1.4.3-1.7 0-.3-.3-.3-.9-.5-1.2 -1.3-.2-2.4-.6-2.7-1.2-.2-.4 0-.8.4-.9 1.8-.4 3.3-1.8 4.1-3.4.2-.4.3-.7.2-1-.2-.5-1-.8-1.6-1-.4-.2-.8-.5-.7-1 .1-.4.5-.7 1-.6.4.1.8 0 1.1-.1V7.6C6.6 4.4 8.9 2 12 2z' },
  { label: 'X', href: 'https://x.com/Adasarchitect',
    path: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41z' },
  { label: 'WhatsApp', href: 'https://wa.me/966558593937',
    path: 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z' },
];

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
          <form className="mt-6 flex items-center overflow-hidden rounded-full border border-ink-900/12 bg-white"
            onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder="name@email.com"
              className="flex-1 border-0 bg-transparent px-5 py-3 text-sm text-ink-900 placeholder-ink-700/40 outline-none focus:border-0 focus:outline-none focus:ring-0" />
            <button className="bg-gold-400 px-5 py-3 text-[11px] uppercase tracking-widest-2 text-ink-900 transition hover:bg-gold-500 hover:text-white">
              Subscribe
            </button>
          </form>
          <div className="mt-8 flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}
                className="grid h-10 w-10 place-items-center rounded-full border border-ink-900/15 text-ink-800 transition hover:border-gold-500 hover:text-gold-600">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-ink-900/10">
        <div className="mx-auto flex w-[min(1500px,94vw)] flex-col items-center justify-between gap-3 px-2 py-6 stamp text-ink-700/60 md:flex-row">
          <span>© ADAS ARCHITECTURE · MMXX — MMXXVI · ALL RIGHTS RESERVED</span>
          <span>DESIGNED WITH ♥ IN JEDDAH</span>
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
          objectPosition="center 50%"
          alt="ADAS architecture — pool and villa at dusk"
          className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/55 via-ink-950/40 to-ink-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/20 to-transparent" />
      </motion.div>
      <FloatingParticles count={22} />
      <div className="pointer-events-none absolute inset-0">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1.6 }}
          className="absolute right-[6%] top-[18%] hidden h-44 w-44 md:block border border-gold-400/30" />
        <motion.div initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: 360 }}
          transition={{ delay: 0.8, duration: 90, ease: 'linear', repeat: Infinity }}
          className="absolute right-[10%] top-[22%] hidden h-32 w-32 md:block border border-lilac-400/55"
          style={{ borderRadius: '40% 60% 50% 50% / 50% 40% 60% 50%' }} />
      </div>

      <motion.div style={{ opacity }}
        className="relative z-10 mx-auto flex h-full w-[min(1500px,94vw)] flex-col justify-end pb-28 md:pb-28">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 md:col-span-9">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1 }} className="stamp mb-4 font-medium text-gold-300 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)] md:mb-6">
              ARCHITECTURE · INTERIORS
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
              className="mt-5 max-w-xl text-base leading-relaxed text-white/90 md:mt-8 md:text-lg">
              Architecture and interiors, crafted across Saudi Arabia.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 1 }}
              className="mt-7 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4">
              <Link to="/projects"
                className="magnetic-btn group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gold-400 px-6 py-3.5 text-[11px] md:px-7 md:text-[12px] uppercase tracking-widest-2 text-ink-950 transition hover:bg-gold-300">
                <span>Explore Portfolio</span>
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link to="/contact"
                className="magnetic-btn inline-flex items-center gap-3 rounded-full border border-white/50 bg-ink-950/30 px-6 py-3.5 text-[11px] uppercase tracking-widest-2 text-white backdrop-blur-sm transition hover:border-gold-300 hover:text-gold-300 md:px-7 md:text-[12px]">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-current">
                  <span className="block h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
                </span>
                Start a Conversation
              </Link>
            </motion.div>
          </div>
          <div className="hidden md:col-span-3 md:mb-16 md:block">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.8, duration: 1 }}
              className="glass relative overflow-hidden rounded-2xl p-5">
              <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-lilac-400 to-transparent" />
              <p className="stamp font-medium text-lilac-600">Now Drawing</p>
              <p className="mt-2 font-display text-2xl text-ink-900">Yousif's Palace</p>
              <p className="mt-1 text-xs text-ink-800/80">Jeddah · Residential</p>
              <div className="mt-4 grid grid-cols-2 gap-2 stamp text-ink-700">
                <span>KSA</span><span>2023</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        className="pointer-events-none absolute inset-x-0 bottom-6 hidden items-center justify-center md:flex">
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
      <div className="marquee-track flex w-max gap-16 whitespace-nowrap stamp text-lilac-500">
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
    <section ref={ref} className="relative overflow-hidden py-16 md:py-24">
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
        <div className="col-span-12 grid grid-cols-2 gap-4 md:col-span-8 md:grid-cols-4 md:gap-6">
          {[
            { t: 'Cinematic', icon: (
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="14" />
                <circle cx="24" cy="24" r="4" />
                <path d="M24 10v4M24 34v4M10 24h4M34 24h4M14 14l3 3M34 14l-3 3M14 34l3-3M34 34l-3-3" />
              </svg>
            ) },
            { t: 'Considered', icon: (
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="14" />
                <path d="M19 19a5 5 0 1 1 7 4.5c-1.5.8-2 2-2 3.5" />
                <circle cx="24" cy="33" r="1" fill="currentColor" />
              </svg>
            ) },
            { t: 'Crafted', icon: (
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 6l-2 22h4L24 6z" />
                <path d="M15 40l9-12 9 12" />
                <path d="M12 44h24" />
                <path d="M20 44v-6M28 44v-6" />
              </svg>
            ) },
            { t: 'Climate-Aware', icon: (
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 8c7 6 11 11 11 18a11 11 0 0 1-22 0c0-7 4-12 11-18z" />
                <path d="M24 22v12M24 28l-4-3M24 28l4-3" />
              </svg>
            ) },
          ].map((b, i) => (
            <Reveal key={b.t} delay={i * 0.08}>
              <div className="group flex flex-col items-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full border border-ink-900/10 bg-white text-gold-600 shadow-sm transition group-hover:border-gold-400 group-hover:text-gold-700 group-hover:shadow-md md:h-20 md:w-20">
                  {b.icon}
                </span>
                <p className="mt-3 font-titling text-base text-ink-900 md:text-lg">{b.t}</p>
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
    <section className="relative overflow-hidden bg-white py-14 md:py-24">
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
  /* Real rooms from Yousif's Palace (Interior Design → Residential) */
  const rooms = [
    { id: 'a', label: 'Majlis',  x: 16, y: 18, w: 40, h: 28, info: "Majlis · carved geometric lattice arches · crystal chandeliers",
      photo: './projects/private-palace-1/interior/01.webp' },
    { id: 'b', label: 'Entrance', x: 60, y: 18, w: 28, h: 28, info: 'Entrance hall · double height · arched stained-glass windows',
      photo: './projects/private-palace-1/interior/03.webp' },
    { id: 'c', label: 'Master suite', x: 16, y: 50, w: 28, h: 28, info: 'Master suite · tufted headboard · panelled walls',
      photo: './projects/private-palace-1/interior/13.webp' },
    { id: 'd', label: 'Dining',  x: 48, y: 50, w: 40, h: 28, info: 'Formal dining · seats twenty · sculpted brass chandelier',
      photo: './projects/private-palace-1/interior/04.webp' },
  ];
  return (
    <section className="relative overflow-hidden bg-bone-100/40 py-14 md:py-24">
      <div className="mx-auto grid w-[min(1500px,94vw)] grid-cols-12 gap-6 md:gap-10">
        <div className="col-span-12 lg:col-span-4">
          <p className="stamp text-gold-300">— ANATOMY OF A PROJECT</p>
          <Reveal>
            <h2 className="mt-3 font-display text-3xl leading-tight md:text-5xl">
              Step inside a <span className="font-titling not-italic font-medium text-gold-500">working blueprint</span>.
            </h2>
          </Reveal>
          <p className="mt-4 max-w-md text-sm text-ink-800/70 md:mt-6 md:text-base">
            Tap a room to see it as we designed it — Yousif's Palace, Jeddah.
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
                          {r.label.toUpperCase()} · YOUSIF'S PALACE
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          <Link to="/projects" className="mt-6 inline-flex items-center gap-2 stamp text-gold-600 transition hover:text-gold-500">
            See the full project →
          </Link>
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
    {
      n: '01', t: 'Listen',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 20a10 10 0 0 1 20 0v6a4 4 0 0 1-4 4h-2v-10h4" />
          <path d="M14 20v6a4 4 0 0 0 4 4h2V20h-6" />
          <path d="M14 30v2a6 6 0 0 0 6 6h2" />
        </svg>
      ),
    },
    {
      n: '02', t: 'Draw',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 40l6-2 20-20-4-4L10 34l-2 6z" />
          <path d="M28 14l4 4" />
          <path d="M34 8l6 6" />
        </svg>
      ),
    },
    {
      n: '03', t: 'Test',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="10" width="32" height="24" rx="2" />
          <path d="M8 16h32" />
          <circle cx="12" cy="13" r="0.8" fill="currentColor" />
          <circle cx="15" cy="13" r="0.8" fill="currentColor" />
          <path d="M18 24l4 4 8-8" />
          <path d="M18 40h12" />
        </svg>
      ),
    },
    {
      n: '04', t: 'Deliver',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 32l12-20 12 20" />
          <path d="M4 36h40" />
          <path d="M14 36v-6h12v6" />
          <path d="M28 36v-10h10v10" />
        </svg>
      ),
    },
  ];
  return (
    <section className="relative py-16 md:py-24">
      <div className="mx-auto w-[min(1500px,94vw)]">
        <div className="text-center md:text-left">
          <p className="stamp text-gold-300 md:text-left">— THE METHOD</p>
          <Reveal>
            <h2 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
              Four rooms in <span className="font-titling not-italic font-medium text-gold-500">one house</span>.
            </h2>
          </Reveal>
        </div>

        {/* Icon rail with connecting line */}
        <div className="relative mt-12 md:mt-16">
          <span className="pointer-events-none absolute left-10 right-10 top-10 hidden h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent md:block" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="group relative flex flex-col items-center text-center">
                  <span className="relative grid h-20 w-20 place-items-center rounded-full border border-ink-900/10 bg-white text-gold-600 shadow-sm transition group-hover:border-gold-400 group-hover:text-gold-700 group-hover:shadow-md md:h-24 md:w-24">
                    {s.icon}
                    <span className="absolute -top-2 right-0 stamp rounded-full bg-gold-400 px-2 py-0.5 text-[9px] text-ink-900">{s.n}</span>
                  </span>
                  <h3 className="mt-4 font-display text-2xl text-ink-900 md:text-3xl">{s.t}</h3>
                </div>
              </Reveal>
            ))}
          </div>
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
        <div className="mx-auto mt-14 grid max-w-[1080px] grid-cols-1 gap-6 sm:grid-cols-3">
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

function ProjectStrip({ projects, onOpen }) {
  const [hoverIdx, setHoverIdx] = useState(0);
  useEffect(() => { setHoverIdx(0); }, [projects]);
  return (
    <>
      {/* Expanding horizontal-strip accordion (desktop) */}
      <div className="mt-8 hidden h-[62vh] min-h-[440px] gap-2 md:flex">
        {projects.map((p, i) => {
          const isHover = hoverIdx === i;
          return (
            <button key={p.id}
              onMouseEnter={() => setHoverIdx(i)}
              onClick={() => onOpen(p.id)}
              style={{ flex: isHover ? 10 : 1 }}
              className="group relative isolate min-w-[60px] overflow-hidden rounded-2xl border border-ink-900/8 text-left transition-[flex] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <img src={p.img} alt={p.title}
                className={'absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out ' + (isHover ? 'scale-100' : 'scale-[1.18]')} />
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
                  <span>{p.category}</span>
                  {p.year && <><span>·</span><span>{p.year}</span></>}
                </span>
                <h3 className="mt-3 font-display text-4xl leading-tight text-white md:text-6xl">{p.title}</h3>
                <p className="mt-2 text-white/85">{p.location} · {p.size}</p>
                <p className="mt-4 max-w-xl text-sm italic text-white/85">{p.tagline}</p>
                <span className="mt-6 inline-flex items-center gap-2 stamp text-gold-300">OPEN PROJECT →</span>
              </span>

              <span className={'absolute inset-x-4 top-3 h-px bg-gold-400 transition-opacity duration-500 ' + (isHover ? 'opacity-100' : 'opacity-0')} />
            </button>
          );
        })}
      </div>

      {/* Mobile: swipeable row */}
      <div className="-mx-[3vw] mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[3vw] px-[3vw] pb-2 [scrollbar-width:none] md:hidden">
        {projects.map((p, i) => (
          <button key={p.id} onClick={() => onOpen(p.id)}
            className="group relative aspect-[4/5] w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl text-left">
            <img src={p.img} alt={p.title} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
              <span className="stamp text-gold-300">{String(i + 1).padStart(2, '0')}{p.year && ` · ${p.year}`}</span>
              <span className="font-display text-2xl">{p.title}</span>
              <span className="text-sm text-white/75">{p.location}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function ProjectsGrid() {
  const [discipline, setDiscipline] = useState(DISCIPLINES[0].key);
  const [openId, setOpenId] = useState(null);
  const open = viewFor(PROJECTS.find((p) => p.id === openId), discipline);

  const sections = useMemo(() => SECTORS
    .map((sector) => ({
      sector,
      projects: PROJECTS.filter((p) => p.category === sector && p.disciplines.includes(discipline))
        .map((p) => viewFor(p, discipline))
        .sort((a, b) => Number(b.year) - Number(a.year)),
    }))
    .filter((s) => s.projects.length > 0), [discipline]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <section className="relative py-12">
      <div className="mx-auto w-[min(1500px,94vw)]">
        {/* Discipline switch: Architecture / Interior Design */}
        <div role="tablist" aria-label="Discipline" className="grid grid-cols-2 gap-3 md:gap-4">
          {DISCIPLINES.map((d) => {
            const isActive = discipline === d.key;
            const count = PROJECTS.filter((p) => p.disciplines.includes(d.key)).length;
            return (
              <button key={d.key} role="tab" aria-selected={isActive} onClick={() => setDiscipline(d.key)}
                className={'magnetic-btn group relative overflow-hidden rounded-2xl border p-5 text-left transition md:p-8 ' +
                  (isActive
                    ? 'border-gold-400 bg-gold-400/10'
                    : 'border-ink-900/12 hover:border-gold-400/60')}>
                <span className="hidden items-center justify-between stamp md:flex">
                  <span className={isActive ? 'text-gold-600' : 'text-ink-700/50'}>{d.i}</span>
                  <span className={isActive ? 'text-gold-600' : 'text-ink-700/50'}>{String(count).padStart(2, '0')} projects</span>
                </span>
                <span className={'block font-display text-2xl leading-tight md:mt-6 md:text-6xl md:leading-none ' + (isActive ? 'text-ink-900' : 'text-ink-800/60 group-hover:text-ink-900')}>
                  {d.key}
                </span>
                <span className="mt-3 hidden max-w-md text-sm text-ink-800/70 md:block">{d.blurb}</span>
                <span className={'mt-3 block stamp md:hidden ' + (isActive ? 'text-gold-600' : 'text-ink-700/50')}>{count} projects</span>
                <span className={'absolute inset-x-0 bottom-0 h-[3px] bg-gold-400 transition-transform duration-500 origin-left ' + (isActive ? 'scale-x-100' : 'scale-x-0')} />
              </button>
            );
          })}
        </div>

        {/* Sector sections inside the chosen discipline */}
        <AnimatePresence mode="wait">
          <motion.div key={discipline}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
            {sections.map(({ sector, projects }, si) => (
              <div key={sector} className="mt-16 md:mt-24">
                <div className="flex items-end justify-between gap-4 border-b border-ink-900/10 pb-4">
                  <div>
                    <p className="stamp text-gold-600">{String(si + 1).padStart(2, '0')} — {discipline}</p>
                    <h2 className="mt-2 font-display text-3xl leading-tight text-ink-900 md:text-5xl">{sector}</h2>
                  </div>
                  <span className="stamp shrink-0 text-ink-700/50">
                    {String(projects.length).padStart(2, '0')}<span className="hidden md:inline"> projects</span>
                    {projects.length > 1 && <span className="md:hidden"> · swipe →</span>}
                  </span>
                </div>
                <ProjectStrip projects={projects} onOpen={setOpenId} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && <ProjectModal project={open} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </section>
  );
}

function ProjectModal({ project, onClose }) {
  const images = project.gallery && project.gallery.length ? project.gallery : [project.img];
  const [idx, setIdx] = useState(0);
  const go = (d) => setIdx((i) => (i + d + images.length) % images.length);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (images.length > 1 && e.key === 'ArrowRight') go(1);
      if (images.length > 1 && e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length]);
  const hasRealCopy = !!project.description;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] grid place-items-center bg-ink-900/40 px-4 py-10 backdrop-blur-xl"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass relative max-h-[88vh] w-[min(1100px,96vw)] overflow-y-auto rounded-2xl">
        <div className="relative aspect-[16/9] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div key={images[idx]}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-ink-950">
              {/* blurred fill so non-16:9 images are shown whole, not cropped */}
              <img src={images[idx]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
              <img src={images[idx]} alt={`${project.title} — view ${idx + 1}`} className="absolute inset-0 h-full w-full object-contain" />
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
          {images.length > 1 && (
            <>
              {[[-1, 'left-4', 'Previous image', '←'], [1, 'right-4', 'Next image', '→']].map(([d, pos, label, ch]) => (
                <button key={d} onClick={() => go(d)} aria-label={label}
                  className={'absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-ink-900/40 text-white backdrop-blur-sm transition hover:border-gold-300 hover:text-gold-300 ' + pos}>
                  {ch}
                </button>
              ))}
              <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-ink-900/50 px-3 py-1.5 stamp text-white/90 backdrop-blur-sm">
                {String(idx + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </span>
            </>
          )}
          <button onClick={onClose}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-ink-900/40 text-white transition hover:border-gold-300 hover:text-gold-300"
            aria-label="Close">
            <span className="relative block h-4 w-4">
              <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-current" />
              <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-current" />
            </span>
          </button>
          <div className="absolute inset-x-0 bottom-0 hidden p-8 md:block">
            <p className="stamp text-gold-300">{project.category}{project.year && ` · ${project.year}`}</p>
            <h3 className="mt-2 font-display text-4xl leading-tight text-white md:text-6xl">{project.title}</h3>
            <p className="mt-2 text-white/80">{project.location} · {project.size}</p>
          </div>
        </div>
        <div className="px-6 pt-6 md:hidden">
          <p className="stamp text-gold-600">{project.category}{project.year && ` · ${project.year}`}</p>
          <h3 className="mt-2 font-display text-4xl leading-tight text-ink-900">{project.title}</h3>
          <p className="mt-1 text-sm text-ink-800/70">{project.location} · {project.size}</p>
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-6 pt-6 [scrollbar-width:none] md:px-8">
            {images.map((src, i) => (
              <button key={src} onClick={() => setIdx(i)} aria-label={`Show image ${i + 1}`}
                className={'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ' + (i === idx ? 'border-gold-400' : 'border-transparent opacity-60 hover:opacity-100')}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-12 gap-6 p-6 md:p-8">
          <div className="col-span-12 md:col-span-7">
            <p className="text-lg italic text-gold-600">{project.tagline}</p>
            {hasRealCopy ? project.description.map((para, i) => (
              <p key={i} className="mt-5 text-ink-800/75">{para}</p>
            )) : (<>
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
            </>)}
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {[['Role', project.role], ['Location', project.location], ['Scope', project.size],
                ...(project.year ? [['Year', project.year]] : []), ['Status', project.status || 'Built'],
                ...(hasRealCopy ? (project.award ? [['Award', project.award]] : []) : [['Award', 'Domus 100, 2024']]),
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="stamp text-ink-700/50">{k}</p>
                  <p className="mt-1 text-ink-800/90">{v}</p>
                </div>
              ))}
            </div>
            {(!hasRealCopy || project.press) && <div className="mt-8 border-t border-ink-900/10 pt-6">
              <p className="stamp text-ink-700/50">Press</p>
              <p className="mt-2 text-ink-800/80">{project.press || 'Featured in Dezeen, Domus, Wallpaper* and Frame magazine.'}</p>
            </div>}
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
        subtitle="Eighty-plus projects across Saudi Arabia — choose Architecture or Interior Design, then step inside any project." />
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
              <a href="mailto:office@adas.com.sa?subject=Project%20enquiry" className="group mt-4 block">
                <span className="flex items-center justify-between gap-3 font-display text-3xl leading-tight transition group-hover:text-gold-600">
                  office@adas.com.sa<span className="text-lg text-gold-600 transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </span>
                <span className="mt-1 block stamp text-ink-700/50">PROJECTS · PRESS · TAP TO EMAIL</span>
              </a>
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="group mt-6 block border-t border-ink-900/10 pt-6">
                <span className="flex items-center justify-between gap-3 font-display text-2xl transition group-hover:text-gold-600">
                  +966 55 859 3937<span className="text-lg text-gold-600 transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </span>
                <span className="mt-1 block stamp text-ink-700/50">WHATSAPP · 09 — 18 GMT+3 · TAP TO CHAT</span>
              </a>
              <a href={CONTACT.maps} target="_blank" rel="noopener noreferrer" className="group mt-6 block border-t border-ink-900/10 pt-6">
                <span className="flex items-center justify-between gap-3 font-display text-2xl transition group-hover:text-gold-600">
                  Jada 30, Al-Madinah Rd<span className="text-lg text-gold-600 transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </span>
                <span className="mt-1 block text-ink-800/70">Obhor Al-Janobiya, Jeddah</span>
                <span className="mt-1 block stamp text-ink-700/50">TAP TO OPEN IN MAPS</span>
              </a>
            </div>
            <div className="glass rounded-2xl p-8">
              <p className="stamp text-gold-300">— FOLLOW US</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[...SOCIALS, { label: 'Maps', href: CONTACT.maps, path: MAP_PIN }].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-ink-900/10 py-5 text-ink-800 transition hover:-translate-y-0.5 hover:border-gold-400 hover:text-gold-600">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
                    <span className="stamp text-[9px] text-ink-700/50 transition group-hover:text-gold-600">{s.label}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-8">
              <p className="stamp text-gold-300">— OPENING HOURS</p>
              <div className="mt-4 space-y-2 text-ink-800/80">
                <div className="flex justify-between"><span>Sun — Thu</span><span className="stamp text-ink-700/70">09:00 — 18:00</span></div>
                <div className="flex justify-between"><span>Fri — Sat</span><span className="stamp text-ink-700/70">CLOSED</span></div>
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
  const { path } = useContext(RouterCtx);
  if (path === '/team') return null; // keep the check-in buttons clear on phones
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
  const isClosed = (d) => d.getDay() === 5 || d.getDay() === 6; // Fri, Sat
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
          const disabled = isPast(d) || isClosed(d);
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
                        : 'Sun — Thu, 17:00 — 21:00 · Fridays and Saturdays closed.'}
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

/* ============================================================
 *  TEAM ATTENDANCE (Microsoft 365 sign-in + location check-in)
 *  Backend: api/attendance.js (Vercel) → Excel on OneDrive/SharePoint.
 *  Setup: docs/attendance-setup.md. Fill in the two IDs below.
 * ==========================================================*/

const MS_CLIENT_ID = 'adbb71da-fe2d-4489-8275-331bb4500b81';   // Application (client) ID
const MS_TENANT_ID = '08d435b8-9026-497b-9491-1c4532c20d3f';   // Directory (tenant) ID
const ATTENDANCE_API = '/api/attendance';
const MS_SCOPES = ['openid', 'profile', 'email'];
const attConfigured = () => !!(MS_CLIENT_ID && MS_TENANT_ID);

let _msal = null;
async function msal() {
  if (_msal) return _msal;
  const { PublicClientApplication } = await import('@azure/msal-browser');
  const app = new PublicClientApplication({
    auth: {
      clientId: MS_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${MS_TENANT_ID}`,
      redirectUri: `${window.location.origin}/auth-popup.html`,
    },
    cache: { cacheLocation: 'localStorage' },
  });
  await app.initialize();
  // clears a sign-in that was started but not finished (e.g. user pressed Back)
  await app.handleRedirectPromise().catch(() => null);
  _msal = app;
  return app;
}

async function msIdToken(force = false) {
  const app = await msal();
  const account = app.getActiveAccount() || app.getAllAccounts()[0];
  if (!account) return '';
  try {
    const r = await app.acquireTokenSilent({ scopes: MS_SCOPES, account, forceRefresh: force });
    return r.idToken;
  } catch (e) { return ''; }
}

async function attCall(action, body = {}) {
  const send = async (force) => {
    const token = await msIdToken(force);
    if (!token) return { ok: false, error: 'signed_out' };
    const res = await fetch(ATTENDANCE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    });
    return res.json().catch(() => ({ ok: false, error: 'Connection problem. Please try again.' }));
  };
  const r = await send(false);
  return r.error === 'signed_out' ? send(true) : r;
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('This browser cannot share location.')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => reject(new Error(err.code === 1
        ? 'Location permission was denied. Allow location for this site in your browser settings, then try again.'
        : 'Could not get your location. Turn on GPS / location services and try again.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

/* Working days (Sun–Thu, not a public holiday) between two YYYY-MM-DD dates, inclusive — mirrors the API */
function leaveDays(start, end, holidays = []) {
  if (!start || !end || end < start) return { days: 0, skipped: [] };
  const byDate = Object.fromEntries(holidays.map((h) => [h.date, h.name]));
  let n = 0; const skipped = [];
  for (let d = new Date(start + 'T00:00:00Z'); d <= new Date(end + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const w = d.getUTCDay(), iso = d.toISOString().slice(0, 10);
    if (w === 5 || w === 6) continue;
    if (iso in byDate) { if (!skipped.includes(byDate[iso])) skipped.push(byDate[iso] || 'Public holiday'); continue; }
    n++;
  }
  return { days: n, skipped };
}
const LEAVE_LABELS = { annual: 'Annual', sick: 'Sick', marriage: 'Marriage', bereavement: 'Funeral', paternity: 'New baby', hajj: 'Hajj', unpaid: 'Unpaid', site: 'Site visit' };
const leaveTypeLabel = (t) => LEAVE_LABELS[t] || 'Annual';
const fmtLeaveDate = (iso) => (iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const LEAVE_TONE = {
  Pending: 'bg-lilac-400/20 text-lilac-600', Approved: 'bg-gold-400/20 text-gold-700',
  Rejected: 'bg-red-500/10 text-red-700', Cancelled: 'bg-ink-900/5 text-ink-700/60',
};

function AnnualLeave() {
  const [data, setData] = useState(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('annual');
  const [pdf, setPdf] = useState(null); // { name, size, data }
  const pickPdf = (file) => {
    setMsg(null);
    if (!file) { setPdf(null); return; }
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { setPdf(null); setMsg({ type: 'error', text: 'Only PDF files can be attached.' }); return; }
    if (file.size > 3 * 1024 * 1024) { setPdf(null); setMsg({ type: 'error', text: 'The PDF is larger than 3 MB. Please choose a smaller file.' }); return; }
    const fr = new FileReader();
    fr.onload = () => setPdf({ name: file.name, size: file.size, data: String(fr.result).split(',')[1] || '' });
    fr.onerror = () => setMsg({ type: 'error', text: 'Could not read that file. Please try again.' });
    fr.readAsDataURL(file);
  };
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

  const run = async (label, body, okText) => {
    setBusy(label); setMsg(null);
    try {
      const r = await attCall(body.action, body);
      if (!r.ok) throw new Error(r.error === 'signed_out' ? 'Your session expired. Please sign in again.' : r.error);
      setData(r);
      if (okText) setMsg({ type: 'ok', text: typeof okText === 'function' ? okText(r) : okText });
      return r;
    } catch (e) { setMsg({ type: 'error', text: e.message || 'Connection problem. Please try again.' }); return false; }
    finally { setBusy(''); }
  };

  useEffect(() => { run('load', { action: 'leaveStatus' }); }, []);

  const { days, skipped } = leaveDays(start, end, (data && data.holidays) || []);
  const typeInfo = data && data.types ? data.types.find((t) => t.key === type) : null;
  const isAnnual = type === 'annual';
  const BACKDATE = { sick: 30, bereavement: 7, paternity: 7 };
  const minStart = (() => { const d = new Date(todayIso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (BACKDATE[type] || 0)); return d.toISOString().slice(0, 10); })();
  const typeLimit = typeInfo && !isAnnual
    ? Math.min(typeInfo.perRequest || Infinity, typeInfo.perYear ? typeInfo.perYear - typeInfo.usedThisYear : Infinity) : Infinity;
  const bal = data && data.balance;
  const overLimit = isAnnual ? days > (bal ? bal.remaining : 0) : days > typeLimit;
  const submit = async (e) => {
    e.preventDefault();
    const to = data && data.approvers && data.approvers.length ? data.approvers.join(' or ') : 'your manager';
    const body = { action: 'leaveRequest', type, start, end, note };
    if (type === 'sick' && pdf) body.attachment = { name: pdf.name, data: pdf.data };
    const ok = await run('request', body, (r) => (r.attachment === 'failed'
      ? `Request sent to ${to}, but the PDF could not be emailed — please give it to HR.`
      : `Request sent to ${to}${r.attachment === 'sent' ? ' with the medical report attached' : ''}.`));
    if (ok) { setStart(''); setEnd(''); setNote(''); setType('annual'); setPdf(null); }
  };
  const inputCls = 'mt-2 w-full rounded-none border-0 border-b border-ink-900/12 bg-transparent px-0 py-3 text-ink-900 outline-none focus:border-gold-400 focus:ring-0 [color-scheme:light] dark:[color-scheme:dark]';
  const btn = 'magnetic-btn inline-flex items-center justify-center rounded-full px-5 py-3 text-[11px] uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="glass mt-6 rounded-3xl p-6 shadow-soft md:p-10">
      <p className="stamp text-gold-600">Annual leave {bal ? bal.year : ''}</p>

      {!data && !msg && <p className="mt-4 stamp text-ink-700/60">Loading…</p>}

      {bal && (
        <>
          <div className="mt-4 flex items-end gap-3">
            <span className="font-display text-6xl leading-none text-ink-900">{bal.remaining}</span>
            <span className="pb-1 text-sm text-ink-800/70">of {bal.allowance} days left</span>
          </div>
          <p className="mt-2 text-xs text-ink-800/70">
            {bal.earning ? `${bal.entitlement} of ${bal.fullYear} days earned so far in ${bal.year}` : `${bal.entitlement} days for ${bal.year}`}
            {bal.carried > 0 && ` + ${bal.carried} carried from ${bal.year - 1}`}
            {bal.joinDate && ` · joined ${new Date(bal.joinDate + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`}
            {bal.serviceYears != null && bal.serviceYears >= 1 && ` · ${bal.serviceYears} year${bal.serviceYears === 1 ? '' : 's'} of service`}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink-900/10" aria-hidden="true">
            <div className="flex h-full">
              <span className="bg-gold-500" style={{ width: `${bal.allowance ? Math.min(100, (bal.used / bal.allowance) * 100) : 0}%` }} />
              <span className="bg-lilac-400" style={{ width: `${bal.allowance ? Math.min(100, (bal.pending / bal.allowance) * 100) : 0}%` }} />
            </div>
          </div>
          <div className="mt-2 flex gap-5 text-xs text-ink-800/70">
            <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gold-500" />Taken {bal.used}</span>
            <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-lilac-400" />Pending {bal.pending}</span>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5 border-t border-ink-900/10 pt-6">
            <p className="font-display text-2xl text-ink-900">{type === 'site' ? 'Request a site visit' : 'Request leave'}</p>
            {data.types && data.typeColumn && (
              <div>
                <span className="stamp text-ink-700/60">Type</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.types.map((t) => (
                    <button type="button" key={t.key} onClick={() => setType(t.key)} aria-pressed={type === t.key}
                      className={'rounded-full border px-3.5 py-1.5 text-sm transition ' + (type === t.key
                        ? 'border-gold-400 bg-gold-400/15 text-ink-900' : 'border-ink-900/12 text-ink-800/70 hover:border-gold-400')}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {typeInfo && typeInfo.key !== 'annual' && (
                  <p className="mt-2 text-xs leading-relaxed text-ink-800/70">
                    {typeInfo.hint}
                    {typeInfo.perYear ? ` You've used ${typeInfo.usedThisYear} of ${typeInfo.perYear} this year.` : ''}
                    {typeInfo.once && typeInfo.usedEver ? ' Already taken.' : ''}
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="stamp text-ink-700/60">From</span>
                <input type="date" required min={minStart} value={start}
                  onChange={(e) => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} className={inputCls} />
              </label>
              <label className="block"><span className="stamp text-ink-700/60">To</span>
                <input type="date" required min={start || minStart} value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </label>
            </div>
            {type === 'sick' && (
              <div>
                <span className="stamp text-ink-700/60">Medical report (PDF, optional)</span>
                <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-ink-900/20 px-4 py-3 text-sm transition hover:border-gold-400">
                  <span className={pdf ? 'truncate text-ink-900' : 'text-ink-800/60'}>
                    {pdf ? `📎 ${pdf.name} · ${pdf.size < 1024 * 1024 ? Math.max(1, Math.round(pdf.size / 1024)) + ' KB' : (pdf.size / 1024 / 1024).toFixed(1) + ' MB'}` : 'Choose a PDF (max 3 MB)'}
                  </span>
                  <span className="shrink-0 stamp text-gold-600">{pdf ? 'Change' : 'Browse'}</span>
                  <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pickPdf(e.target.files && e.target.files[0])} />
                </label>
                {pdf && <button type="button" onClick={() => setPdf(null)} className="mt-1 stamp text-ink-700/60 hover:text-red-700">Remove</button>}
                <p className="mt-1 text-xs text-ink-800/60">It's emailed to your manager with the request.</p>
              </div>
            )}
            <label className="block"><span className="stamp text-ink-700/60">{type === 'site' ? 'Site / client (required)' : 'Note (optional)'}</span>
              <input type="text" maxLength={300} value={note} required={type === 'site'} onChange={(e) => setNote(e.target.value)}
                placeholder={type === 'site' ? 'e.g. Al Rawdah villa — site meeting' : 'e.g. family travel'} className={inputCls + ' placeholder:text-ink-700/40'} />
            </label>
            {start && end && (
              <p className={'text-sm ' + (overLimit ? 'text-red-700' : 'text-ink-800/80')}>
                {days === 0 ? 'No working days in these dates (weekends and public holidays don\'t count).'
                  : isAnnual ? `${days} working day${days === 1 ? '' : 's'} · ${Math.max(0, bal.remaining - days)} would remain`
                  : type === 'site' ? `${days} working day${days === 1 ? '' : 's'} at the site · counts as worked`
                  : `${days} working day${days === 1 ? '' : 's'} of ${typeInfo ? typeInfo.label.toLowerCase() : ''} leave · annual balance not affected`}
                {!isAnnual && overLimit && ` — more than allowed (${typeLimit === Infinity ? '' : typeLimit + ' max'}).`}
                {isAnnual && days > bal.remaining && (bal.earning
                  ? ` — more than you have today; you keep earning days, so it may be fine for later dates.`
                  : ` — more than your ${bal.remaining} days left.`)}
                {skipped.length > 0 && <span className="block text-xs text-ink-800/60">Not counted: {skipped.join(', ')}</span>}
              </p>
            )}
            <button type="submit" disabled={!!busy || !days || (type === 'site' && !note.trim()) || (isAnnual ? (days > bal.remaining && !bal.earning) : overLimit)} className={btn + ' w-full bg-gold-400 text-ink-950 hover:bg-gold-300'}>
              {busy === 'request' ? 'Sending…' : 'Send to manager'}
            </button>
            <p className="text-center text-xs text-ink-800/60">
              {data.approvers && data.approvers.length
                ? `Goes to ${data.approvers.join(' or ')} for approval.`
                : 'No manager is set for you yet — please tell the admin.'}
            </p>
          </form>

          {data.holidays && data.holidays.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer stamp text-ink-700/60 hover:text-gold-600">Upcoming public holidays</summary>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.values(data.holidays.reduce((acc, h) => {
                  const k = (h.name || h.date) + '|' + h.date.slice(0, 4); (acc[k] = acc[k] || { name: h.name || 'Public holiday', from: h.date, to: h.date }).to = h.date; return acc;
                }, {})).map((h) => (
                  <li key={h.name + h.from} className="flex justify-between gap-3"><span className="text-ink-900">{h.name}</span>
                    <span className="text-ink-800/70">{fmtLeaveDate(h.from)}{h.to !== h.from && ` — ${fmtLeaveDate(h.to)}`}</span></li>
                ))}
              </ul>
            </details>
          )}

          {data.requests.length > 0 && (
            <div className="mt-8 border-t border-ink-900/10 pt-6">
              <p className="stamp text-ink-700/60">My requests</p>
              <ul className="mt-3 divide-y divide-ink-900/10">
                {data.requests.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-ink-900">{fmtLeaveDate(l.start)}{l.end !== l.start && ` — ${fmtLeaveDate(l.end)}`} <span className="text-ink-800/60">· {l.days}d{l.type && l.type !== 'annual' ? ` · ${leaveTypeLabel(l.type)}` : ''}</span></p>
                      {l.note && <p className="text-xs text-ink-800/60">{l.note}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={'rounded-full px-2.5 py-1 text-[11px] ' + (LEAVE_TONE[l.status] || LEAVE_TONE.Cancelled)}>{l.status}</span>
                      {l.status === 'Pending' && (
                        <button onClick={() => run('cancel-' + l.id, { action: 'leaveCancel', id: l.id }, 'Request cancelled.')} disabled={!!busy}
                          className="stamp text-ink-700/60 hover:text-red-700">Cancel</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.manager && (
            <div className="mt-8 border-t border-ink-900/10 pt-6">
              <p className="font-display text-2xl text-ink-900">Approvals</p>
              {data.pending.length === 0 ? <p className="mt-2 text-sm text-ink-800/70">No requests waiting.</p> : (
                <ul className="mt-3 space-y-3">
                  {data.pending.map((l) => (
                    <li key={l.id} className="rounded-2xl border border-ink-900/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-ink-900">{l.name} <span className="ml-1 rounded-full bg-ink-900/5 px-2 py-0.5 text-[11px] text-ink-800/70">{leaveTypeLabel(l.type)}</span></p>
                          <p className="text-sm text-ink-800/70">{fmtLeaveDate(l.start)}{l.end !== l.start && ` — ${fmtLeaveDate(l.end)}`} · {l.days} day{l.days === 1 ? '' : 's'}</p>
                          {l.note && <p className="mt-1 text-xs text-ink-800/60">“{l.note}”</p>}
                        </div>
                        {l.remaining != null && (!l.type || l.type === 'annual') && <span className="shrink-0 text-xs text-ink-800/60">{l.remaining} days left</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button onClick={() => run('d-' + l.id, { action: 'leaveDecide', id: l.id, decision: 'approve' }, `Approved ${l.name}'s leave.`)} disabled={!!busy}
                          className={btn + ' bg-gold-400 text-ink-950 hover:bg-gold-300'}>Approve</button>
                        <button onClick={() => run('d-' + l.id, { action: 'leaveDecide', id: l.id, decision: 'reject' }, `Declined ${l.name}'s request.`)} disabled={!!busy}
                          className={btn + ' border border-ink-900/15 text-ink-900 hover:border-red-500 hover:text-red-700'}>Decline</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {data.upcoming && data.upcoming.length > 0 && (
                <div className="mt-6">
                  <p className="stamp text-ink-700/60">Approved — coming up</p>
                  <ul className="mt-3 divide-y divide-ink-900/10">
                    {data.upcoming.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-ink-900">{l.name}</p>
                          <p className="text-sm text-ink-800/70">{fmtLeaveDate(l.start)}{l.end !== l.start && ` — ${fmtLeaveDate(l.end)}`} · {l.days}d · {leaveTypeLabel(l.type)}</p>
                        </div>
                        <button onClick={() => { if (window.confirm(`Cancel ${l.name}'s approved leave (${fmtLeaveDate(l.start)} — ${fmtLeaveDate(l.end)})? The days go back to their balance.`)) run('c-' + l.id, { action: 'leaveCancel', id: l.id }, `Cancelled ${l.name}'s leave.`); }}
                          disabled={!!busy} className="stamp shrink-0 text-ink-700/60 hover:text-red-700">Cancel leave</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.team && data.team.length > 0 && (
                <details className="mt-5">
                  <summary className="cursor-pointer stamp text-ink-700/60 hover:text-gold-600">My team's balances</summary>
                  <ul className="mt-3 divide-y divide-ink-900/10 text-sm">
                    {data.team.map((t) => (
                      <li key={t.email} className="flex justify-between py-2"><span className="text-ink-900">{t.name}</span>
                        <span className="text-right text-ink-800/70">{t.remaining} of {t.allowance} left{t.carried > 0 ? ` (incl. ${t.carried} carried)` : ''} · {t.used} taken{t.pending ? ` · ${t.pending} pending` : ''}</span></li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </>
      )}

      {msg && (
        <p role="status" className={'mt-6 rounded-xl p-4 text-sm ' + (msg.type === 'error' ? 'bg-red-500/10 text-red-700' : 'bg-gold-400/10 text-ink-800')}>{msg.text}</p>
      )}
    </div>
  );
}

const STATUS_UI = {
  ontime: { label: 'On time', short: '✓', cls: 'bg-gold-400/20 text-gold-700' },
  late: { label: 'Late', short: 'L', cls: 'bg-lilac-400/25 text-lilac-600' },
  absent: { label: 'Absent', short: 'A', cls: 'bg-red-500/15 text-red-700' },
  leave: { label: 'On leave', short: 'LV', cls: 'bg-ink-900/10 text-ink-800' },
  waiting: { label: 'Not in yet', short: '…', cls: 'bg-ink-900/5 text-ink-700/70' },
  site: { label: 'Site visit', short: 'S', cls: 'bg-bone-300/60 text-ink-900' },
  off: { label: 'Off', short: '', cls: 'text-ink-700/30' },
  future: { label: '', short: '', cls: 'text-ink-700/30' },
  'not-joined': { label: '—', short: '', cls: 'text-ink-700/30' },
};
const isoShift = (iso, period, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  if (period === 'month') { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); }
  else d.setUTCDate(d.getUTCDate() + n * (period === 'week' ? 7 : 1));
  return d.toISOString().slice(0, 10);
};
const fmtD = (iso, opts) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
function downloadCsv(name, rows) {
  const esc = (v) => { const x = String(v == null ? '' : v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function ManagerDashboard() {
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  const [tab, setTab] = useState('attendance');
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(todayIso);
  const [rep, setRep] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let live = true;
    setBusy(true); setErr('');
    attCall(tab === 'attendance' ? 'report' : 'leaveReport', { period, date }).then((r) => {
      if (!live) return;
      if (r.ok) setRep({ ...r, tab }); else if (r.error === 'Reports are for managers.') setHidden(true); else { setRep(null); setErr(r.error); }
    }).catch(() => live && setErr('Connection problem. Please try again.')).finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [tab, period, date]);

  if (hidden) return null;
  const canNext = isoShift(date, period, 1) <= todayIso || (tab === 'leave');
  const title = period === 'day' ? fmtD(date, { weekday: 'long', day: 'numeric', month: 'long' })
    : period === 'week' ? (rep ? `${fmtD(rep.from, { day: 'numeric', month: 'short' })} — ${fmtD(isoShift(rep.from, 'day', 4), { day: 'numeric', month: 'short' })}` : 'This week')
    : fmtD(date, { month: 'long', year: 'numeric' });
  const seg = (on) => 'rounded-full px-4 py-1.5 text-sm transition ' + (on ? 'bg-ink-900 text-bone-100' : 'text-ink-800/70 hover:text-ink-900');
  const chip = (st) => STATUS_UI[st] || STATUS_UI.future;
  const r = rep && rep.tab === tab ? rep : null;

  const exportCsv = () => {
    if (!r) return;
    const tag = `${period}-${r.from}`;
    if (tab === 'attendance') {
      if (period === 'month') {
        downloadCsv(`ADAS-attendance-${tag}.csv`, [['Name', 'Email', 'Working days', 'Present', 'Hours', 'Late', 'Late minutes', 'Late dates', 'No check-out', 'Absent', 'Site visits', 'Short leave (h)', 'Short leave over', ...r.leaveTypes.filter((t) => t !== 'Site visit').map((t) => `${t} leave`)],
          ...r.rows.map((x) => [x.name, x.email, x.workingDays, x.present, x.hours, x.late, x.lateMinutes, x.lateDates.join(' '), x.noCheckout, x.absent, x.siteDays || 0, x.shortLeaveHours, x.shortLeaveOver, ...r.leaveTypes.filter((t) => t !== 'Site visit').map((t) => x.leave[t] || 0)])]);
      } else {
        const ds = r.rows[0] ? r.rows[0].daily.map((d) => d.date) : [];
        downloadCsv(`ADAS-attendance-${tag}.csv`, [['Name', 'Email', ...ds.flatMap((d) => [`${d} status`, `${d} in`, `${d} out`, `${d} hours`])],
          ...r.rows.map((x) => [x.name, x.email, ...x.daily.flatMap((d) => [chip(d.status).label || d.status, d.in || '', d.out || '', d.hours || ''])])]);
      }
    } else {
      downloadCsv(`ADAS-leave-${tag}.csv`, [['Name', 'Email', 'Type', 'Start', 'End', 'Days', 'Days in period', 'Status', 'Note'],
        ...r.entries.map((e) => [e.name, e.email, e.type, e.start, e.end, e.days, e.daysInPeriod, e.status, e.note]),
        [], ['Balances ' + r.year, '', 'For year', 'Carried', 'Total', 'Taken', 'Pending', 'Left', 'Joined'],
        ...r.people.map((x) => [x.name, x.email, x.entitlement, x.carried, x.allowance, x.used, x.pending, x.remaining, x.joinDate])]);
    }
  };

  return (
    <div className="glass mt-6 rounded-3xl p-6 shadow-soft md:p-10">
      <p className="stamp text-gold-600">Manager dashboard</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-ink-900/10 p-1">
          {[['attendance', 'Attendance'], ['leave', 'Leave']].map(([k, l]) => <button key={k} onClick={() => { setTab(k); setOpen(null); }} className={seg(tab === k)}>{l}</button>)}
        </div>
        <div className="flex rounded-full border border-ink-900/10 p-1">
          {[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(([k, l]) => <button key={k} onClick={() => { setPeriod(k); setDate(todayIso); setOpen(null); }} className={seg(period === k)}>{l}</button>)}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button aria-label="Previous" onClick={() => setDate(isoShift(date, period, -1))} className="grid h-9 w-9 place-items-center rounded-full border border-ink-900/12 text-ink-800/70 hover:border-gold-400">←</button>
        <p className="text-center font-display text-2xl text-ink-900">{title}</p>
        <button aria-label="Next" disabled={!canNext} onClick={() => setDate(isoShift(date, period, 1))} className="grid h-9 w-9 place-items-center rounded-full border border-ink-900/12 text-ink-800/70 hover:border-gold-400 disabled:opacity-30">→</button>
      </div>
      {date !== todayIso && <button onClick={() => setDate(todayIso)} className="mx-auto mt-1 block stamp text-ink-700/60 hover:text-gold-600">Back to today</button>}

      {busy && <p className="mt-5 stamp text-ink-700/60">Loading…</p>}
      {err && <p className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-700">{err}</p>}

      {r && !busy && tab === 'attendance' && period === 'day' && (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {['ontime', 'late', 'site', 'absent', 'leave', 'waiting'].filter((k) => r.totals[k]).map((k) => (
              <span key={k} className={'rounded-full px-3 py-1 text-xs ' + chip(k).cls}>{chip(k).label} {r.totals[k]}</span>
            ))}
            {r.rows.some((x) => x.daily[0].outNow) && <span className="rounded-full bg-lilac-400/20 px-3 py-1 text-xs text-lilac-600">Out on short leave {r.rows.filter((x) => x.daily[0].outNow).length}</span>}
          </div>
          <ul className="mt-4 divide-y divide-ink-900/10">
            {r.rows.map((x) => { const d = x.daily[0]; const c = chip(d.status); return (
              <li key={x.email} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-ink-900">{x.name}</p>
                  <p className="text-xs text-ink-800/60">
                    {d.status === 'site' && <span>{d.note}{d.in ? ' · ' : d.noCheckin ? ' · no check-in yet' : ''}</span>}
                    {d.in ? `${d.in}${d.out ? ` — ${d.out}` : ''}${d.hours ? ` · ${d.hours}h` : ''}${d.lateMin ? ` · ${d.lateMin} min late` : ''}${d.shortMin ? ` · ${d.shortMin} min short leave` : ''}` : (d.status === 'leave' ? 'Approved leave' : d.status === 'site' ? '' : d.note || '')}
                    {d.outNow && <span className="text-lilac-600"> · out since {d.outNow}</span>}
                  </p>
                </div>
                {c.label && <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] ' + c.cls}>{d.status === 'leave' ? d.note : c.label}</span>}
              </li>); })}
          </ul>
        </>
      )}

      {r && !busy && tab === 'attendance' && period === 'week' && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left">
              <th className="py-2 text-[10px] font-normal uppercase tracking-wider text-ink-700/50">Name</th>
              {r.rows[0] && r.rows[0].daily.slice(0, 5).map((d) => <th key={d.date} className="px-0.5 py-2 text-center text-[10px] font-normal uppercase tracking-wider text-ink-700/50">{fmtD(d.date, { weekday: 'short' }).slice(0, 2)}<br />{d.date.slice(8)}</th>)}
              <th className="hidden py-2 text-right text-[10px] font-normal uppercase tracking-wider text-ink-700/50 sm:table-cell">Hours</th>
            </tr></thead>
            <tbody className="divide-y divide-ink-900/10">
              {r.rows.map((x) => (
                <tr key={x.email}>
                  <td className="max-w-[90px] truncate py-2.5 pr-2 text-ink-900">{x.name}</td>
                  {x.daily.slice(0, 5).map((d) => { const c = chip(d.status); return (
                    <td key={d.date} className="py-2.5 text-center" title={`${c.label}${d.in ? ' ' + d.in : ''}${d.note ? ' · ' + d.note : ''}`}>
                      {c.short ? <span className={'inline-grid h-6 min-w-[24px] place-items-center rounded-full px-1 text-[10px] ' + c.cls}>{c.short}</span> : <span className="text-ink-700/30">·</span>}
                    </td>); })}
                  <td className="hidden py-2.5 text-right text-ink-800/80 sm:table-cell">{x.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-800/60">✓ on time · L late · S site visit · A absent · LV on leave · … not in yet{r.holidays.length ? ` · holiday: ${r.holidays.map((h) => h.name).join(', ')}` : ''}</p>
        </div>
      )}

      {r && !busy && tab === 'attendance' && period === 'month' && (
        <ul className="mt-5 divide-y divide-ink-900/10">
          {r.rows.map((x) => (
            <li key={x.email} className="py-3">
              <button onClick={() => setOpen(open === x.email ? null : x.email)} className="flex w-full items-center justify-between gap-3 text-left">
                <span className="text-ink-900">{x.name}</span>
                <span className="flex shrink-0 gap-3 text-xs text-ink-800/70">
                  <span>{x.present}/{x.workingDays} days</span><span>{x.hours}h</span>
                  {x.siteDays > 0 && <span>{x.siteDays} site</span>}
                  {x.late > 0 && <span className="text-lilac-600">{x.late} late</span>}
                  {x.absent > 0 && <span className="text-red-700">{x.absent} absent</span>}
                </span>
              </button>
              {open === x.email && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {[['Present', `${x.present} of ${x.workingDays}`], ['Hours', x.hours], ['Late', `${x.late} · ${x.lateMinutes} min`], ['No check-out', x.noCheckout], ['Absent', x.absent], ['Site visits', x.siteDays || 0],
                    ['Short leave', `${x.shortLeaveHours}h${x.shortLeaveOver ? ` · ${x.shortLeaveOver} over` : ''}`], ...Object.entries(x.leave).map(([t, v]) => [`${t} leave`, `${v}d`])].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-ink-900/10 p-2.5"><p className="stamp text-[9px] text-ink-700/50">{k}</p><p className="mt-1 text-sm text-ink-900">{v}</p></div>
                  ))}
                  {x.lateDates.length > 0 && <p className="col-span-full text-ink-800/60">Late on: {x.lateDates.join(', ')}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {r && !busy && tab === 'leave' && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[['On leave', r.totals.people], ['Leave days', r.totals.approvedDays], ['Pending', r.totals.pending]].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-ink-900/10 p-3 text-center"><p className="font-display text-3xl text-ink-900">{v}</p><p className="mt-1 text-xs text-ink-800/60">{k}</p></div>
            ))}
          </div>
          {r.totals.siteVisits > 0 && <p className="mt-3 text-xs text-ink-800/60">Plus {r.totals.siteVisits} site visit{r.totals.siteVisits === 1 ? '' : 's'} (counted as worked, not leave).</p>}
          <p className="mt-6 stamp text-ink-700/60">{period === 'day' ? 'On leave or on site' : 'Leave and site visits in this period'}</p>
          {r.entries.length === 0 ? <p className="mt-2 text-sm text-ink-800/70">No leave {period === 'day' ? 'on this day' : 'in this period'}.</p> : (
            <ul className="mt-2 divide-y divide-ink-900/10">
              {r.entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-ink-900">{e.name} <span className="ml-1 rounded-full bg-ink-900/5 px-2 py-0.5 text-[11px] text-ink-800/70">{e.type}</span></p>
                    <p className="text-xs text-ink-800/60">{fmtD(e.start, { day: 'numeric', month: 'short' })}{e.end !== e.start && ` — ${fmtD(e.end, { day: 'numeric', month: 'short' })}`} · {e.days}d{e.daysInPeriod !== e.days ? ` (${e.daysInPeriod} in this ${period})` : ''}{e.work && e.note ? ` · ${e.note}` : ''}</p>
                  </div>
                  <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] ' + (/^approved$/i.test(e.status) ? (e.work ? 'bg-bone-300/60 text-ink-900' : 'bg-gold-400/20 text-gold-700') : 'bg-lilac-400/20 text-lilac-600')}>{e.status}</span>
                </li>
              ))}
            </ul>
          )}
          <details className="mt-6" open={period === 'month'}>
            <summary className="cursor-pointer stamp text-ink-700/60 hover:text-gold-600">Annual leave balances {r.year}</summary>
            <ul className="mt-2 divide-y divide-ink-900/10 text-sm">
              {r.people.map((x) => (
                <li key={x.email} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-ink-900">{x.name}</span>
                  <span className="text-right text-xs text-ink-800/70">{x.remaining} of {x.allowance} left · {x.used} taken{x.pending ? ` · ${x.pending} pending` : ''}{x.carried ? ` · ${x.carried} carried` : ''}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      {r && !busy && (
        <button onClick={exportCsv} className="magnetic-btn mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink-900/15 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-ink-900 transition hover:border-gold-400">
          Download for Excel ↓
        </button>
      )}
    </div>
  );
}

const hm = (min) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`;

/* Step out / Back in during the day — limits come from the API */
function ShortLeave({ perm, busy, reason, setReason, planned, setPlanned, btnPair, onGo }) {
  const [, tick] = useState(0);
  useEffect(() => { if (!perm.open) return undefined; const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, [perm.open]);
  const nowMin = (() => { const [h, m] = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' }).split(':').map(Number); return h * 60 + m; })();
  const [oh, om] = perm.open ? perm.open.out.split(':').map(Number) : [0, 0];
  const outFor = perm.open ? Math.max(0, nowMin - (oh * 60 + om)) : 0;
  const leftWhileOut = perm.open ? perm.open.allowed - outFor : 0; // negative = over
  const over = perm.open && leftWhileOut < 0;
  const dayLeft = Math.max(0, perm.limits.day - perm.dayMin), weekLeft = Math.max(0, perm.limits.week - perm.weekMin);
  const req = perm.request;
  const state = perm.open ? 'out' : req && req.status === 'Approved' ? 'approved' : req && req.status === 'Requested' ? 'waiting' : 'idle';
  const options = [15, 30, 45, 60, 90].filter((m) => m <= perm.leftMin);
  useEffect(() => {
    if (state === 'idle' && options.length && !options.includes(planned)) setPlanned(options[options.length > 1 ? 1 : 0]);
  }, [state, perm.leftMin]); // eslint-disable-line react-hooks/exhaustive-deps
  const ghost = btnPair + ' border border-ink-900/15 text-ink-900 hover:border-gold-400';

  return (
    <div className="mt-8 border-t border-ink-900/10 pt-6">
      <div className="flex items-end justify-between gap-3">
        <p className="font-display text-2xl text-ink-900">Short leave</p>
        <p className="text-right text-xs text-ink-800/70">{perm.open
          ? (over ? `${hm(-leftWhileOut)} over` : `${hm(leftWhileOut)} left`)
          : `${hm(dayLeft)} left today · ${hm(weekLeft)} this week`}</p>
      </div>
      <p className="mt-1 text-xs text-ink-800/60">Up to {hm(perm.limits.day)} a day and {hm(perm.limits.week)} a week, with your manager's approval.</p>

      {state === 'idle' && (
        <>
          {req && req.status === 'Declined' && (
            <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-700">{req.decidedBy || 'Your manager'} declined your request for {req.planned} min.</p>
          )}
          {options.length > 0 ? (
            <>
              <div className="mt-4">
                <span className="stamp text-ink-700/60">How long</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {options.map((m) => (
                    <button type="button" key={m} onClick={() => setPlanned(m)} aria-pressed={planned === m}
                      className={'rounded-full border px-3.5 py-1.5 text-sm transition ' + (planned === m ? 'border-gold-400 bg-gold-400/15 text-ink-900' : 'border-ink-900/12 text-ink-800/70 hover:border-gold-400')}>
                      {m < 60 ? `${m} min` : `${m / 60} h`}
                    </button>
                  ))}
                </div>
              </div>
              <label className="mt-4 block"><span className="stamp text-ink-700/60">Reason (optional)</span>
                <input type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. bank, doctor, school pickup"
                  className="mt-2 w-full rounded-none border-0 border-b border-ink-900/12 bg-transparent px-0 py-3 text-ink-900 outline-none placeholder:text-ink-700/40 focus:border-gold-400 focus:ring-0" />
              </label>
              <button onClick={() => onGo('permRequest')} disabled={!!busy}
                className={btnPair + ' mt-4 w-full bg-lilac-500 text-white hover:bg-lilac-600'}>
                {busy === 'permRequest' ? 'Sending…' : 'Request to step out'}
              </button>
            </>
          ) : (
            <p className="mt-4 text-center text-sm text-ink-700/70">No short leave left {dayLeft <= 0 ? 'today' : 'this week'}.</p>
          )}
        </>
      )}

      {state === 'waiting' && (
        <div className="mt-4 rounded-2xl bg-lilac-400/15 p-4 text-sm text-ink-900">
          <p>Waiting for your manager's approval · {req.planned} min{req.reason ? ` · ${req.reason}` : ''}</p>
          <p className="mt-1 text-xs text-ink-800/60">This page checks for the answer automatically.</p>
          <button onClick={() => onGo('permCancel')} disabled={!!busy} className="mt-3 stamp text-ink-700/60 hover:text-red-700">Cancel request</button>
        </div>
      )}

      {state === 'approved' && (
        <>
          <p className="mt-4 rounded-2xl bg-gold-400/15 p-4 text-sm text-ink-900">
            Approved by {req.decidedBy || 'your manager'} · {req.planned} min{req.reason ? ` · ${req.reason}` : ''}. Tap Step out when you leave.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => onGo('permOut')} disabled={!!busy} className={btnPair + ' bg-lilac-500 text-white hover:bg-lilac-600'}>
              {busy === 'permOut' ? 'Locating…' : 'Step out'}
            </button>
            <button onClick={() => onGo('permCancel')} disabled={!!busy} className={ghost}>Cancel</button>
          </div>
        </>
      )}

      {state === 'out' && (
        <>
          <p className={'mt-4 rounded-2xl p-4 text-sm ' + (over ? 'bg-red-500/10 text-red-700' : 'bg-lilac-400/15 text-ink-900')}>
            Out since {perm.open.out}{perm.open.reason ? ` · ${perm.open.reason}` : ''} — {hm(outFor)} so far{perm.open.planned ? ` of ${perm.open.planned} min approved` : ''}{over ? ' · over' : ''}
          </p>
          <button onClick={() => onGo('permIn')} disabled={!!busy} className={btnPair + ' mt-4 w-full bg-lilac-500 text-white hover:bg-lilac-600'}>
            {busy === 'permIn' ? 'Locating…' : 'Back in'}
          </button>
        </>
      )}
    </div>
  );
}

/* Manager: today's short-leave requests, who is out now */
function ShortLeaveQueue() {
  const [q, setQ] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const load = (action = 'permQueue', extra = {}) => attCall(action, extra).then((r) => {
    if (r.ok) { setQ(r); return r; }
    if (action !== 'permQueue') setMsg({ type: 'error', text: r.error });
    return null;
  }).catch(() => null);
  useEffect(() => { load(); const t = setInterval(() => load(), 45000); return () => clearInterval(t); }, []);
  if (!q || !q.manager) return null;
  const decide = async (r, decision) => {
    setBusy(r.id + decision); setMsg(null);
    const res = await load('permDecide', { id: r.id, decision });
    if (res) setMsg({ type: 'ok', text: `${decision === 'approve' ? 'Approved' : 'Declined'} ${r.name}'s short leave.` });
    setBusy('');
  };
  const btn = 'magnetic-btn inline-flex items-center justify-center rounded-full px-5 py-3 text-[11px] uppercase tracking-[0.18em] transition disabled:opacity-40';
  return (
    <div className="glass mt-6 rounded-3xl p-6 shadow-soft md:p-10">
      <div className="flex items-center justify-between">
        <p className="stamp text-gold-600">Short leave requests · today</p>
        <button onClick={() => load()} className="stamp text-ink-700/60 hover:text-gold-600">Refresh</button>
      </div>
      {q.requests.length === 0 ? <p className="mt-4 text-sm text-ink-800/70">No requests waiting.</p> : (
        <ul className="mt-4 space-y-3">
          {q.requests.map((r) => (
            <li key={r.id} className="rounded-2xl border border-ink-900/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-ink-900">{r.name}</p>
                  <p className="text-sm text-ink-800/70">{r.planned} min{r.reason ? ` · ${r.reason}` : ''}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-800/60">{r.left} min left today</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => decide(r, 'approve')} disabled={!!busy} className={btn + ' bg-gold-400 text-ink-950 hover:bg-gold-300'}>Approve</button>
                <button onClick={() => decide(r, 'decline')} disabled={!!busy} className={btn + ' border border-ink-900/15 text-ink-900 hover:border-red-500 hover:text-red-700'}>Decline</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {q.out.length > 0 && (
        <div className="mt-6">
          <p className="stamp text-ink-700/60">Out now</p>
          <ul className="mt-2 space-y-1 text-sm">
            {q.out.map((r) => <li key={r.id} className="flex justify-between"><span className="text-ink-900">{r.name}</span><span className="text-ink-800/70">since {r.out} · {r.planned} min approved</span></li>)}
          </ul>
        </div>
      )}
      {msg && <p role="status" className={'mt-4 rounded-xl p-3 text-sm ' + (msg.type === 'error' ? 'bg-red-500/10 text-red-700' : 'bg-gold-400/10 text-ink-800')}>{msg.text}</p>}
    </div>
  );
}

function TeamPage() {
  const [step, setStep] = useState('loading'); // loading | signin | home
  const [me, setMe] = useState(null);           // { name, email, today }
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);         // { type: 'error' | 'ok', text }
  const [clock, setClock] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 15000); return () => clearInterval(t); }, []);

  const loadStatus = async () => {
    const r = await attCall('status');
    if (r.ok) { setMe(r); setStep('home'); return; }
    setStep('signin');
    if (r.error !== 'signed_out') setMsg({ type: 'error', text: r.error });
  };

  useEffect(() => {
    if (!attConfigured()) { setStep('signin'); return; }
    let returnedError = '';
    try { returnedError = sessionStorage.getItem('adas_att_error') || ''; sessionStorage.removeItem('adas_att_error'); } catch (e) { /* ignore */ }
    loadStatus()
      .then(() => { if (returnedError) setMsg({ type: 'error', text: 'Microsoft sign-in did not finish. Please try again. (' + returnedError.split('\n')[0].slice(0, 140) + ')' }); })
      .catch(() => setStep('signin'));
  }, []);

  const run = async (label, fn) => {
    setBusy(label); setMsg(null);
    try { await fn(); }
    catch (e) { setMsg({ type: 'error', text: e.message || 'Connection problem. Please try again.' }); }
    finally { setBusy(''); }
  };

  /* Full-page redirect (more reliable than pop-ups on phones). Microsoft
   * returns to /auth-popup.html, which stores the session and comes back here. */
  const signIn = () => run('signin', async () => {
    const app = await msal();
    await app.loginRedirect({ scopes: MS_SCOPES, prompt: 'select_account' });
  });

  const punch = (action) => run(action, async () => {
    const pos = await getPosition();
    const r = await attCall(action, pos);
    if (!r.ok) { if (r.error === 'signed_out') { setStep('signin'); throw new Error('Your session expired. Please sign in again.'); } throw new Error(r.error); }
    setMe((m) => ({ ...m, today: r.today, perm: r.perm !== undefined ? r.perm : m.perm }));
    setMsg({ type: 'ok', text: action === 'checkIn' ? 'Checked in. Have a great day.' : 'Checked out. See you tomorrow.' });
  });

  const [reason, setReason] = useState('');
  const [planned, setPlanned] = useState(30);
  const permGo = (action) => run(action, async () => {
    const needsPlace = action === 'permOut' || action === 'permIn';
    const body = needsPlace ? await getPosition() : action === 'permRequest' ? { planned, reason } : {};
    const r = await attCall(action, body);
    if (!r.ok) { if (r.error === 'signed_out') { setStep('signin'); throw new Error('Your session expired. Please sign in again.'); } throw new Error(r.error); }
    setMe((m) => ({ ...m, perm: r.perm }));
    if (action === 'permRequest') { setReason(''); setMsg({ type: 'ok', text: 'Request sent — you\'ll see the answer here.' }); }
    else if (action === 'permCancel') setMsg({ type: 'ok', text: 'Request cancelled.' });
    else if (action === 'permOut') setMsg({ type: 'ok', text: 'Stepped out. Tap Back in when you return.' });
    else setMsg(r.closed && /^over/i.test(r.closed.status)
      ? { type: 'error', text: `Welcome back — ${r.closed.minutes} min out, ${r.closed.status.toLowerCase()}.` }
      : { type: 'ok', text: `Welcome back — ${r.closed ? r.closed.minutes : 0} min out.` });
  });

  const waiting = me && me.perm && me.perm.request && me.perm.request.status === 'Requested';
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => { attCall('status').then((r) => { if (r.ok) setMe((m) => ({ ...m, perm: r.perm })); }).catch(() => {}); }, 30000);
    return () => clearInterval(t);
  }, [waiting]);

  const signOut = async () => {
    try { const app = await msal(); if (app.clearCache) await app.clearCache(); app.setActiveAccount(null); } catch (e) { /* ignore */ }
    setMe(null); setMsg(null); setStep('signin');
  };

  const today = me && me.today ? me.today : {};
  const btn = 'magnetic-btn inline-flex w-full items-center justify-center gap-3 rounded-full px-7 py-4 text-[12px] uppercase tracking-widest-2 transition disabled:cursor-not-allowed disabled:opacity-40';
  const btnPair = 'magnetic-btn inline-flex w-full items-center justify-center whitespace-nowrap rounded-full px-3 py-4 text-[12px] uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <>
      <PageHeader tag="— TEAM" title="Team" accent="Attendance."
        subtitle="Sign in with your Microsoft office account to check in and out, and to request annual leave." />
      <section className="relative pb-28">
        <div className="mx-auto w-[min(560px,92vw)]">
          <div className="glass rounded-3xl p-6 shadow-soft md:p-10">
            {!attConfigured() && (
              <p className="mb-6 rounded-xl border border-gold-400/40 bg-gold-400/10 p-4 text-sm text-ink-800">
                Attendance is not connected yet. The admin needs to finish the one-time Microsoft 365 setup.
              </p>
            )}

            {step === 'loading' && <p className="stamp text-ink-700/60">Loading…</p>}

            {step === 'signin' && (
              <div className="space-y-6">
                <p className="text-sm leading-relaxed text-ink-800/80">Use your <span className="font-medium text-ink-900">@adas.com.sa</span> Microsoft account. Only team members on the staff list can sign in.</p>
                <button onClick={signIn} disabled={!attConfigured() || !!busy}
                  className={btn + ' border border-ink-900/15 bg-white text-ink-900 hover:border-gold-400'}>
                  <MicrosoftMark />{busy === 'signin' ? 'Signing in…' : 'Sign in with Microsoft'}
                </button>
              </div>
            )}

            {step === 'home' && me && (
              <div>
                <p className="stamp text-gold-600">Signed in</p>
                <h2 className="mt-2 font-display text-4xl leading-tight text-ink-900">Hello, {me.name}</h2>
                <p className="mt-1 text-sm text-ink-800/70">
                  {clock.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })}
                  {' · '}{clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' })}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[['Check in', today.checkIn], ['Check out', today.checkOut]].map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-ink-900/10 p-4">
                      <p className="stamp text-ink-700/50">{k}</p>
                      <p className="mt-2 font-display text-3xl text-ink-900">{v || '—'}</p>
                    </div>
                  ))}
                </div>
                {today.hours && <p className="mt-3 text-sm text-ink-800/70">Today: {today.hours} hours{today.shortLeaveMin > 0 && ` (${hm(today.shortLeaveMin)} short leave deducted)`}</p>}

                {today.site && (
                  <p className="mt-3 rounded-xl bg-bone-300/40 px-3 py-2 text-sm text-ink-900">
                    Site visit today · {today.site.name}. You can check in and out from the site; late rules don't apply.
                  </p>
                )}
                {(() => {
                  const rules = today.rules;
                  if (!rules || today.site) return null;
                  const nowHM = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' });
                  if (today.checkIn) {
                    return today.lateMin > 0
                      ? <p className="mt-3 rounded-xl bg-lilac-400/15 px-3 py-2 text-sm text-lilac-600">Checked in late by {today.lateMin < 60 ? `${today.lateMin} min` : `${hm(today.lateMin)} h`} (on time until {rules.lateAfter}).</p>
                      : <p className="mt-3 text-sm text-gold-700">On time ✓</p>;
                  }
                  if (nowHM > rules.closes) {
                    return <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700">Check-in closed at {rules.closes}. Today is recorded as absent unless you have approved leave — please speak to your manager.</p>;
                  }
                  return <p className="mt-3 text-xs text-ink-800/70">On time until {rules.lateAfter} · late until {rules.closes} · after {rules.closes} check-in closes{nowHM > rules.lateAfter ? ' — you are now late' : ''}.</p>;
                })()}

                {today.checkIn && today.checkOut ? (
                  <p className="mt-8 rounded-2xl bg-gold-400/10 p-4 text-center text-sm text-ink-800">You're done for today.</p>
                ) : (
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <button onClick={() => punch('checkIn')} disabled={!!busy || !!today.checkIn
                      || (!!today.rules && !today.site && clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' }) > today.rules.closes)}
                      className={btnPair + ' bg-gold-400 text-ink-950 hover:bg-gold-300'}>
                      {busy === 'checkIn' ? 'Locating…' : 'Check in'}
                    </button>
                    <button onClick={() => punch('checkOut')} disabled={!!busy || !today.checkIn}
                      className={btnPair + ' bg-ink-900 text-bone-100 hover:bg-ink-800'}>
                      {busy === 'checkOut' ? 'Locating…' : 'Check out'}
                    </button>
                  </div>
                )}
                {!today.checkIn && !(today.rules && !today.site && clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Riyadh' }) > today.rules.closes)
                  && <p className="mt-3 text-center text-xs text-ink-700/60">Check out unlocks after you check in.</p>}

                {me.perm && today.checkIn && !today.checkOut && (
                  <ShortLeave perm={me.perm} busy={busy} reason={reason} setReason={setReason} planned={planned} setPlanned={setPlanned} btnPair={btnPair} onGo={permGo} />
                )}
                <button onClick={signOut} className="stamp mt-8 w-full text-center text-ink-700/60 hover:text-gold-600">Sign out</button>
              </div>
            )}

            {msg && (
              <p role="status" className={'mt-6 rounded-xl p-4 text-sm ' + (msg.type === 'error' ? 'bg-red-500/10 text-red-700' : 'bg-gold-400/10 text-ink-800')}>
                {msg.text}
              </p>
            )}
          </div>
          {step === 'home' && me && <ShortLeaveQueue />}
          {step === 'home' && me && <AnnualLeave />}
          {step === 'home' && me && <ManagerDashboard />}
          <p className="mt-6 text-center text-xs leading-relaxed text-ink-700/60">
            Your location is read only when you press Check in or Check out, to confirm you are at the office.
            It is saved with your attendance record and used for nothing else.
          </p>
        </div>
      </section>
    </>
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
  else if (pathname === '/team') Page = TeamPage;

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
