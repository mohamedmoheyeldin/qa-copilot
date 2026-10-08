import { useMemo } from "react";
import { ArrowRight, BarChart10, ClipboardCheck, Clock, Code02, FileCheck02, InfoCircle, PlayCircle, Stars02 } from "@untitledui/icons";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Tooltip as InfoTooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { HistoryList } from "@/components/qa/history-list";
import { PageHeader } from "@/components/qa/page-header";
import { history, useHistory } from "@/lib/history";
import { buildSampleHistory } from "@/lib/sample-history";
import { useSettings } from "@/lib/settings-context";
import { MINUTES_SAVED, computeStats } from "@/lib/stats";
import { cx } from "@/utils/cx";

const color = (name: string) => `var(--color-utility-${name})`;
const typeColors: Record<string, string> = {
    happy: color("brand-600"),
    negative: color("red-500"),
    edge: color("amber-500"),
    accessibility: color("blue-500"),
    api: color("green-500"),
};
const typeLabels: Record<string, string> = { happy: "Happy path", negative: "Negative", edge: "Edge", accessibility: "Accessibility", api: "API" };
const priorityColors = { high: color("red-500"), medium: color("amber-400"), low: color("neutral-400") };
const modeLabels = { demo: "Demo", byok: "Your API key", prompt: "Prompt only" };

const tools = [
    {
        icon: FileCheck02,
        title: "Bug report writer",
        body: "Rough notes, failed runs, and support tickets become clean reports for Jira, Azure DevOps, GitHub, or any tracker.",
        href: "/bug-report",
        cta: "Write a bug report",
    },
    {
        icon: Stars02,
        title: "Test case generator",
        body: "User stories become test cases plus Playwright, Cypress, Selenium, or WebdriverIO code, with optional Cucumber BDD.",
        href: "/test-cases",
        cta: "Generate test cases",
    },
];

const Card = ({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) => (
    <section className={cx("flex flex-col rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset", className)} aria-label={title}>
        <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-md font-semibold text-primary">{title}</h2>
            {action}
        </div>
        {children}
    </section>
);

const Kpi = ({
    icon: Icon,
    label,
    value,
    sub,
    info,
}: {
    icon: React.FC<{ className?: string }>;
    label: string;
    value: string;
    sub?: string;
    info?: string;
}) => (
    <div
        className="flex flex-col gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset"
        data-testid={`kpi-${label.toLowerCase().replace(/\W+/g, "-")}`}
    >
        <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-secondary">
                <Icon className="size-5 text-fg-brand-primary" />
            </div>
            {info && (
                <InfoTooltip title="How this is estimated" description={info} placement="top">
                    <TooltipTrigger
                        className="cursor-help rounded-md text-fg-quaternary outline-focus-ring focus-visible:outline-2"
                        aria-label={`How ${label} is estimated`}
                    >
                        <InfoCircle className="size-4" />
                    </TooltipTrigger>
                </InfoTooltip>
            )}
        </div>
        <div>
            <p className="text-sm font-medium text-tertiary">{label}</p>
            <p className="mt-1 text-display-sm font-semibold text-primary">{value}</p>
            {sub && <p className="mt-1 text-sm text-tertiary">{sub}</p>}
        </div>
    </div>
);

const Empty = ({ text }: { text: string }) => <p className="flex min-h-40 flex-1 items-center justify-center text-center text-sm text-tertiary">{text}</p>;

export const Dashboard = () => {
    const { settings } = useSettings();
    const entries = useHistory();
    const stats = useMemo(() => computeStats(entries), [entries]);
    const samples = entries.some((e) => e.sample);
    const hasActivity = stats.activity.some((d) => d.bugs || d.tests);

    if (entries.length === 0) {
        return (
            <>
                <PageHeader
                    title="Dashboard"
                    description="AI helpers for QA work that adapt to your tracker, your test framework, and your organization's AI rules."
                />
                <div className="grid max-w-5xl gap-6 md:grid-cols-2">
                    {tools.map((t) => (
                        <article key={t.href} className="flex flex-col rounded-xl p-6 ring-1 ring-secondary ring-inset">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-secondary">
                                <t.icon className="size-5 text-fg-brand-primary" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-primary">{t.title}</h2>
                            <p className="mt-1 flex-1 text-md text-tertiary">{t.body}</p>
                            <div className="mt-5">
                                <Button href={t.href} color="link-color" iconTrailing={ArrowRight}>
                                    {t.cta}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
                <section className="mt-6 flex max-w-5xl flex-col gap-4 rounded-xl bg-secondary p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary ring-1 ring-secondary">
                            <BarChart10 className="size-5 text-fg-quaternary" />
                        </div>
                        <div>
                            <h2 className="text-md font-semibold text-primary">Your dashboard fills in as you work</h2>
                            <p className="mt-1 max-w-xl text-sm text-tertiary">
                                Every report and test suite you generate is tracked here. Presenting? Load two weeks of sample activity to show the dashboard
                                right away.
                            </p>
                        </div>
                    </div>
                    <Button color="secondary" iconLeading={PlayCircle} onClick={() => history.addSamples(buildSampleHistory())} data-testid="load-sample-data">
                        Load sample data
                    </Button>
                </section>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Dashboard"
                description="What QA Copilot has produced for you, saved only in this browser."
                actions={
                    <>
                        <Button color="secondary" size="md" href="/bug-report" iconLeading={FileCheck02}>
                            New bug report
                        </Button>
                        <Button size="md" href="/test-cases" iconLeading={Stars02}>
                            New test cases
                        </Button>
                    </>
                }
            />

            {samples && (
                <div
                    className="mb-6 flex flex-col gap-3 rounded-lg bg-warning-primary p-3 text-sm text-primary ring-1 ring-secondary ring-inset sm:flex-row sm:items-center sm:justify-between"
                    role="status"
                >
                    <p className="flex items-start gap-2">
                        <InfoCircle className="mt-0.5 size-4 shrink-0 text-fg-warning-primary" />
                        You're viewing sample data alongside your own. Sample entries are fictional and marked in history.
                    </p>
                    <Button size="sm" color="secondary" onClick={() => history.removeSamples()}>
                        Remove sample data
                    </Button>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi icon={FileCheck02} label="Bug reports" value={String(stats.bugReports)} sub="written" />
                <Kpi
                    icon={ClipboardCheck}
                    label="Test cases"
                    value={String(stats.testCases)}
                    sub={`in ${stats.testSuites} ${stats.testSuites === 1 ? "suite" : "suites"}`}
                />
                <Kpi icon={Code02} label="Automation files" value={String(stats.automationFiles)} sub="specs, features, and step definitions" />
                <Kpi
                    icon={Clock}
                    label="Time saved"
                    value={`~${stats.hoursSaved} h`}
                    sub="estimated"
                    info={`About ${MINUTES_SAVED.bugReport} min per bug report, ${MINUTES_SAVED.testCase} min per test case, and ${MINUTES_SAVED.automationFile} min per automation file, compared to writing them by hand.`}
                />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <Card
                    title="Activity, last 14 days"
                    className="xl:col-span-2"
                    action={
                        <div className="flex gap-4 text-sm text-tertiary" aria-hidden="true">
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full" style={{ background: color("brand-600") }} />
                                Test suites
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full" style={{ background: color("brand-300") }} />
                                Bug reports
                            </span>
                        </div>
                    }
                >
                    {hasActivity ? (
                        <div
                            className="h-64"
                            role="img"
                            aria-label={`Bar chart of daily activity. ${stats.activity.reduce((n, d) => n + d.bugs, 0)} bug reports and ${stats.activity.reduce((n, d) => n + d.tests, 0)} test suites in 14 days.`}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.activity} margin={{ left: -20, right: 4, top: 4 }}>
                                    <CartesianGrid vertical={false} stroke={color("neutral-100")} />
                                    <XAxis
                                        dataKey="label"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12, fill: color("neutral-500") }}
                                        interval="preserveStartEnd"
                                        minTickGap={16}
                                    />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: color("neutral-500") }} />
                                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: color("neutral-50") }} />
                                    <Bar dataKey="tests" name="Test suites" stackId="a" fill={color("brand-600")} maxBarSize={28} animationDuration={500} />
                                    <Bar
                                        dataKey="bugs"
                                        name="Bug reports"
                                        stackId="a"
                                        fill={color("brand-300")}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={28}
                                        animationDuration={500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <Empty text="No activity in the last 14 days." />
                    )}
                </Card>

                <Card title="Test cases by type">
                    {stats.casesByType.length ? (
                        <div className="flex flex-1 flex-col items-center gap-4">
                            <div
                                className="h-44 w-full"
                                role="img"
                                aria-label={`Donut chart: ${stats.casesByType.map((t) => `${t.count} ${typeLabels[t.type]}`).join(", ")}`}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.casesByType}
                                            dataKey="count"
                                            nameKey="type"
                                            innerRadius="62%"
                                            outerRadius="100%"
                                            paddingAngle={2}
                                            stroke="none"
                                            animationDuration={500}
                                        >
                                            {stats.casesByType.map((t) => (
                                                <Cell key={t.type} fill={typeColors[t.type]} name={typeLabels[t.type]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent isPieChart />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                {stats.casesByType.map((t) => (
                                    <li key={t.type} className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2 text-tertiary">
                                            <span className="size-2 rounded-full" style={{ background: typeColors[t.type] }} />
                                            {typeLabels[t.type]}
                                        </span>
                                        <span className="font-medium text-primary">{t.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <Empty text="Generate test cases to see the mix." />
                    )}
                </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card title="Bug reports by severity">
                    {stats.bugsBySeverity.length ? (
                        <ul className="flex flex-col gap-3">
                            {stats.bugsBySeverity.map((b) => (
                                <Meter
                                    key={b.severity}
                                    label={b.severity}
                                    value={b.count}
                                    max={stats.bugReports}
                                    fill={color(
                                        /critical|blocker|highest/i.test(b.severity) ? "red-500" : /major|high/i.test(b.severity) ? "amber-500" : "neutral-400",
                                    )}
                                />
                            ))}
                        </ul>
                    ) : (
                        <Empty text="No bug reports yet." />
                    )}
                </Card>

                <Card title="Frameworks generated">
                    {stats.targets.length ? (
                        <ul className="flex flex-col gap-3">
                            {stats.targets.slice(0, 6).map((t) => (
                                <Meter key={t.label} label={t.label} value={t.count} max={stats.testSuites} fill={color("brand-500")} />
                            ))}
                        </ul>
                    ) : (
                        <Empty text="No automation code yet." />
                    )}
                </Card>

                <Card title="Test case priority">
                    {stats.testCases ? (
                        <>
                            <div
                                className="flex h-3 overflow-hidden rounded-full bg-tertiary"
                                role="img"
                                aria-label={stats.casesByPriority.map((p) => `${p.count} ${p.priority}`).join(", ")}
                            >
                                {stats.casesByPriority.map((p) => (
                                    <div key={p.priority} style={{ width: `${(p.count / stats.testCases) * 100}%`, background: priorityColors[p.priority] }} />
                                ))}
                            </div>
                            <ul className="mt-4 flex flex-col gap-2 text-sm">
                                {stats.casesByPriority.map((p) => (
                                    <li key={p.priority} className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-tertiary capitalize">
                                            <span className="size-2 rounded-full" style={{ background: priorityColors[p.priority] }} />
                                            {p.priority}
                                        </span>
                                        <span className="font-medium text-primary">
                                            {p.count} <span className="font-normal text-tertiary">({Math.round((p.count / stats.testCases) * 100)}%)</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                                {stats.modes.map((m) => (
                                    <Badge key={m.mode} size="sm" color="gray">
                                        {modeLabels[m.mode]}: {m.count}
                                    </Badge>
                                ))}
                            </div>
                        </>
                    ) : (
                        <Empty text="No test cases yet." />
                    )}
                </Card>
            </div>

            <div className="mt-6">
                <Card
                    title="Recent"
                    action={
                        <Button href="/history" color="link-color" size="sm" iconTrailing={ArrowRight}>
                            View all history
                        </Button>
                    }
                >
                    <HistoryList entries={entries.slice(0, 5)} allowDelete={false} />
                </Card>
            </div>

            <p className="mt-6 text-sm text-tertiary">
                AI mode: <span className="font-medium text-secondary">{modeLabels[settings.aiMode]}</span>.{" "}
                <Button href="/settings" color="link-color" size="sm">
                    Change
                </Button>
            </p>
        </>
    );
};

const Meter = ({ label, value, max, fill }: { label: string; value: number; max: number; fill: string }) => (
    <li>
        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-secondary">{label}</span>
            <span className="font-medium text-primary">{value}</span>
        </div>
        <div className="h-2 rounded-full bg-tertiary" role="presentation">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(4, (value / Math.max(1, max)) * 100)}%`, background: fill }} />
        </div>
    </li>
);
