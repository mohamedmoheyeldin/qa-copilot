import type { GeneratedFile } from "../types";
import { type Action, slug } from "./actions";

/** Selector preferences from Settings. */
export interface SelectorPrefs {
    strategy: "role" | "test-id";
    testIdAttribute: string;
}

export interface SpecTest {
    id: string;
    title: string;
    tags: string[];
    preconditions?: string;
    steps: { text: string; action: Action }[];
    expected: { text: string; action: Action };
}

export interface Spec {
    name: string;
    slug: string;
    pascal: string;
    tests: SpecTest[];
}

export interface StepDef {
    keyword: "Given" | "When" | "Then";
    text: string;
    action: Action;
}

export interface Feature {
    name: string;
    slug: string;
    pascal: string;
    gherkin: string;
    steps: StepDef[];
}

export interface Dialect {
    spec: (spec: Spec, sel: SelectorPrefs) => GeneratedFile[];
    bdd: (feature: Feature, sel: SelectorPrefs) => GeneratedFile[];
    setup: { install: string; run: string; bddInstall: string; bddRun: string };
}

// ---------- string helpers ----------

const str = (s: string) => JSON.stringify(s);
const indent = (lines: string[], n: number) => lines.map((l) => (l ? " ".repeat(n) + l : l));
const join = (...parts: (string | string[] | false | undefined)[]) =>
    parts
        .flat()
        .filter((p): p is string => p !== false && p !== undefined)
        .join("\n") + "\n";
export const pascal = (s: string) =>
    s
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("") || "Generated";
const camel = (s: string) => {
    const p = pascal(s).slice(0, 60);
    return p.charAt(0).toLowerCase() + p.slice(1);
};
const snake = (s: string) => slug(s).replace(/-/g, "_").slice(0, 60);
const tagNames = (tags: string[]) => tags.map((t) => t.replace(/^@/, "")).filter(Boolean);

/** Python needs a statement in every function body; comment-only bodies get `pass`. */
const pyBody = (lines: string[]) => (lines.every((l) => !l.trim() || l.trim().startsWith("#")) ? [...lines, "pass"] : lines);

/** Cucumber expressions treat ( ) { } / specially. */
const cucumberExpr = (text: string) => text.replace(/([(){}/\\])/g, "\\$1");
/** behave and pytest-bdd parse patterns use { } for parameters. */
const parsePattern = (text: string) => text.replace(/{/g, "{{").replace(/}/g, "}}");

const xpathLit = (t: string) => (!t.includes("'") ? `'${t}'` : !t.includes('"') ? `"${t}"` : `concat('${t.split("'").join(`', "'", '`)}')`);
const textXpath = (t: string) => `//*[contains(normalize-space(), ${xpathLit(t)})]`;
const clickXpath = (name: string) => `//*[self::button or self::a or @role='button' or @role='link'][normalize-space()=${xpathLit(name)}]`;
const labelXpath = (field: string) => `//*[@id=//label[normalize-space()=${xpathLit(field)}]/@for]`;
const tid = (sel: SelectorPrefs, name: string) => `[${sel.testIdAttribute}="${slug(name)}"]`;
const urlRegex = (path: string) => `${path.replace(/\//g, "\\/")}$`;

/** Comment + action lines for one step, in a given comment style. */
const block = (comment: string, text: string, lines: string[]) => [`${comment} ${text}`, ...lines];

/** Shared body layout used by every spec renderer. */
const specBody = (t: SpecTest, c: string, render: (a: Action) => string[]) => [
    ...(t.preconditions ? [`${c} Given: ${t.preconditions}`, `${c} TODO: set up this precondition (seed data, API call, or fixture).`] : []),
    ...t.steps.flatMap((s, i) => block(c, `${i + 1}. ${s.text}`, render(s.action))),
    ...block(c, `Expected: ${t.expected.text}`, render(t.expected.action)),
];

const todo = (c: string, a: Action) => (a.kind === "todo" ? [`${c} TODO: ${a.text}`] : null);

// ---------- Playwright (TypeScript / JavaScript) ----------

const pwJs =
    (r: string, sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const loc = (name: string, role?: string) =>
            sel.strategy === "test-id"
                ? `${r}.getByTestId(${str(slug(name))})`
                : role
                  ? `${r}.getByRole(${str(role)}, { name: ${str(name)} })`
                  : `${r}.getByText(${str(name)}, { exact: true })`;
        switch (a.kind) {
            case "goto":
                return [`await ${r}.goto(${str(a.path)});`];
            case "click":
                return [`await ${loc(a.name, a.role)}.click();`];
            case "fill":
                return [
                    `await ${sel.strategy === "test-id" ? `${r}.getByTestId(${str(slug(a.field))})` : `${r}.getByLabel(${str(a.field)})`}.fill(${str(a.value)});`,
                ];
            case "expectText":
                return [`await expect(${r}.getByText(${str(a.text)})).toBeVisible();`];
            case "expectAlert":
                return [`await expect(${r}.getByRole("alert")).toBeVisible();`];
            case "expectUrl":
                return [`await expect(${r}).toHaveURL(/${urlRegex(a.path)}/);`];
            default:
                return todo("//", a)!;
        }
    };

const playwrightJs = (ts: boolean): Dialect => {
    const ext = ts ? "ts" : "js";
    return {
        spec: (spec, sel) => [
            {
                path: `tests/${spec.slug}.spec.${ext}`,
                content: join(
                    `import { test, expect } from "@playwright/test";`,
                    "",
                    `test.describe(${str(spec.name)}, () => {`,
                    spec.tests
                        .map((t) =>
                            join(
                                `    test(${str(`${t.id}: ${t.title}${t.tags.length ? " " + t.tags.join(" ") : ""}`)}, async ({ page }) => {`,
                                indent(specBody(t, "//", pwJs("page", sel)), 8),
                                "    });",
                            ),
                        )
                        .join("\n"),
                    "});",
                ).replace(/\n\n\n/g, "\n\n"),
            },
        ],
        bdd: (f, sel) => [
            { path: `features/${f.slug}.feature`, content: f.gherkin },
            {
                path: `features/step_definitions/${f.slug}.steps.${ext}`,
                content: join(
                    `import { Given, When, Then } from "@cucumber/cucumber";`,
                    `import { expect } from "@playwright/test";`,
                    ts && `import type { CustomWorld } from "../support/world";`,
                    "",
                    f.steps.map((s) =>
                        join(
                            `${s.keyword}(${str(cucumberExpr(s.text))}, async function (${ts ? "this: CustomWorld" : ""}) {`,
                            indent(pwJs("this.page", sel)(s.action), 4),
                            "});",
                        ),
                    ),
                ),
            },
            {
                path: `features/support/world.${ext}`,
                content: join(
                    `import { After, Before, World, setDefaultTimeout, setWorldConstructor } from "@cucumber/cucumber";`,
                    `import { chromium${ts ? ", type Browser, type Page" : ""} } from "@playwright/test";`,
                    "",
                    "setDefaultTimeout(30_000);",
                    "",
                    `export class CustomWorld extends World {`,
                    ts ? "    browser!: Browser;" : "",
                    ts ? "    page!: Page;" : "",
                    "}",
                    "setWorldConstructor(CustomWorld);",
                    "",
                    `Before(async function (${ts ? "this: CustomWorld" : ""}) {`,
                    "    this.browser = await chromium.launch();",
                    `    const context = await this.browser.newContext({ baseURL: process.env.BASE_URL ?? "http://localhost:3000" });`,
                    "    this.page = await context.newPage();",
                    "});",
                    "",
                    `After(async function (${ts ? "this: CustomWorld" : ""}) {`,
                    "    await this.browser?.close();",
                    "});",
                ).replace(/\n\n\n/g, "\n\n"),
            },
            {
                path: "cucumber.js",
                content: join(
                    "module.exports = {",
                    "    default: {",
                    `        paths: ["features/**/*.feature"],`,
                    ts ? `        requireModule: ["ts-node/register"],` : "",
                    `        require: ["features/**/*.${ext}"],`,
                    `        format: ["progress", "html:reports/cucumber.html"],`,
                    "    },",
                    "};",
                ).replace(/\n\n/g, "\n"),
            },
        ],
        setup: {
            install: "npm init playwright@latest",
            run: "npx playwright test",
            bddInstall: `npm i -D @cucumber/cucumber @playwright/test${ts ? " ts-node typescript" : ""} && npx playwright install chromium`,
            bddRun: "npx cucumber-js",
        },
    };
};

// ---------- Playwright (Python) ----------

const pwPy =
    (sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const loc = (name: string, role?: string) =>
            sel.strategy === "test-id"
                ? `page.get_by_test_id(${str(slug(name))})`
                : role
                  ? `page.get_by_role(${str(role)}, name=${str(name)})`
                  : `page.get_by_text(${str(name)}, exact=True)`;
        switch (a.kind) {
            case "goto":
                return [`page.goto(${str(a.path)})`];
            case "click":
                return [`${loc(a.name, a.role)}.click()`];
            case "fill":
                return [
                    `${sel.strategy === "test-id" ? `page.get_by_test_id(${str(slug(a.field))})` : `page.get_by_label(${str(a.field)})`}.fill(${str(a.value)})`,
                ];
            case "expectText":
                return [`expect(page.get_by_text(${str(a.text)})).to_be_visible()`];
            case "expectAlert":
                return [`expect(page.get_by_role("alert")).to_be_visible()`];
            case "expectUrl":
                return [`expect(page).to_have_url(re.compile(r"${a.path}$"))`];
            default:
                return todo("#", a)!;
        }
    };

const playwrightPython: Dialect = {
    spec: (spec, sel) => [
        {
            path: `tests/test_${snake(spec.slug)}.py`,
            content: join(
                "import re",
                "",
                "import pytest",
                "from playwright.sync_api import Page, expect",
                "",
                spec.tests.map((t) =>
                    join(
                        "",
                        ...tagNames(t.tags).map((tag) => `@pytest.mark.${snake(tag)}`),
                        `def test_${snake(`${t.id} ${t.title}`)}(page: Page) -> None:`,
                        `    """${t.id}: ${t.title.replace(/"""/g, "'''")}"""`,
                        indent(specBody(t, "#", pwPy(sel)), 4),
                    ),
                ),
            ),
        },
    ],
    bdd: (f, sel) => [
        { path: `tests/features/${f.slug}.feature`, content: f.gherkin },
        {
            path: `tests/step_defs/test_${snake(f.slug)}.py`,
            content: join(
                "import re",
                "",
                "from playwright.sync_api import Page, expect",
                "from pytest_bdd import given, scenarios, then, when",
                "",
                `scenarios("../features/${f.slug}.feature")`,
                f.steps.map((s, i) => {
                    const body = pwPy(sel)(s.action);
                    return join(
                        "",
                        "",
                        `@${s.keyword.toLowerCase()}(${str(parsePattern(s.text))})`,
                        `def step_${i + 1}(page: Page) -> None:`,
                        indent(pyBody(body), 4),
                    );
                }),
            ),
        },
    ],
    setup: {
        install: "pip install pytest-playwright && playwright install chromium",
        run: "pytest --base-url http://localhost:3000",
        bddInstall: "pip install pytest-playwright pytest-bdd && playwright install chromium",
        bddRun: "pytest --base-url http://localhost:3000",
    },
};

// ---------- Playwright (Java) ----------

const pwJava =
    (sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const loc = (name: string, role?: string) =>
            sel.strategy === "test-id"
                ? `page.getByTestId(${str(slug(name))})`
                : role
                  ? `page.getByRole(AriaRole.${role.toUpperCase()}, new Page.GetByRoleOptions().setName(${str(name)}))`
                  : `page.getByText(${str(name)}, new Page.GetByTextOptions().setExact(true))`;
        switch (a.kind) {
            case "goto":
                return [`page.navigate(BASE_URL + ${str(a.path)});`];
            case "click":
                return [`${loc(a.name, a.role)}.click();`];
            case "fill":
                return [
                    `${sel.strategy === "test-id" ? `page.getByTestId(${str(slug(a.field))})` : `page.getByLabel(${str(a.field)})`}.fill(${str(a.value)});`,
                ];
            case "expectText":
                return [`assertThat(page.getByText(${str(a.text)})).isVisible();`];
            case "expectAlert":
                return [`assertThat(page.getByRole(AriaRole.ALERT)).isVisible();`];
            case "expectUrl":
                return [`assertThat(page).hasURL(Pattern.compile(${str(`.*${a.path}$`)}));`];
            default:
                return todo("//", a)!;
        }
    };

const javaImportsPw = [
    "import com.microsoft.playwright.*;",
    "import com.microsoft.playwright.options.AriaRole;",
    "import java.util.regex.Pattern;",
    "import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;",
];

const playwrightJava: Dialect = {
    spec: (spec, sel) => [
        {
            path: `src/test/java/tests/${spec.pascal}Test.java`,
            content: join(
                "package tests;",
                "",
                ...javaImportsPw,
                "import org.junit.jupiter.api.*;",
                "",
                `class ${spec.pascal}Test {`,
                `    static final String BASE_URL = System.getenv().getOrDefault("BASE_URL", "http://localhost:3000");`,
                "    static Playwright playwright;",
                "    static Browser browser;",
                "    BrowserContext context;",
                "    Page page;",
                "",
                "    @BeforeAll",
                "    static void launchBrowser() {",
                "        playwright = Playwright.create();",
                "        browser = playwright.chromium().launch();",
                "    }",
                "",
                "    @AfterAll",
                "    static void closeBrowser() {",
                "        playwright.close();",
                "    }",
                "",
                "    @BeforeEach",
                "    void createPage() {",
                "        context = browser.newContext();",
                "        page = context.newPage();",
                "    }",
                "",
                "    @AfterEach",
                "    void closeContext() {",
                "        context.close();",
                "    }",
                spec.tests.map((t) =>
                    join(
                        "",
                        "    @Test",
                        `    @DisplayName(${str(`${t.id}: ${t.title}`)})`,
                        ...tagNames(t.tags).map((tag) => `    @Tag(${str(tag)})`),
                        `    void ${camel(`${t.id} ${t.title}`)}() {`,
                        indent(specBody(t, "//", pwJava(sel)), 8),
                        "    }",
                    ),
                ),
                "}",
            ),
        },
    ],
    bdd: (f, sel) => [
        { path: `src/test/resources/features/${f.slug}.feature`, content: f.gherkin },
        {
            path: `src/test/java/steps/${f.pascal}Steps.java`,
            content: join(
                "package steps;",
                "",
                ...javaImportsPw,
                "import io.cucumber.java.After;",
                "import io.cucumber.java.Before;",
                "import io.cucumber.java.en.*;",
                "",
                `public class ${f.pascal}Steps {`,
                `    static final String BASE_URL = System.getenv().getOrDefault("BASE_URL", "http://localhost:3000");`,
                "    Playwright playwright;",
                "    Page page;",
                "",
                "    @Before",
                "    public void start() {",
                "        playwright = Playwright.create();",
                "        page = playwright.chromium().launch().newPage();",
                "    }",
                "",
                "    @After",
                "    public void stop() {",
                "        playwright.close();",
                "    }",
                f.steps.map((s, i) =>
                    join("", `    @${s.keyword}(${str(cucumberExpr(s.text))})`, `    public void step${i + 1}() {`, indent(pwJava(sel)(s.action), 8), "    }"),
                ),
                "}",
            ),
        },
        runCucumberJava,
    ],
    setup: {
        install: "Add com.microsoft.playwright:playwright and org.junit.jupiter:junit-jupiter to your pom.xml or build.gradle",
        run: "mvn test",
        bddInstall: "Add playwright, io.cucumber:cucumber-java, io.cucumber:cucumber-junit-platform-engine, and org.junit.platform:junit-platform-suite",
        bddRun: "mvn test",
    },
};

const runCucumberJava: GeneratedFile = {
    path: "src/test/java/steps/RunCucumberTest.java",
    content: join(
        "package steps;",
        "",
        "import org.junit.platform.suite.api.*;",
        "",
        "import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;",
        "",
        "@Suite",
        `@IncludeEngines("cucumber")`,
        `@SelectClasspathResource("features")`,
        `@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "steps")`,
        "public class RunCucumberTest {}",
    ),
};

// ---------- Playwright (C#) ----------

const pwCs =
    (r: string, exp: string, sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const loc = (name: string, role?: string) =>
            sel.strategy === "test-id"
                ? `${r}.GetByTestId(${str(slug(name))})`
                : role
                  ? `${r}.GetByRole(AriaRole.${role === "link" ? "Link" : "Button"}, new() { Name = ${str(name)} })`
                  : `${r}.GetByText(${str(name)}, new() { Exact = true })`;
        switch (a.kind) {
            case "goto":
                return [`await ${r}.GotoAsync(BaseUrl + ${str(a.path)});`];
            case "click":
                return [`await ${loc(a.name, a.role)}.ClickAsync();`];
            case "fill":
                return [
                    `await ${sel.strategy === "test-id" ? `${r}.GetByTestId(${str(slug(a.field))})` : `${r}.GetByLabel(${str(a.field)})`}.FillAsync(${str(a.value)});`,
                ];
            case "expectText":
                return [`await ${exp}(${r}.GetByText(${str(a.text)})).ToBeVisibleAsync();`];
            case "expectAlert":
                return [`await ${exp}(${r}.GetByRole(AriaRole.Alert)).ToBeVisibleAsync();`];
            case "expectUrl":
                return [`await ${exp}(${r}).ToHaveURLAsync(new Regex(${str(`${a.path}$`)}));`];
            default:
                return todo("//", a)!;
        }
    };

const playwrightCsharp: Dialect = {
    spec: (spec, sel) => [
        {
            path: `Tests/${spec.pascal}Tests.cs`,
            content: join(
                "using System.Text.RegularExpressions;",
                "using Microsoft.Playwright;",
                "using Microsoft.Playwright.NUnit;",
                "using NUnit.Framework;",
                "",
                "namespace GeneratedTests;",
                "",
                "[Parallelizable(ParallelScope.Self)]",
                "[TestFixture]",
                `public class ${spec.pascal}Tests : PageTest`,
                "{",
                `    private static readonly string BaseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? "http://localhost:3000";`,
                spec.tests.map((t) =>
                    join(
                        "",
                        `    [Test, Description(${str(`${t.id}: ${t.title}`)})]`,
                        ...tagNames(t.tags).map((tag) => `    [Category(${str(tag)})]`),
                        `    public async Task ${pascal(`${t.id} ${t.title}`).slice(0, 60)}()`,
                        "    {",
                        indent(specBody(t, "//", pwCs("Page", "Expect", sel)), 8),
                        "    }",
                    ),
                ),
                "}",
            ),
        },
    ],
    bdd: (f, sel) => [
        { path: `Features/${f.pascal}.feature`, content: f.gherkin },
        {
            path: `StepDefinitions/${f.pascal}Steps.cs`,
            content: join(
                "using System.Text.RegularExpressions;",
                "using Microsoft.Playwright;",
                "using Reqnroll;",
                "using static Microsoft.Playwright.Assertions;",
                "",
                "namespace GeneratedTests.StepDefinitions;",
                "",
                "[Binding]",
                `public class ${f.pascal}Steps(IPage page)`,
                "{",
                `    private static readonly string BaseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? "http://localhost:3000";`,
                "    private readonly IPage _page = page;",
                f.steps.map((s, i) =>
                    join(
                        "",
                        `    [${s.keyword}(${str(cucumberExpr(s.text))})]`,
                        `    public async Task Step${i + 1}()`,
                        "    {",
                        indent(pwCs("_page", "Expect", sel)(s.action), 8),
                        "    }",
                    ),
                ),
                "}",
            ),
        },
        {
            path: "Hooks/PlaywrightHooks.cs",
            content: join(
                "using Microsoft.Playwright;",
                "using Reqnroll;",
                "using Reqnroll.BoDi;",
                "",
                "namespace GeneratedTests.Hooks;",
                "",
                "[Binding]",
                "public class PlaywrightHooks(IObjectContainer container)",
                "{",
                "    private IPlaywright? _playwright;",
                "    private IBrowser? _browser;",
                "",
                "    [BeforeScenario]",
                "    public async Task StartBrowser()",
                "    {",
                "        _playwright = await Playwright.CreateAsync();",
                "        _browser = await _playwright.Chromium.LaunchAsync();",
                "        container.RegisterInstanceAs(await _browser.NewPageAsync());",
                "    }",
                "",
                "    [AfterScenario]",
                "    public async Task StopBrowser()",
                "    {",
                "        if (_browser is not null) await _browser.CloseAsync();",
                "        _playwright?.Dispose();",
                "    }",
                "}",
            ),
        },
    ],
    setup: {
        install: "dotnet add package Microsoft.Playwright.NUnit && pwsh bin/Debug/net8.0/playwright.ps1 install chromium",
        run: "dotnet test",
        bddInstall: "dotnet add package Reqnroll.NUnit && dotnet add package Microsoft.Playwright",
        bddRun: "dotnet test",
    },
};

// ---------- Cypress ----------

const cy =
    (sel: SelectorPrefs) =>
    (a: Action): string[] => {
        switch (a.kind) {
            case "goto":
                return [`cy.visit(${str(a.path)});`];
            case "click":
                return [
                    sel.strategy === "test-id"
                        ? `cy.get(${str(tid(sel, a.name))}).click();`
                        : a.role
                          ? `cy.contains(${str(a.role === "link" ? "a" : "button")}, ${str(a.name)}).click();`
                          : `cy.contains(${str(a.name)}).click();`,
                ];
            case "fill":
                return sel.strategy === "test-id"
                    ? [`cy.get(${str(tid(sel, a.field))}).type(${str(a.value)});`]
                    : [
                          `cy.contains("label", ${str(a.field)})`,
                          `    .invoke("attr", "for")`,
                          "    .then((id) => cy.get(`#${id}`).type(" + str(a.value) + "));",
                      ];
            case "expectText":
                return [`cy.contains(${str(a.text)}).should("be.visible");`];
            case "expectAlert":
                return [`cy.get('[role="alert"]').should("be.visible");`];
            case "expectUrl":
                return [`cy.location("pathname").should("eq", ${str(a.path)});`];
            default:
                return todo("//", a)!;
        }
    };

const cypress = (ts: boolean): Dialect => {
    const ext = ts ? "ts" : "js";
    return {
        spec: (spec, sel) => [
            {
                path: `cypress/e2e/${spec.slug}.cy.${ext}`,
                content: join(
                    `describe(${str(spec.name)}, () => {`,
                    spec.tests
                        .map((t) =>
                            join(
                                `    it(${str(`${t.id}: ${t.title}${t.tags.length ? " " + t.tags.join(" ") : ""}`)}, () => {`,
                                indent(specBody(t, "//", cy(sel)), 8),
                                "    });",
                            ),
                        )
                        .join("\n"),
                    "});",
                ),
            },
        ],
        bdd: (f, sel) => [
            { path: `cypress/e2e/${f.slug}.feature`, content: f.gherkin },
            {
                path: `cypress/support/step_definitions/${f.slug}.${ext}`,
                content: join(
                    `import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";`,
                    "",
                    f.steps.map((s) => join(`${s.keyword}(${str(cucumberExpr(s.text))}, () => {`, indent(cy(sel)(s.action), 4), "});")),
                ),
            },
            {
                path: `cypress.config.${ext}`,
                content: join(
                    `import { defineConfig } from "cypress";`,
                    `import createBundler from "@bahmutov/cypress-esbuild-preprocessor";`,
                    `import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";`,
                    `import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";`,
                    "",
                    "export default defineConfig({",
                    "    e2e: {",
                    `        baseUrl: "http://localhost:3000",`,
                    `        specPattern: "cypress/e2e/**/*.feature",`,
                    "        async setupNodeEvents(on, config) {",
                    "            await addCucumberPreprocessorPlugin(on, config);",
                    `            on("file:preprocessor", createBundler({ plugins: [createEsbuildPlugin(config)] }));`,
                    "            return config;",
                    "        },",
                    "    },",
                    "});",
                ),
            },
        ],
        setup: {
            install: "npm i -D cypress",
            run: "npx cypress run",
            bddInstall: "npm i -D cypress @badeball/cypress-cucumber-preprocessor @bahmutov/cypress-esbuild-preprocessor esbuild",
            bddRun: "npx cypress run",
        },
    };
};

// ---------- Selenium (Java) ----------

const seJava =
    (sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const by = (xpath: string, name: string) => (sel.strategy === "test-id" ? `By.cssSelector(${str(tid(sel, name))})` : `By.xpath(${str(xpath)})`);
        switch (a.kind) {
            case "goto":
                return [`driver.get(BASE_URL + ${str(a.path)});`];
            case "click":
                return [`wait.until(ExpectedConditions.elementToBeClickable(${by(clickXpath(a.name), a.name)})).click();`];
            case "fill":
                return [`driver.findElement(${by(labelXpath(a.field), a.field)}).sendKeys(${str(a.value)});`];
            case "expectText":
                return [`wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath(${str(textXpath(a.text))})));`];
            case "expectAlert":
                return [`wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[role='alert']")));`];
            case "expectUrl":
                return [`wait.until(ExpectedConditions.urlMatches(${str(`${a.path}$`)}));`];
            default:
                return todo("//", a)!;
        }
    };

const seleniumJavaImports = [
    "import java.time.Duration;",
    "import org.openqa.selenium.By;",
    "import org.openqa.selenium.WebDriver;",
    "import org.openqa.selenium.chrome.ChromeDriver;",
    "import org.openqa.selenium.support.ui.ExpectedConditions;",
    "import org.openqa.selenium.support.ui.WebDriverWait;",
];

const seleniumJava: Dialect = {
    spec: (spec, sel) => [
        {
            path: `src/test/java/tests/${spec.pascal}Test.java`,
            content: join(
                "package tests;",
                "",
                ...seleniumJavaImports,
                "import org.junit.jupiter.api.*;",
                "",
                `class ${spec.pascal}Test {`,
                `    static final String BASE_URL = System.getenv().getOrDefault("BASE_URL", "http://localhost:3000");`,
                "    WebDriver driver;",
                "    WebDriverWait wait;",
                "",
                "    @BeforeEach",
                "    void setUp() {",
                "        driver = new ChromeDriver();",
                "        wait = new WebDriverWait(driver, Duration.ofSeconds(10));",
                "    }",
                "",
                "    @AfterEach",
                "    void tearDown() {",
                "        driver.quit();",
                "    }",
                spec.tests.map((t) =>
                    join(
                        "",
                        "    @Test",
                        `    @DisplayName(${str(`${t.id}: ${t.title}`)})`,
                        ...tagNames(t.tags).map((tag) => `    @Tag(${str(tag)})`),
                        `    void ${camel(`${t.id} ${t.title}`)}() {`,
                        indent(specBody(t, "//", seJava(sel)), 8),
                        "    }",
                    ),
                ),
                "}",
            ),
        },
    ],
    bdd: (f, sel) => [
        { path: `src/test/resources/features/${f.slug}.feature`, content: f.gherkin },
        {
            path: `src/test/java/steps/${f.pascal}Steps.java`,
            content: join(
                "package steps;",
                "",
                ...seleniumJavaImports,
                "import io.cucumber.java.After;",
                "import io.cucumber.java.Before;",
                "import io.cucumber.java.en.*;",
                "",
                `public class ${f.pascal}Steps {`,
                `    static final String BASE_URL = System.getenv().getOrDefault("BASE_URL", "http://localhost:3000");`,
                "    WebDriver driver;",
                "    WebDriverWait wait;",
                "",
                "    @Before",
                "    public void start() {",
                "        driver = new ChromeDriver();",
                "        wait = new WebDriverWait(driver, Duration.ofSeconds(10));",
                "    }",
                "",
                "    @After",
                "    public void stop() {",
                "        driver.quit();",
                "    }",
                f.steps.map((s, i) =>
                    join("", `    @${s.keyword}(${str(cucumberExpr(s.text))})`, `    public void step${i + 1}() {`, indent(seJava(sel)(s.action), 8), "    }"),
                ),
                "}",
            ),
        },
        runCucumberJava,
    ],
    setup: {
        install: "Add org.seleniumhq.selenium:selenium-java and org.junit.jupiter:junit-jupiter to your pom.xml or build.gradle",
        run: "mvn test",
        bddInstall: "Add selenium-java, io.cucumber:cucumber-java, io.cucumber:cucumber-junit-platform-engine, and org.junit.platform:junit-platform-suite",
        bddRun: "mvn test",
    },
};

// ---------- Selenium (Python) ----------

const sePy =
    (d: string, sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const by = (xpath: string, name: string) => (sel.strategy === "test-id" ? `(By.CSS_SELECTOR, ${str(tid(sel, name))})` : `(By.XPATH, ${str(xpath)})`);
        const wait = `WebDriverWait(${d}, 10)`;
        switch (a.kind) {
            case "goto":
                return [`${d}.get(BASE_URL + ${str(a.path)})`];
            case "click":
                return [`${wait}.until(EC.element_to_be_clickable(${by(clickXpath(a.name), a.name)})).click()`];
            case "fill":
                return [`${d}.find_element(*${by(labelXpath(a.field), a.field)}).send_keys(${str(a.value)})`];
            case "expectText":
                return [`${wait}.until(EC.visibility_of_element_located((By.XPATH, ${str(textXpath(a.text))})))`];
            case "expectAlert":
                return [`${wait}.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "[role='alert']")))`];
            case "expectUrl":
                return [`${wait}.until(EC.url_matches(r"${a.path}$"))`];
            default:
                return todo("#", a)!;
        }
    };

const pyImports = [
    "import os",
    "",
    "from selenium.webdriver.common.by import By",
    "from selenium.webdriver.support import expected_conditions as EC",
    "from selenium.webdriver.support.ui import WebDriverWait",
    "",
    `BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")`,
];

const seleniumPython: Dialect = {
    spec: (spec, sel) => [
        {
            path: "tests/conftest.py",
            content: join(
                "import pytest",
                "from selenium import webdriver",
                "",
                "",
                "@pytest.fixture",
                "def driver():",
                "    driver = webdriver.Chrome()",
                "    yield driver",
                "    driver.quit()",
            ),
        },
        {
            path: `tests/test_${snake(spec.slug)}.py`,
            content: join(
                "import pytest",
                ...pyImports,
                spec.tests.map((t) =>
                    join(
                        "",
                        ...tagNames(t.tags).map((tag) => `@pytest.mark.${snake(tag)}`),
                        `def test_${snake(`${t.id} ${t.title}`)}(driver):`,
                        `    """${t.id}: ${t.title.replace(/"""/g, "'''")}"""`,
                        indent(specBody(t, "#", sePy("driver", sel)), 4),
                    ),
                ),
            ),
        },
    ],
    bdd: (f, sel) => [
        { path: `features/${f.slug}.feature`, content: f.gherkin },
        {
            path: `features/steps/${snake(f.slug)}_steps.py`,
            content: join(
                "from behave import given, then, when",
                ...pyImports,
                f.steps.map((s) => {
                    const body = sePy("context.driver", sel)(s.action);
                    return join("", "", `@${s.keyword.toLowerCase()}(${str(parsePattern(s.text))})`, "def step_impl(context):", indent(pyBody(body), 4));
                }),
            ),
        },
        {
            path: "features/environment.py",
            content: join(
                "from selenium import webdriver",
                "",
                "",
                "def before_scenario(context, scenario):",
                "    context.driver = webdriver.Chrome()",
                "",
                "",
                "def after_scenario(context, scenario):",
                "    context.driver.quit()",
            ),
        },
    ],
    setup: { install: "pip install selenium pytest", run: "pytest", bddInstall: "pip install selenium behave", bddRun: "behave" },
};

// ---------- Selenium (C#) ----------

const seCs =
    (sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const by = (xpath: string, name: string) => (sel.strategy === "test-id" ? `By.CssSelector(${str(tid(sel, name))})` : `By.XPath(${str(xpath)})`);
        switch (a.kind) {
            case "goto":
                return [`_driver.Navigate().GoToUrl(BaseUrl + ${str(a.path)});`];
            case "click":
                return [`_wait.Until(d => d.FindElement(${by(clickXpath(a.name), a.name)})).Click();`];
            case "fill":
                return [`_driver.FindElement(${by(labelXpath(a.field), a.field)}).SendKeys(${str(a.value)});`];
            case "expectText":
                return [`_wait.Until(d => d.FindElement(By.XPath(${str(textXpath(a.text))})).Displayed);`];
            case "expectAlert":
                return [`_wait.Until(d => d.FindElement(By.CssSelector("[role='alert']")).Displayed);`];
            case "expectUrl":
                return [`_wait.Until(d => Regex.IsMatch(d.Url, ${str(`${a.path}$`)}));`];
            default:
                return todo("//", a)!;
        }
    };

const csSeleniumUsings = [
    "using System.Text.RegularExpressions;",
    "using OpenQA.Selenium;",
    "using OpenQA.Selenium.Chrome;",
    "using OpenQA.Selenium.Support.UI;",
];

const seleniumCsharp: Dialect = {
    spec: (spec, sel) => [
        {
            path: `Tests/${spec.pascal}Tests.cs`,
            content: join(
                ...csSeleniumUsings,
                "using NUnit.Framework;",
                "",
                "namespace GeneratedTests;",
                "",
                "[TestFixture]",
                `public class ${spec.pascal}Tests`,
                "{",
                `    private static readonly string BaseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? "http://localhost:3000";`,
                "    private IWebDriver _driver = null!;",
                "    private WebDriverWait _wait = null!;",
                "",
                "    [SetUp]",
                "    public void SetUp()",
                "    {",
                "        _driver = new ChromeDriver();",
                "        _wait = new WebDriverWait(_driver, TimeSpan.FromSeconds(10));",
                "    }",
                "",
                "    [TearDown]",
                "    public void TearDown()",
                "    {",
                "        _driver.Quit();",
                "        _driver.Dispose();",
                "    }",
                spec.tests.map((t) =>
                    join(
                        "",
                        `    [Test, Description(${str(`${t.id}: ${t.title}`)})]`,
                        ...tagNames(t.tags).map((tag) => `    [Category(${str(tag)})]`),
                        `    public void ${pascal(`${t.id} ${t.title}`).slice(0, 60)}()`,
                        "    {",
                        indent(specBody(t, "//", seCs(sel)), 8),
                        "    }",
                    ),
                ),
                "}",
            ),
        },
    ],
    bdd: (f, sel) => [
        { path: `Features/${f.pascal}.feature`, content: f.gherkin },
        {
            path: `StepDefinitions/${f.pascal}Steps.cs`,
            content: join(
                ...csSeleniumUsings,
                "using Reqnroll;",
                "",
                "namespace GeneratedTests.StepDefinitions;",
                "",
                "[Binding]",
                `public class ${f.pascal}Steps(IWebDriver driver)`,
                "{",
                `    private static readonly string BaseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? "http://localhost:3000";`,
                "    private readonly IWebDriver _driver = driver;",
                "    private readonly WebDriverWait _wait = new(driver, TimeSpan.FromSeconds(10));",
                f.steps.map((s, i) =>
                    join(
                        "",
                        `    [${s.keyword}(${str(cucumberExpr(s.text))})]`,
                        `    public void Step${i + 1}()`,
                        "    {",
                        indent(seCs(sel)(s.action), 8),
                        "    }",
                    ),
                ),
                "}",
            ),
        },
        {
            path: "Hooks/WebDriverHooks.cs",
            content: join(
                "using OpenQA.Selenium;",
                "using OpenQA.Selenium.Chrome;",
                "using Reqnroll;",
                "using Reqnroll.BoDi;",
                "",
                "namespace GeneratedTests.Hooks;",
                "",
                "[Binding]",
                "public class WebDriverHooks(IObjectContainer container)",
                "{",
                "    private IWebDriver? _driver;",
                "",
                "    [BeforeScenario]",
                "    public void StartDriver()",
                "    {",
                "        _driver = new ChromeDriver();",
                "        container.RegisterInstanceAs(_driver);",
                "    }",
                "",
                "    [AfterScenario]",
                "    public void StopDriver() => _driver?.Quit();",
                "}",
            ),
        },
    ],
    setup: {
        install: "dotnet add package Selenium.WebDriver && dotnet add package Selenium.Support && dotnet add package NUnit3TestAdapter",
        run: "dotnet test",
        bddInstall: "dotnet add package Reqnroll.NUnit && dotnet add package Selenium.WebDriver && dotnet add package Selenium.Support",
        bddRun: "dotnet test",
    },
};

// ---------- Selenium (TypeScript / JavaScript) ----------

const seJs =
    (d: string, sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const by = (xpath: string, name: string) => (sel.strategy === "test-id" ? `By.css(${str(tid(sel, name))})` : `By.xpath(${str(xpath)})`);
        switch (a.kind) {
            case "goto":
                return [`await ${d}.get(BASE_URL + ${str(a.path)});`];
            case "click":
                return [`await ${d}.wait(until.elementLocated(${by(clickXpath(a.name), a.name)}), 10_000).click();`];
            case "fill":
                return [`await ${d}.findElement(${by(labelXpath(a.field), a.field)}).sendKeys(${str(a.value)});`];
            case "expectText":
                return [`await ${d}.wait(until.elementLocated(By.xpath(${str(textXpath(a.text))})), 10_000);`];
            case "expectAlert":
                return [`await ${d}.wait(until.elementLocated(By.css("[role='alert']")), 10_000);`];
            case "expectUrl":
                return [`await ${d}.wait(until.urlMatches(/${urlRegex(a.path)}/), 10_000);`];
            default:
                return todo("//", a)!;
        }
    };

const seleniumJs = (ts: boolean): Dialect => {
    const ext = ts ? "ts" : "js";
    const baseUrl = `const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";`;
    return {
        spec: (spec, sel) => [
            {
                path: `test/${spec.slug}.spec.${ext}`,
                content: join(
                    `import { Builder, By, until${ts ? ", type WebDriver" : ""} } from "selenium-webdriver";`,
                    "",
                    baseUrl,
                    "",
                    `describe(${str(spec.name)}, function () {`,
                    "    this.timeout(60_000);",
                    `    let driver${ts ? ": WebDriver" : ""};`,
                    "",
                    "    beforeEach(async () => {",
                    `        driver = await new Builder().forBrowser("chrome").build();`,
                    "    });",
                    "",
                    "    afterEach(async () => {",
                    "        await driver.quit();",
                    "    });",
                    spec.tests.map((t) =>
                        join(
                            "",
                            `    it(${str(`${t.id}: ${t.title}${t.tags.length ? " " + t.tags.join(" ") : ""}`)}, async () => {`,
                            indent(specBody(t, "//", seJs("driver", sel)), 8),
                            "    });",
                        ),
                    ),
                    "});",
                ),
            },
        ],
        bdd: (f, sel) => [
            { path: `features/${f.slug}.feature`, content: f.gherkin },
            {
                path: `features/step_definitions/${f.slug}.steps.${ext}`,
                content: join(
                    `import { Given, When, Then } from "@cucumber/cucumber";`,
                    `import { By, until } from "selenium-webdriver";`,
                    ts && `import type { CustomWorld } from "../support/world";`,
                    "",
                    baseUrl,
                    "",
                    f.steps.map((s) =>
                        join(
                            `${s.keyword}(${str(cucumberExpr(s.text))}, async function (${ts ? "this: CustomWorld" : ""}) {`,
                            indent(seJs("this.driver", sel)(s.action), 4),
                            "});",
                        ),
                    ),
                ),
            },
            {
                path: `features/support/world.${ext}`,
                content: join(
                    `import { After, Before, World, setDefaultTimeout, setWorldConstructor } from "@cucumber/cucumber";`,
                    `import { Builder${ts ? ", type WebDriver" : ""} } from "selenium-webdriver";`,
                    "",
                    "setDefaultTimeout(60_000);",
                    "",
                    "export class CustomWorld extends World {",
                    ts ? "    driver!: WebDriver;" : "",
                    "}",
                    "setWorldConstructor(CustomWorld);",
                    "",
                    `Before(async function (${ts ? "this: CustomWorld" : ""}) {`,
                    `    this.driver = await new Builder().forBrowser("chrome").build();`,
                    "});",
                    "",
                    `After(async function (${ts ? "this: CustomWorld" : ""}) {`,
                    "    await this.driver?.quit();",
                    "});",
                ).replace(/\n\n\n/g, "\n\n"),
            },
        ],
        setup: {
            install: `npm i -D selenium-webdriver mocha${ts ? " @types/mocha @types/selenium-webdriver tsx" : ""}`,
            run: ts ? "npx mocha --import=tsx test/**/*.spec.ts" : "npx mocha test/**/*.spec.js",
            bddInstall: `npm i -D @cucumber/cucumber selenium-webdriver${ts ? " ts-node typescript @types/selenium-webdriver" : ""}`,
            bddRun: ts ? "npx cucumber-js --require-module ts-node/register --require 'features/**/*.ts'" : "npx cucumber-js",
        },
    };
};

// ---------- WebdriverIO ----------

const wdio =
    (sel: SelectorPrefs) =>
    (a: Action): string[] => {
        const el = (name: string) => (sel.strategy === "test-id" ? `$(${str(tid(sel, name))})` : `$(${str(`aria/${name}`)})`);
        switch (a.kind) {
            case "goto":
                return [`await browser.url(${str(a.path)});`];
            case "click":
                return [`await ${el(a.name)}.click();`];
            case "fill":
                return [`await ${el(a.field)}.setValue(${str(a.value)});`];
            case "expectText":
                return [`await expect($(${str(textXpath(a.text))})).toBeDisplayed();`];
            case "expectAlert":
                return [`await expect($('[role="alert"]')).toBeDisplayed();`];
            case "expectUrl":
                return [`await expect(browser).toHaveUrl(expect.stringContaining(${str(a.path)}));`];
            default:
                return todo("//", a)!;
        }
    };

const webdriverio = (ts: boolean): Dialect => {
    const ext = ts ? "ts" : "js";
    return {
        spec: (spec, sel) => [
            {
                path: `test/specs/${spec.slug}.e2e.${ext}`,
                content: join(
                    `import { browser, $, expect } from "@wdio/globals";`,
                    "",
                    `describe(${str(spec.name)}, () => {`,
                    spec.tests
                        .map((t) =>
                            join(
                                `    it(${str(`${t.id}: ${t.title}${t.tags.length ? " " + t.tags.join(" ") : ""}`)}, async () => {`,
                                indent(specBody(t, "//", wdio(sel)), 8),
                                "    });",
                            ),
                        )
                        .join("\n"),
                    "});",
                ),
            },
        ],
        bdd: (f, sel) => [
            { path: `features/${f.slug}.feature`, content: f.gherkin },
            {
                path: `features/step-definitions/${f.slug}.steps.${ext}`,
                content: join(
                    `import { Given, When, Then } from "@wdio/cucumber-framework";`,
                    `import { browser, $, expect } from "@wdio/globals";`,
                    "",
                    f.steps.map((s) => join(`${s.keyword}(${str(cucumberExpr(s.text))}, async () => {`, indent(wdio(sel)(s.action), 4), "});")),
                ),
            },
        ],
        setup: {
            install: "npm init wdio@latest . (choose Mocha)",
            run: "npx wdio run wdio.conf." + ext,
            bddInstall: "npm init wdio@latest . (choose Cucumber)",
            bddRun: "npx wdio run wdio.conf." + ext,
        },
    };
};

export const dialects = {
    "playwright:typescript": playwrightJs(true),
    "playwright:javascript": playwrightJs(false),
    "playwright:python": playwrightPython,
    "playwright:java": playwrightJava,
    "playwright:csharp": playwrightCsharp,
    "cypress:typescript": cypress(true),
    "cypress:javascript": cypress(false),
    "selenium:java": seleniumJava,
    "selenium:python": seleniumPython,
    "selenium:csharp": seleniumCsharp,
    "selenium:typescript": seleniumJs(true),
    "selenium:javascript": seleniumJs(false),
    "webdriverio:typescript": webdriverio(true),
    "webdriverio:javascript": webdriverio(false),
} satisfies Record<string, Dialect>;
