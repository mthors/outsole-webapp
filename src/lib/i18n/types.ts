export type Locale = "id" | "en";

export const DEFAULT_LOCALE: Locale = "id";
export const SUPPORTED_LOCALES: readonly Locale[] = ["id", "en"] as const;
export const LOCALE_STORAGE_KEY = "ode_locale";
export const LOCALE_COOKIE_KEY = "ode_locale";

export interface I18nDictionary {
  nav: {
    home: string;
    catalog: string;
    about: string;
    contact: string;
    requestSample: string;
    openMenu: string;
    closeMenu: string;
  };
  common: {
    search: string;
    featured: string;
    viewCatalog: string;
    browseCatalog: string;
    requestSample: string;
    contactUs: string;
    viewDetails: string;
    language: string;
    switchLanguage: string;
    indonesian: string;
    english: string;
    loading: string;
    error: string;
    notFound: string;
    goHome: string;
    backToCatalog: string;
    optional: string;
    required: string;
    all: string;
    noImage: string;
  };
  home: {
    hero: {
      eyebrow: string;
      defaultTitle: string;
      defaultContent: string;
      exploreCta: string;
      sampleCta: string;
      imageAlt: string;
    };
    featured: {
      eyebrow: string;
      title: string;
      viewAll: string;
      emptyTitle: string;
      emptyDesc: string;
    };
    tech: {
      eyebrow: string;
      title: string;
      compounds: string;
      traction: string;
      applications: string;
      empty: string;
    };
    capability: {
      eyebrow: string;
      title: string;
      items: {
        oemTitle: string;
        oemDesc: string;
        odmTitle: string;
        odmDesc: string;
        mfgTitle: string;
        mfgDesc: string;
        devTitle: string;
        devDesc: string;
      };
    };
    cta: {
      eyebrow: string;
      title: string;
      catalogBtn: string;
      sampleBtn: string;
      contactBtn: string;
    };
  };
  catalog: {
    eyebrow: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    searchAria: string;
    filtersBtn: string;
    filterCategory: string;
    filterMaterial: string;
    filterTraction: string;
    filterHardness: string;
    filterSampling: string;
    filterFeatured: string;
    clearFilters: string;
    countSingle: string;
    countPlural: string;
    noResults: string;
    loading: string;
    unavailableTitle: string;
    unavailableDesc: string;
    samplingAvailable: string;
    samplingOnRequest: string;
    cardCompound: string;
    cardHardness: string;
    cardSampling: string;
  };
  product: {
    breadcrumbCatalog: string;
    specifications: string;
    category: string;
    material: string;
    traction: string;
    shoreHardness: string;
    dinAbrasion: string;
    weight: string;
    sampling: string;
    samplingAvailable: string;
    samplingUnavailable: string;
    requestSampleCta: string;
    backToCatalog: string;
    noImages: string;
    showImageAria: string;
    notFoundTitle: string;
    notFoundBody: string;
    errorTitle: string;
    errorBody: string;
  };
  sample: {
    eyebrow: string;
    title: string;
    description: string;
    selectedOutsole: string;
    form: {
      nameLabel: string;
      namePlaceholder: string;
      companyLabel: string;
      companyPlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      messageLabel: string;
      messageHint: string;
      messagePlaceholder: string;
      submitBtn: string;
      submittingBtn: string;
    };
    validation: {
      nameRequired: string;
      companyRequired: string;
      emailInvalid: string;
      messageRequired: string;
    };
    success: {
      statusTag: string;
      title: string;
      message: string;
      backCatalog: string;
      returnHome: string;
    };
    error: {
      statusTag: string;
      defaultMessage: string;
    };
    sidebar: {
      nextHeading: string;
      step1: string;
      step2: string;
      step3: string;
      programHeading: string;
      programDesc: string;
    };
  };
  about: {
    eyebrow: string;
    defaultTitle: string;
    defaultDescription: string;
    highlights: {
      tag1: string;
      title1: string;
      desc1: string;
      tag2: string;
      title2: string;
      desc2: string;
      tag3: string;
      title3: string;
      desc3: string;
      tag4: string;
      title4: string;
      desc4: string;
    };
    oem: {
      eyebrow: string;
      requestTrial: string;
      feature1Title: string;
      feature1Desc: string;
      feature2Title: string;
      feature2Desc: string;
      feature3Title: string;
      feature3Desc: string;
    };
    odm: {
      eyebrow: string;
      browseTooling: string;
      step1Title: string;
      step1Desc: string;
      step2Title: string;
      step2Desc: string;
      step3Title: string;
      step3Desc: string;
      step4Title: string;
      step4Desc: string;
    };
    cta: {
      eyebrow: string;
      title: string;
      desc: string;
      browseBtn: string;
      sampleBtn: string;
      contactBtn: string;
    };
    loading: string;
    errorTitle: string;
    notFound: string;
  };
  contact: {
    eyebrow: string;
    defaultTitle: string;
    defaultDescription: string;
    cardHours: {
      monFri: string;
      sat: string;
      sun: string;
      timezonePrefix: string;
    };
    ctaCard: {
      eyebrow: string;
      title: string;
      description: string;
      requestBtn: string;
      catalogBtn: string;
    };
    loading: string;
    errorTitle: string;
    notFound: string;
  };
  footer: {
    companyName: string;
    companyAddress: string;
    explore: string;
    sampling: string;
    copyright: string;
    credits: string;
  };
  errors: {
    pageNotFoundTitle: string;
    pageNotFoundDesc: string;
    pageLoadErrorTitle: string;
    pageLoadErrorDesc: string;
    tryAgain: string;
    goHome: string;
  };
}
