export type ProjectCategory =
  | "Software & operations"
  | "AI & automation"
  | "Research & exploration";

export type Project = {
  slug: string;
  title: string;
  shortTitle: string;
  category: ProjectCategory;
  tags: string[];
  year: string;
  status: string;
  role: string;
  summary: string;
  headline: string;
  problem: string;
  contribution: string[];
  workflow: string[];
  decisions: string[];
  result: string;
  stack: string[];
  color: string;
  ink: string;
  cover: string;
  gallery: { src: string; alt: string; caption: string }[];
  links: { label: string; href: string }[];
  featured: boolean;
};

export const projects: Project[] = [
  {
    slug: "hitalent",
    title: "HiTalent / HITOPIA Insights",
    shortTitle: "HiTalent",
    category: "AI & automation",
    tags: ["Applied AI", "Automation", "Internal platform"],
    year: "2026",
    status: "Production platform",
    role: "Fullstack AI Engineer · freelance",
    summary:
      "AI tools, talent data, and reporting connected around the work of a recruitment team.",
    headline: "Less admin. More room for people.",
    problem:
      "Recruitment and talent operations involve a lot of work between the obvious steps: masking candidate CVs, checking time entries, preparing reports, and keeping information consistent across systems. These tasks were taking attention away from the people the team was trying to support.",
    contribution: [
      "Built an AI-assisted CV masking application that prepares candidate documents for the sourcing workflow.",
      "Shipped narrative PDF summaries from timesheet data, using LLM APIs to produce Bahasa Indonesia reporting.",
      "Developed overtime analysis with time-entry data, Indonesian public holidays, and n8n workflows.",
      "Built dashboard and aggregation features, addressed duplicate employee records, and developed talent-performance scoring with Jira analytics and weighted 360-degree review inputs.",
      "Worked on the transition from Clockify to an internal time-tracking API, including provider identity mapping and scoped reporting.",
    ],
    workflow: [
      "Bring candidate and talent information into a controlled workspace.",
      "Process documents and time entries through the appropriate AI or validation workflow.",
      "Review the output in the dashboard and export a usable report.",
    ],
    decisions: [
      "Keep company and project scoping on the server, rather than relying on interface filters for access control.",
      "Treat ambiguous identity matches as a review task instead of silently joining different people.",
      "Separate AI-generated narrative from the underlying calculations and source records.",
      "Retain a staged integration path and rollback configuration during the time-tracking provider change.",
    ],
    result:
      "These contributions sit inside an existing production platform, bringing AI processing and operational reporting closer to the team's daily workflow. The case study focuses on the document, reporting, and integration work I contributed.",
    stack: [
      "Next.js",
      "TypeScript",
      "Supabase",
      "PostgreSQL",
      "LLM APIs",
      "n8n",
      "Vercel",
    ],
    color: "#E6E5F2",
    ink: "#25264A",
    cover: "/images/projects/hitalent-cv.webp",
    gallery: [
      {
        src: "/images/projects/hitalent-cv.webp",
        alt: "Original HiTalent CV comparison interface with phone, email, and personal profile links permanently blurred",
        caption: "Original interface; CV content remains readable with sensitive contact details blurred.",
      },
      {
        src: "/images/projects/hitalent-detail.webp",
        alt: "HiTalent CV upload interface with account and candidate records excluded",
        caption: "From an uploaded document to a reusable recruitment output.",
      },
    ],
    links: [],
    featured: true,
  },
  {
    slug: "ut-operations",
    title: "United Tractors Internal Web",
    shortTitle: "United Tractors Internal Web",
    category: "Software & operations",
    tags: ["Operational software", "Full-stack", "Permissions"],
    year: "2026",
    status: "Prepilot",
    role: "Product definition & full-stack project development",
    summary:
      "One connected workspace for branch requests, inspections, tickets, assets, and document workflows.",
    headline: "A clearer way through the working day.",
    problem:
      "Branch operations span many small, connected jobs. A vehicle request leads to an inspection. An issue needs an owner, a history, and a clear next action. Staff need to know what they can do without first understanding the organisation's entire process map.",
    contribution: [
      "Defined and developed role-aware workflows for vehicle requests and P2H inspections, IT tickets, findings, assets, and stocktaking.",
      "Shaped dashboards around the work waiting for each person, with forms and tables that also work on a phone.",
      "Developed an outgoing-letter registry with year-based numbering, scoped visibility, cancellation history, and audit records.",
      "Worked through operational exceptions including repeated submissions, concurrent edits, private attachments, and draft recovery.",
    ],
    workflow: [
      "Start with the next task for the signed-in role.",
      "Submit a request, inspection, or finding with the information the process actually needs.",
      "Route it to the responsible person and preserve its decisions and history.",
    ],
    decisions: [
      "Enforce permissions on the server and scope records to the person and responsibility involved.",
      "Issue document numbers transactionally and retain cancelled numbers in the history.",
      "Preserve entered information when validation or connectivity interrupts a form.",
      "Use adaptive tables, bilingual interface text, and text-size preferences for everyday accessibility.",
    ],
    result:
      "The portal is implemented as a local prepilot, with documented automated checks and recovery work. The next stage is human UAT, physical-device validation, and production activation.",
    stack: [
      "Laravel",
      "PHP",
      "React",
      "TypeScript",
      "Inertia",
      "PostgreSQL",
      "Docker",
    ],
    color: "#F4D642",
    ink: "#24251D",
    cover: "/images/projects/ut-internal-web.webp",
    gallery: [
      {
        src: "/images/projects/ut-internal-web.webp",
        alt: "Complete United Tractors internal dashboard with navigation, branch overview, and Administration Department Head role; account name blurred",
        caption: "The complete internal dashboard for an Administration Department Head: branch overview, vehicles, findings, assets, IT tickets, and outgoing letters. Account name blurred; role remains visible.",
      },
      {
        src: "/images/projects/ut-services.webp",
        alt: "United Tractors service shortcuts for vehicle borrowing, device reports, and IT assistance",
        caption: "Everyday services in detail: vehicle borrowing, device reports, and IT assistance, grouped around the signed-in user's tasks.",
      },
      {
        src: "/images/projects/ut-operations-detail.webp",
        alt: "A detailed operational request view in the United Tractors internal web",
        caption: "The working detail behind an operational request.",
      },
    ],
    links: [],
    featured: true,
  },
  {
    slug: "methodata",
    title: "Methodata",
    shortTitle: "Methodata",
    category: "Software & operations",
    tags: ["Administration", "Full-stack", "Data & permissions"],
    year: "2026",
    status: "In development",
    role: "Product definition & full-stack project development",
    summary:
      "Church administration software that respects the people, structure, and decisions behind every record.",
    headline: "Connected records. Considered decisions.",
    problem:
      "Church administration needs more than a directory. People move between responsibilities and districts, conferences have their own stages, and sensitive decisions require clear authority and consent. The software has to reflect those rules without making routine work feel complicated.",
    contribution: [
      "Developed connected personnel records, church and district structure, assignments, and conference workflows.",
      "Translated organisational requirements into scoped permissions, approval paths, and effective dates.",
      "Worked on confidential approval and history workflows with explicit consent and additional authentication for sensitive actions.",
      "Created a synthetic interface preview so the product could be explored without exposing real personnel or connecting to live services.",
    ],
    workflow: [
      "Choose the workspace and responsibility you are authorised to use.",
      "Find the person, organisation, or conference involved in the task.",
      "Submit a change, collect the required approvals, and preserve the resulting history.",
    ],
    decisions: [
      "Keep access tied to real organisational scope and terms of responsibility.",
      "Freeze conference participants when a conference opens so later changes do not rewrite its basis.",
      "Require both responsible district leaders to approve cross-district transfers.",
      "Keep private workflows, historical proposals, and consent records distinct from ordinary directory data.",
    ],
    result:
      "Methodata has a substantial implementation and local validation across the application, database, and recovery workflows. It is still in development, with human UAT and cloud validation pending. The public preview is an older, isolated interface using synthetic in-memory data.",
    stack: [
      "React",
      "TypeScript",
      "Vite",
      "Hono",
      "Supabase",
      "PostgreSQL",
      "Cloudflare",
    ],
    color: "#DCE8DC",
    ink: "#284235",
    cover: "/images/projects/methodata.webp",
    gallery: [
      {
        src: "/images/projects/methodata.webp",
        alt: "Methodata district and personnel workspace using synthetic example data",
        caption: "A connected administration workspace with synthetic example data.",
      },
      {
        src: "/images/projects/methodata-detail.webp",
        alt: "Methodata synthetic preview showing district workspace selection",
        caption: "Start with the district and responsibility involved in the task.",
      },
    ],
    links: [
      {
        label: "Explore the UI preview",
        href: "https://ui-preview.methodata-staging.pages.dev/app",
      },
    ],
    featured: true,
  },
  {
    slug: "family-gathering",
    title: "UT Family Gathering",
    shortTitle: "Family Gathering",
    category: "Software & operations",
    tags: ["Event experience", "Real-time", "Full-stack"],
    year: "2026",
    status: "Implemented · awaiting event use",
    role: "Product definition & full-stack project development",
    summary:
      "From one-scan registration to a synchronized door-prize screen, built to keep an event moving.",
    headline: "One scan. A whole event in motion.",
    problem:
      "An event registration flow has to work while people are arriving, families are moving, and a committee is doing several things at once. The door-prize experience also needs to feel exciting while keeping the actual selection reliable and consistent across screens.",
    contribution: [
      "Developed QR registration without a participant login, a persistent boarding pass, and a committee dashboard.",
      "Built participant correction and PDF reporting workflows for the organisers.",
      "Created separate operator and public projector experiences with synchronized winner reveals.",
      "Defined draw rules around one employee entry, no repeat winners, disqualification, replacement slots, and separate prize collection tracking.",
    ],
    workflow: [
      "Scan the event QR and complete a single registration.",
      "Keep the boarding pass while the committee manages the attendance record.",
      "Run the draw from the operator view and reveal the saved result on the public screen.",
    ],
    decisions: [
      "Save the winner before the animated reveal so refreshing a display does not create a new result.",
      "Use transactions, uniqueness constraints, and idempotent requests for concurrent operators and double clicks.",
      "Preserve employee numbers as strings so leading zeros are not lost.",
      "Keep employee identifiers off the public projector and provide a reduced-motion presentation.",
    ],
    result:
      "The local database-backed system is implemented and has passed recorded logic, browser, and build checks. It is prepared for the event planned for 14 November 2026. Attendance and event outcomes are not yet reported; the illustrated participants are synthetic.",
    stack: [
      "Next.js",
      "TypeScript",
      "React",
      "libSQL",
      "Drizzle",
      "QR codes",
      "jsPDF",
    ],
    color: "#C9BDFA",
    ink: "#2D2350",
    cover: "/images/projects/family-gathering.webp",
    gallery: [
      {
        src: "/images/projects/family-gathering.webp",
        alt: "Family Gathering registration and boarding pass presentation with sample participant data",
        caption: "The registration experience and event identity, shown with sample data.",
      },
      {
        src: "/images/projects/family-gathering-detail.webp",
        alt: "Family Gathering QR registration presentation",
        caption: "A single entry point for the arrival experience.",
      },
    ],
    links: [],
    featured: true,
  },
  {
    slug: "coal-agro",
    title: "Coal / Agro Visit Reports",
    shortTitle: "Coal / Agro",
    category: "Software & operations",
    tags: ["Field reporting", "Data reconciliation", "Prototype"],
    year: "2026",
    status: "Local prototype",
    role: "Product definition & application development",
    summary:
      "A field-reporting workspace that helps people compare figures, resolve differences, and keep the source of a decision.",
    headline: "Make the differences visible.",
    problem:
      "Two people can return from the same site with different figures. A useful reporting tool needs to preserve both accounts, make the disagreement understandable, and record how a final value was chosen. A cleaner form alone does not solve that problem.",
    contribution: [
      "Developed Coal and Agro visit forms, spreadsheet-like record views, and a report-comparison workspace.",
      "Defined source-preserving review decisions and immutable final snapshots.",
      "Handled Coal, overburden, and stripping-ratio calculations with decimal-safe numeric input.",
      "Kept conflicting Agro contractor figures as attributed notes when a single reconciled value would be misleading.",
    ],
    workflow: [
      "Capture each visit report as its own source record.",
      "Compare relevant reports and review conflicting values in context.",
      "Choose the accepted values and save a final snapshot with source attribution.",
    ],
    decisions: [
      "Distinguish a missing value from a measured zero.",
      "Use explicit reconciliation choices instead of automatically averaging conflicting reports.",
      "Preserve earlier records and provenance through data migrations.",
      "Keep browser-local storage limitations visible in the project's current stage.",
    ],
    result:
      "A functioning local prototype with recorded automated and responsive checks. Records currently live in each browser's localStorage; shared storage, authentication, cross-device use, and production deployment are outside the implemented stage.",
    stack: ["React", "TypeScript", "Vite", "Zod", "decimal.js", "CSS Modules"],
    color: "#DDE5EE",
    ink: "#25394D",
    cover: "/images/projects/coal-agro.webp",
    gallery: [
      {
        src: "/images/projects/coal-agro.webp",
        alt: "Coal and Agro reporting comparison workspace with attributed sample source values",
        caption: "Comparing source reports before accepting a final record.",
      },
      {
        src: "/images/projects/coal-agro-detail.webp",
        alt: "A final Coal and Agro report retaining its source attribution",
        caption: "A final record that keeps the sources behind the decision.",
      },
    ],
    links: [],
    featured: false,
  },
  {
    slug: "astron-onboarding",
    title: "ASTRON Onboarding",
    shortTitle: "ASTRON",
    category: "Software & operations",
    tags: ["Learning experience", "Deployment", "Mobile & offline"],
    year: "2026",
    status: "Deployed internally · internal validation",
    role: "Web development & learning-workflow implementation",
    summary:
      "Role-based learning, quizzes, and practical preparation built around the conditions of the work.",
    headline: "Learning that travels with the team.",
    problem:
      "A technical onboarding programme contains a lot of material, but each person needs a different route through it. The portal needed to make that material usable on phones, support practical preparation, and work around imperfect connectivity.",
    contribution: [
      "Built role-specific learning routes, progress views, glossary access, quizzes, and practical preparation workflows.",
      "Used Markdown-based content to keep the portal aligned with maintained learning material.",
      "Worked on mobile-friendly tables, offline access, and video loading only when requested.",
      "Supported an internal container deployment and resolved an issue affecting quiz submissions behind a reverse proxy.",
    ],
    workflow: [
      "Choose the learning route for the role.",
      "Move between short learning units, reference material, and knowledge checks.",
      "Use the practical checklist to prepare for a conversation and validation with the team.",
    ],
    decisions: [
      "Keep learning content in Markdown and synchronise it during the build to reduce documentation drift.",
      "Treat device progress and practice checklists as personal preparation, rather than formal certification.",
      "Make media delivery and deployment fit the internal environment.",
      "Use domain feedback to refine whether the learning path reflects field conditions.",
    ],
    result:
      "The portal was deployed internally and tested there, including a successful quiz submission after a deployment fix. Its current stage is internal validation, with feedback from the people preparing to use the material in their work.",
    stack: ["Astro", "TypeScript", "Markdown", "Node.js", "Docker", "GitLab CI"],
    color: "#DBE5FA",
    ink: "#293C69",
    cover: "/images/projects/astron-onboarding.webp",
    gallery: [
      {
        src: "/images/projects/astron-onboarding.webp",
        alt: "Recreated role-based onboarding portal containing synthetic learning modules",
        caption: "A recreated learning route using synthetic, non-confidential content.",
      },
    ],
    links: [],
    featured: false,
  },
  {
    slug: "video-violence-detection",
    title: "Video-analysis Research",
    shortTitle: "Video-analysis research",
    category: "Research & exploration",
    tags: ["Computer vision", "Knowledge distillation", "Research"],
    year: "2025–2026",
    status: "Research",
    role: "Researcher & lead author",
    summary:
      "Exploring efficient video understanding, knowledge distillation, and the gap between a benchmark and the real world.",
    headline: "A smaller model. Bigger questions.",
    problem:
      "A video model can be accurate on familiar data and still struggle in a different environment. My research looks at efficient architectures and the harder question of how their behaviour changes when the source of the video changes.",
    contribution: [
      "Developed an undergraduate research project on logit-based knowledge distillation for video violence detection, using X3D architectures.",
      "Explored transferring predictions from a larger teacher model to a lighter student model.",
      "Co-authored the separately published paper, Performance Analysis of X3D-XS Architecture for Cross-Domain Real-World Violence Detection.",
    ],
    workflow: [
      "Prepare controlled training and evaluation data.",
      "Train and compare the selected model configurations.",
      "Evaluate efficiency and behaviour across domains, then document the limitations.",
    ],
    decisions: [
      "Discuss speed and generalisation together rather than presenting a single accuracy number as the whole result.",
      "Keep the knowledge-distillation thesis and published cross-domain paper identified as distinct research records.",
      "Frame the work as research rather than a production surveillance deployment.",
    ],
    result:
      "The cross-domain X3D-XS paper was published in IJNMT on 30 June 2026. It reports the efficiency of the architecture alongside substantial domain-shift limitations. The knowledge-distillation thesis is a separate strand of this research work.",
    stack: ["Python", "Deep learning", "Computer vision", "X3D", "Knowledge distillation"],
    color: "#E4DFD8",
    ink: "#42392F",
    cover: "/images/projects/video-violence-detection.webp",
    gallery: [
      {
        src: "/images/projects/video-violence-detection.webp",
        alt: "Video-analysis research visualization comparing original frames and model attention heatmaps",
        caption: "An original visualization from the knowledge-distillation project. The separately published X3D-XS paper has its own experiments and results.",
      },
    ],
    links: [
      {
        label: "Read the published paper",
        href: "https://ejournals.umn.ac.id/index.php/IJNMT/article/view/4505",
      },
    ],
    featured: false,
  },
  {
    slug: "palm-counting",
    title: "Palm-tree Counting from Geospatial Imagery",
    shortTitle: "Palm-tree counting",
    category: "AI & automation",
    tags: ["Computer vision", "Geospatial", "API development"],
    year: "2024–2025",
    status: "Internship project",
    role: "AI API Engineer intern",
    summary:
      "Connecting a computer-vision model to the data preparation and APIs needed to use it.",
    headline: "From imagery to a usable count.",
    problem:
      "Finding trees in high-density geospatial imagery involves more than running a detector. The training data has to be prepared carefully, and the model's output needs a route into the systems where the result will be used.",
    contribution: [
      "Developed a YOLO-based computer-vision model for identifying and counting palm trees from geospatial imagery.",
      "Worked across dataset labelling, cleaning, and preparation during an internship at PT Ekosistem Geospasial Mandiri.",
      "Built and optimised API integrations to connect model inference with the company's services.",
    ],
    workflow: [
      "Label and prepare the imagery dataset.",
      "Train and evaluate the object detector.",
      "Expose usable inference output through an application interface.",
    ],
    decisions: [
      "Give data quality the same attention as model selection.",
      "Design the model integration around usable outputs, rather than leaving it as an isolated experiment.",
      "Keep performance claims tied to the dataset and evaluation method used.",
    ],
    result:
      "The project formed part of my AI API engineering internship from September 2024 to January 2025. It gave me hands-on experience across the model, data pipeline, and integration, connecting experimental work with the requirements of an application.",
    stack: ["Python", "YOLO", "Computer vision", "Geospatial data", "API development"],
    color: "#DAE5CB",
    ink: "#30442D",
    cover: "/images/projects/palm-counting.webp",
    gallery: [
      {
        src: "/images/projects/palm-counting.webp",
        alt: "Original geospatial detection output with identified palm-tree crowns",
        caption: "An example detection output from the palm-tree counting project. The image is not a dataset-wide accuracy benchmark.",
      },
    ],
    links: [],
    featured: false,
  },
  {
    slug: "gmi-bahtera",
    title: "GMI Bahtera Community Website",
    shortTitle: "GMI Bahtera",
    category: "Software & operations",
    tags: ["Community", "Web development", "Information design"],
    year: "2025",
    status: "Community project",
    role: "Web development & UI/UX design",
    summary:
      "Giving worship schedules and community information a clearer place to live.",
    headline: "Useful information, closer to everyone.",
    problem:
      "Community schedules and announcements were shared through printed material and spoken updates. A website offered another way for members to find the information when they needed it.",
    contribution: [
      "Developed an information-website prototype for GMI Bahtera Bandung Timur through a student community-service programme.",
      "Worked on the interface and content structure for service schedules, community news, and recurring information.",
      "Connected the design to the needs of the local organisation rather than building a generic organisation template.",
    ],
    workflow: [
      "Understand which information members look for most often.",
      "Organise schedules and announcements into a readable website.",
      "Review the prototype in the context of the community's existing communication.",
    ],
    decisions: [
      "Prioritise the practical information visitors came to find.",
      "Keep the interface readable on phones and straightforward for a broad audience.",
      "Describe the implemented prototype without inventing visitor or engagement statistics.",
    ],
    result:
      "A community-service website prototype focused on access to local information. This work is separate from Methodata, which addresses administration and organisational workflows.",
    stack: ["Next.js", "React", "Tailwind CSS", "UI/UX design"],
    color: "#F0DDD0",
    ink: "#563F32",
    cover: "/images/projects/gmi-bahtera.webp",
    gallery: [
      {
        src: "/images/projects/gmi-bahtera.webp",
        alt: "A community information website composition featuring schedules and announcements",
        caption: "The information structure of the community website, presented with sample content.",
      },
    ],
    links: [],
    featured: false,
  },
  {
    slug: "tactical-drone",
    title: "Tactical Drone & Surveillance Study",
    shortTitle: "Tactical drone",
    category: "Research & exploration",
    tags: ["Team engineering", "Hardware", "Exploration"],
    year: "Earlier work",
    status: "Team project",
    role: "Drone Officer · four-person engineering team",
    summary:
      "A hands-on team project exploring flight stability, communication, and a working UAV system.",
    headline: "Some problems leave the screen.",
    problem:
      "A UAV has to work as a physical system. Flight stability and communication behaviour expose problems that cannot be solved by looking at a software interface alone.",
    contribution: [
      "Worked as Drone Officer within a four-person engineering team assembling a tactical surveillance UAV.",
      "Contributed to resolving flight-instability and network-latency issues described in the project record.",
      "Collaborated across physical assembly, testing, and system troubleshooting.",
    ],
    workflow: [
      "Assemble and check the system as a team.",
      "Observe flight and communication behaviour during controlled testing.",
      "Trace problems across the hardware and network, then retest the changes.",
    ],
    decisions: [
      "Treat the vehicle, controls, and communications as one connected system.",
      "Keep my individual contribution distinct from the work of the wider team.",
      "Present the project as engineering experience without claiming operational deployment.",
    ],
    result:
      "A collaborative engineering project that expanded my experience beyond application development, through physical testing, communication issues, and the practical work of troubleshooting a system with a team.",
    stack: ["UAV systems", "Network troubleshooting", "System testing", "Team engineering"],
    color: "#D5DFE4",
    ink: "#30414A",
    cover: "/images/projects/tactical-drone.webp",
    gallery: [
      {
        src: "/images/projects/tactical-drone.webp",
        alt: "Original poster for the tactical surveillance drone team project",
        caption: "The original team-project poster. My contribution was as Drone Officer within a four-person engineering team.",
      },
    ],
    links: [],
    featured: false,
  },
];

export const featuredProjects = projects.filter((project) => project.featured);

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
