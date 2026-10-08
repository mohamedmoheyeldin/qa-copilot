import type { CodeTarget, Framework, Language } from "./types";

/**
 * Every framework, the languages it really supports, and the runner used for each.
 * The UI, the AI prompt, and the offline code generator all read from this one table,
 * so they can't disagree about what a combination means.
 */

interface LanguageSupport {
    /** Test runner for plain specs. */
    runner: string;
    /** Cucumber implementation used when BDD is on. */
    bddRunner: string;
}

interface FrameworkInfo {
    label: string;
    languages: Partial<Record<Language, LanguageSupport>>;
}

export const languageLabels: Record<Language, string> = {
    typescript: "TypeScript",
    javascript: "JavaScript",
    python: "Python",
    java: "Java",
    csharp: "C#",
};

export const frameworks: Record<Framework, FrameworkInfo> = {
    playwright: {
        label: "Playwright",
        languages: {
            typescript: { runner: "Playwright Test", bddRunner: "Cucumber.js" },
            javascript: { runner: "Playwright Test", bddRunner: "Cucumber.js" },
            python: { runner: "pytest-playwright", bddRunner: "pytest-bdd" },
            java: { runner: "JUnit 5", bddRunner: "Cucumber JVM" },
            csharp: { runner: "NUnit", bddRunner: "Reqnroll" },
        },
    },
    cypress: {
        label: "Cypress",
        languages: {
            typescript: { runner: "Cypress", bddRunner: "cypress-cucumber-preprocessor" },
            javascript: { runner: "Cypress", bddRunner: "cypress-cucumber-preprocessor" },
        },
    },
    selenium: {
        label: "Selenium",
        languages: {
            java: { runner: "JUnit 5", bddRunner: "Cucumber JVM" },
            python: { runner: "pytest", bddRunner: "behave" },
            csharp: { runner: "NUnit", bddRunner: "Reqnroll" },
            typescript: { runner: "Mocha", bddRunner: "Cucumber.js" },
            javascript: { runner: "Mocha", bddRunner: "Cucumber.js" },
        },
    },
    webdriverio: {
        label: "WebdriverIO",
        languages: {
            typescript: { runner: "WebdriverIO (Mocha)", bddRunner: "WebdriverIO Cucumber" },
            javascript: { runner: "WebdriverIO (Mocha)", bddRunner: "WebdriverIO Cucumber" },
        },
    },
};

export const frameworkIds = Object.keys(frameworks) as Framework[];

export const languagesFor = (framework: Framework) => Object.keys(frameworks[framework].languages) as Language[];

/** Keeps a target valid: if the language isn't supported by the framework, fall back to its first language. */
export const normalizeTarget = (t: CodeTarget): CodeTarget =>
    frameworks[t.framework]?.languages[t.language]
        ? t
        : {
              ...t,
              framework: frameworks[t.framework] ? t.framework : "playwright",
              language: languagesFor(frameworks[t.framework] ? t.framework : "playwright")[0],
          };

export const runnerFor = (t: CodeTarget) => {
    const support = frameworks[t.framework].languages[t.language];
    return t.bdd ? support?.bddRunner : support?.runner;
};

/** "Playwright, TypeScript", "Selenium, Java, Cucumber JVM" */
export const describeTarget = (t: CodeTarget) =>
    [frameworks[t.framework].label, languageLabels[t.language], t.bdd ? runnerFor(t) : undefined].filter(Boolean).join(", ");

export const sameTarget = (a: CodeTarget, b: CodeTarget) => a.framework === b.framework && a.language === b.language && a.bdd === b.bdd;
