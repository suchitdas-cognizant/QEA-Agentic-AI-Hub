// Sample agents used by the seeder (fresh installs) and the backfill script.
// Each includes the richer detail-page content: description (About) and
// keyBenefits (titled points).

export const SAMPLE_AGENTS = [
  {
    name: 'Job Profile Creation',
    tagline: 'Employee Job Profile creation with GenAI',
    description:
      'The solution leverages GenAI to generate job profiles in a single click by leveraging knowledge of company requirements and industry trends. This saves valuable human effort & speeds up the employee hiring & onboarding cycle.',
    techStacks: ['GenAI', 'Azure OpenAI', 'Python', 'React'],
    category: 'DV',
    stage: 'Prototype',
    industry: 'HR',
    icon: '🧑‍💼',
    smeEmail: 'job-profile-sme@cognizant.com',
    status: 'Active',
    keyBenefits: [
      { title: 'Faster hiring cycles', description: 'Generates complete job profiles in a single click, turning days of manual drafting into minutes.' },
      { title: 'Consistent & on-brand', description: 'Profiles automatically follow company standards and current industry trends.' },
      { title: 'Less manual effort', description: 'Frees HR teams from repetitive writing so they can focus on candidates.' },
      { title: 'You stay in control', description: 'Every generated profile can be reviewed and edited before it is published.' },
    ],
  },
  {
    name: 'GenAI driven retail store support',
    tagline: 'Resolve technical issues with seamless troubleshooting',
    description:
      'An intelligent support agent for retail store associates that diagnoses and resolves technical issues through a natural-language troubleshooting flow, reducing downtime and support escalations.',
    techStacks: ['GenAI', 'LangChain', 'Node.js', 'React'],
    category: 'DV',
    stage: 'Prototype',
    industry: 'Retail',
    icon: '🛒',
    smeEmail: 'retail-support-sme@cognizant.com',
    status: 'Active',
    keyBenefits: [
      { title: 'Faster issue resolution', description: 'Guides associates through troubleshooting steps in plain language, reducing downtime.' },
      { title: 'Fewer escalations', description: 'Resolves common technical problems on the floor without raising a ticket.' },
      { title: 'Always available', description: '24/7 support so associates are never blocked waiting for help.' },
      { title: 'Grounded answers', description: 'Pulls from store documentation so guidance matches your actual systems.' },
    ],
  },
  {
    name: 'WorkBench document upload and processing',
    tagline: 'Streamline claims with AI-driven document automation',
    description:
      'Automates claims processing by extracting, classifying and validating uploaded documents using AI, dramatically cutting manual review time and improving accuracy.',
    techStacks: ['GenAI', 'Document AI', 'Python', 'MongoDB'],
    category: 'DV',
    stage: 'POV',
    industry: 'Insurance',
    icon: '🧠',
    smeEmail: 'workbench-sme@cognizant.com',
    status: 'Upcoming',
    keyBenefits: [
      { title: 'Faster claims processing', description: 'Extracts and classifies uploaded documents automatically, cutting manual review time.' },
      { title: 'Higher accuracy', description: 'AI validation reduces data-entry errors and missed fields.' },
      { title: 'Less manual triage', description: 'Routes documents to the right workflow without human sorting.' },
      { title: 'Audit-ready', description: 'Keeps a clear record of what was extracted and validated.' },
    ],
  },
  {
    name: 'L&A Policy administrator Bene Change',
    tagline: 'Streamline beneficiary updates with automated workflows',
    description:
      'A Life & Annuity policy administration agent that automates beneficiary change requests end-to-end with built-in validation and compliance checks.',
    techStacks: ['GenAI', 'Workflow Automation', '.NET', 'React'],
    category: 'DV',
    stage: 'MVP',
    industry: 'Insurance',
    icon: '📝',
    smeEmail: 'la-policy-sme@cognizant.com',
    status: 'Active',
    keyBenefits: [
      { title: 'End-to-end automation', description: 'Handles beneficiary change requests from intake to update with no manual steps.' },
      { title: 'Built-in compliance', description: 'Validates each change against policy and regulatory rules.' },
      { title: 'Fewer errors', description: 'A structured workflow eliminates missed fields and rework.' },
      { title: 'Faster turnaround', description: 'Customers get beneficiary updates processed in a fraction of the time.' },
    ],
  },
  {
    name: 'Contract Intelligence Assistant',
    tagline: 'Extract clauses and risks from contracts instantly',
    description:
      'Reads lengthy contracts and surfaces key clauses, obligations and risk flags, letting legal teams review agreements in minutes instead of hours.',
    techStacks: ['GenAI', 'RAG', 'Vector DB', 'Python'],
    category: 'SD',
    stage: 'POV',
    industry: 'Legal',
    icon: '📄',
    smeEmail: 'contract-ai-sme@cognizant.com',
    status: 'Upcoming',
    keyBenefits: [
      { title: 'Review contracts in minutes', description: 'Surfaces key clauses, obligations and risks instantly instead of hours of reading.' },
      { title: 'Catch risks early', description: 'Flags unusual or risky terms before an agreement is signed.' },
      { title: 'Grounded in your documents', description: 'Uses retrieval over your contract library for context-aware analysis.' },
      { title: 'You decide', description: 'Highlights findings for the legal team to confirm — nothing is auto-approved.' },
    ],
  },
  {
    name: 'Customer Onboarding Copilot',
    tagline: 'Guide new customers through KYC end-to-end',
    description:
      'A conversational copilot that walks customers through onboarding and KYC, validating documents and answering questions in real time to reduce drop-off.',
    techStacks: ['GenAI', 'Azure', 'React', 'Node.js'],
    category: 'CS',
    stage: 'MVP',
    industry: 'Banking',
    icon: '🤝',
    smeEmail: 'onboarding-sme@cognizant.com',
    status: 'Active',
    keyBenefits: [
      { title: 'Reduce drop-off', description: 'Guides customers through KYC step by step so fewer abandon onboarding.' },
      { title: 'Real-time validation', description: 'Checks documents as they are submitted and explains issues clearly.' },
      { title: 'Always-on guidance', description: 'Answers customer questions instantly at any hour.' },
      { title: 'Consistent compliance', description: 'Applies the same KYC checks to every customer.' },
    ],
  },
];
