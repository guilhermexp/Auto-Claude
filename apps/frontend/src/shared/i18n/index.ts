import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translation resources
import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enSettings from './locales/en/settings.json';
import enTasks from './locales/en/tasks.json';
import enWelcome from './locales/en/welcome.json';
import enOnboarding from './locales/en/onboarding.json';
import enDialogs from './locales/en/dialogs.json';
import enGitlab from './locales/en/gitlab.json';
import enTaskReview from './locales/en/taskReview.json';
import enTerminal from './locales/en/terminal.json';
import enErrors from './locales/en/errors.json';
import enRoadmap from './locales/en/roadmap.json';
import enIdeation from './locales/en/ideation.json';
import enChangelog from './locales/en/changelog.json';
import enInsights from './locales/en/insights.json';
import enTeam from './locales/en/team.json';

// Import French translation resources
import frCommon from './locales/fr/common.json';
import frNavigation from './locales/fr/navigation.json';
import frSettings from './locales/fr/settings.json';
import frTasks from './locales/fr/tasks.json';
import frWelcome from './locales/fr/welcome.json';
import frOnboarding from './locales/fr/onboarding.json';
import frDialogs from './locales/fr/dialogs.json';
import frGitlab from './locales/fr/gitlab.json';
import frTaskReview from './locales/fr/taskReview.json';
import frTerminal from './locales/fr/terminal.json';
import frErrors from './locales/fr/errors.json';
import frRoadmap from './locales/fr/roadmap.json';
import frIdeation from './locales/fr/ideation.json';
import frChangelog from './locales/fr/changelog.json';
import frInsights from './locales/fr/insights.json';
import frTeam from './locales/fr/team.json';

// Import Portuguese translation resources
import ptCommon from './locales/pt/common.json';
import ptNavigation from './locales/pt/navigation.json';
import ptSettings from './locales/pt/settings.json';
import ptTasks from './locales/pt/tasks.json';
import ptWelcome from './locales/pt/welcome.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptDialogs from './locales/pt/dialogs.json';
import ptGitlab from './locales/pt/gitlab.json';
import ptTaskReview from './locales/pt/taskReview.json';
import ptTerminal from './locales/pt/terminal.json';
import ptErrors from './locales/pt/errors.json';
import ptRoadmap from './locales/pt/roadmap.json';
import ptIdeation from './locales/pt/ideation.json';
import ptChangelog from './locales/pt/changelog.json';
import ptInsights from './locales/pt/insights.json';
import ptTeam from './locales/pt/team.json';

export const defaultNS = 'common';

export const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    settings: enSettings,
    tasks: enTasks,
    welcome: enWelcome,
    onboarding: enOnboarding,
    dialogs: enDialogs,
    gitlab: enGitlab,
    taskReview: enTaskReview,
    terminal: enTerminal,
    errors: enErrors,
    roadmap: enRoadmap,
    ideation: enIdeation,
    changelog: enChangelog,
    insights: enInsights,
    team: enTeam
  },
  fr: {
    common: frCommon,
    navigation: frNavigation,
    settings: frSettings,
    tasks: frTasks,
    welcome: frWelcome,
    onboarding: frOnboarding,
    dialogs: frDialogs,
    gitlab: frGitlab,
    taskReview: frTaskReview,
    terminal: frTerminal,
    errors: frErrors,
    roadmap: frRoadmap,
    ideation: frIdeation,
    changelog: frChangelog,
    insights: frInsights,
    team: frTeam
  },
  pt: {
    common: ptCommon,
    navigation: ptNavigation,
    settings: ptSettings,
    tasks: ptTasks,
    welcome: ptWelcome,
    onboarding: ptOnboarding,
    dialogs: ptDialogs,
    gitlab: ptGitlab,
    taskReview: ptTaskReview,
    terminal: ptTerminal,
    errors: ptErrors,
    roadmap: ptRoadmap,
    ideation: ptIdeation,
    changelog: ptChangelog,
    insights: ptInsights,
    team: ptTeam
  }
} as const;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language (will be overridden by settings)
    fallbackLng: 'en',
    defaultNS,
    ns: ['common', 'navigation', 'settings', 'tasks', 'welcome', 'onboarding', 'dialogs', 'gitlab', 'taskReview', 'terminal', 'errors', 'roadmap', 'ideation', 'changelog', 'insights', 'team'],
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false // Disable suspense for Electron compatibility
    }
  });

export default i18n;
