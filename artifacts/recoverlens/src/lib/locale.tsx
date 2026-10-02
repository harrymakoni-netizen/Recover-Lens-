import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'sn' | 'nd';

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  en: {
    'app.title': 'RecoverLens',
    'nav.home': 'Home',
    'nav.mirror': 'Start Session',
    'nav.caregiver': 'Caregiver Assist',
    'nav.sports': 'Sports Screening',
    'nav.clinician': 'Clinician Portal',
    'nav.coach': 'Coach Portal',
    'home.welcome': 'Welcome back',
    'home.prescribed': 'Prescribed Program',
    'home.start_session': 'Start Live Session',
    'mirror.ai_rehab': 'AI REHAB MIRROR',
    'mirror.exercise': 'Exercise',
    'mirror.status': 'STATUS:',
    'mirror.movement_score': 'Movement Score:',
    'mirror.rep_count': 'Rep Count:',
    'mirror.live_data': 'LIVE MOVEMENT DATA',
    'mirror.left_shoulder': 'Left Shoulder:',
    'mirror.right_shoulder': 'Right Shoulder:',
    'mirror.torso_alignment': 'Torso Alignment:',
    'mirror.symmetry': 'Symmetry:',
    'mirror.session_complete': 'SESSION COMPLETE',
    'mirror.total_reps': 'Total Reps',
    'mirror.correct_reps': 'Correct Reps',
    'mirror.avg_angle': 'Average Shoulder Angle',
    'mirror.recommendation': 'Recommendation',
    'mirror.end_session': 'End Session',
    'status.ready': 'READY',
    'status.raising': 'RAISING...',
    'status.keep_torso': 'KEEP TORSO CENTERED',
    'status.correct_form': 'CORRECT FORM',
    'status.hold': 'HOLD',
    'status.lowering': 'LOWERING...',
    'status.good_rep': 'GOOD REP',
  },
  sn: {
    'app.title': 'RecoverLens',
    'nav.home': 'Kumba',
    'nav.mirror': 'Kutanga Session',
    'nav.caregiver': 'Kubatsira Kwevatarisiri',
    'nav.sports': 'Kutarisa Kwemitambo',
    'nav.clinician': 'Nzvimbo Yachiremba',
    'nav.coach': 'Nzvimbo Yemurairidzi',
    'home.welcome': 'Mauya zvekare',
    'home.prescribed': 'Chirongwa Chakatemwa',
    'home.start_session': 'Tanga Live Session',
    'mirror.ai_rehab': 'AI REHAB MIRROR',
    'mirror.exercise': 'Chidzidzo',
    'mirror.status': 'MAMIRIRO:',
    'mirror.movement_score': 'Mabatiro Ekufamba:',
    'mirror.rep_count': 'Kuverenga:',
    'mirror.live_data': 'ZVEKUFA MBA ZVIRI KUITIKA',
    'mirror.left_shoulder': 'Bapiro Rekuruboshwe:',
    'mirror.right_shoulder': 'Bapiro Rekurudyi:',
    'mirror.torso_alignment': 'Kumira Kwemuviri:',
    'mirror.symmetry': 'Kufanana:',
    'mirror.session_complete': 'SESSION YAPERA',
    'mirror.total_reps': 'Zvose Zvaitwa',
    'mirror.correct_reps': 'Zvaitwa Zvakanaka',
    'mirror.avg_angle': 'Avhareji Yakaitwa Bapiro',
    'mirror.recommendation': 'Kurudziro',
    'mirror.end_session': 'Pedza Session',
    'status.ready': 'ZVAKAGADZIRIRWA',
    'status.raising': 'KUSIMUDZA...',
    'status.keep_torso': 'Ramba Wakamisa Muviri',
    'status.correct_form': 'MAITIRO AKANAKA',
    'status.hold': 'BATA',
    'status.lowering': 'KUDZIKISA...',
    'status.good_rep': 'ZVAKANAKA',
  },
  nd: {
    'app.title': 'RecoverLens',
    'nav.home': 'Ekhaya',
    'nav.mirror': 'Qala Iseshini',
    'nav.caregiver': 'Usizo Lwabanakekeli',
    'nav.sports': 'Ukuhlola Kwezemidlalo',
    'nav.clinician': 'Indawo Kadokotela',
    'nav.coach': 'Indawo Yomqeqeshi',
    'home.welcome': 'Wamukelekile futhi',
    'home.prescribed': 'Uhlelo Olunikeziwe',
    'home.start_session': 'Qala Live Iseshini',
    'mirror.ai_rehab': 'AI REHAB MIRROR',
    'mirror.exercise': 'Ukuvivinya',
    'mirror.status': 'ISIMO:',
    'mirror.movement_score': 'Amaphuzu Okuhamba:',
    'mirror.rep_count': 'Inani Lokuphinda:',
    'mirror.live_data': 'IDATHA YOKUHAMBA EBUKHOMA',
    'mirror.left_shoulder': 'Ihlombe Lesobunxele:',
    'mirror.right_shoulder': 'Ihlombe Lesokudla:',
    'mirror.torso_alignment': 'Ukuqondiswa Komzimba:',
    'mirror.symmetry': 'Ukulingana:',
    'mirror.session_complete': 'ISESHINI IQEDIWE',
    'mirror.total_reps': 'Inani Lokuphinda Lonke',
    'mirror.correct_reps': 'Okuphindwe Kahle',
    'mirror.avg_angle': 'I-engile Yehlombe Emaphakathi',
    'mirror.recommendation': 'Isincomo',
    'mirror.end_session': 'Qeda Iseshini',
    'status.ready': 'KULUNGILE',
    'status.raising': 'UKUPHAKAMISA...',
    'status.keep_torso': 'GCINA UMZIMBA UQONDILE',
    'status.correct_form': 'IFOMU ELIFANELE',
    'status.hold': 'BAMBA',
    'status.lowering': 'UKWEHLISA...',
    'status.good_rep': 'OKUHLE',
  }
};

type LocaleContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LocaleContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
