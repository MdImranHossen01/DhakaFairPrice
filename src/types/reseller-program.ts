export interface IResellerFeature {
  text: string;
  highlight?: boolean;
  excluded?: boolean;
}

export interface IResellerPackage {
  id: string;
  name: string;
  icon?: string;
  iconColor?: string;
  tagline: string;
  regularSetup: number;
  offerSetup: number;
  savingsPct: string;
  monthlyFee: number;
  yearlySavings: string;
  yearlyTotal: number;
  popular?: boolean;
  btnColor?: string;
  features: IResellerFeature[];
}

export interface IWhyChooseUsItem {
  icon: string;
  iconColor?: string;
  title: string;
  desc: string;
}

export interface IWorkflowStep {
  step: number;
  icon?: string;
  title: string;
  desc: string;
  time: string;
}

export interface IComparisonTableRow {
  feature: string;
  starter: string | boolean;
  business: string | boolean;
  professional: string | boolean;
}

export interface IComparisonTableCategory {
  name: string;
  rows: IComparisonTableRow[];
}

export interface IFaqItem {
  q: string;
  a: string;
}

export interface IResellerProgramData {
  hero: {
    badgeText: string;
    titlePart1: string;
    titleHighlight: string;
    titlePart2: string;
    subheading: string;
    benefits?: string[];
    registerBtnText: string;
    registerBtnLink: string;
    viewPackagesBtnText: string;
    viewPackagesBtnLink?: string;
    heroImage: string;
  };
  pricingHeader: {
    offerBadge: string;
    titlePart1: string;
    titleHighlight: string;
    titlePart2: string;
    subtitle: string;
    featureBadges: string[];
    valueCards: {
      emoji: string;
      title: string;
      desc: string;
    }[];
  };
  packages: IResellerPackage[];
  whyChooseUs: {
    title: string;
    subtitle: string;
    items: IWhyChooseUsItem[];
  };
  workflow: {
    steps: IWorkflowStep[];
  };
  comparisonTable: {
    title: string;
    subtitle: string;
    categories: IComparisonTableCategory[];
  };
  faqs: {
    title: string;
    subtitle: string;
    items: IFaqItem[];
  };
  importantInfo: {
    title: string;
    items: string[];
  };
}
