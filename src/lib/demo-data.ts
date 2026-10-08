import type { BugReport, TestGenResult } from "./types";

export const bugSamples = [
    {
        id: "manual",
        label: "Manual notes",
        source: "manual" as const,
        input: `checkout broken on safari again?? added 2 items, went to checkout, clicked pay, nothing happens. spinner forever. chrome works fine. staging. happened 3 times`,
    },
    {
        id: "playwright",
        label: "Playwright failure",
        source: "playwright" as const,
        input: `  1) [webkit] › checkout.spec.ts:42:7 › checkout › should open payment form

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    Call log:
      - waiting for getByRole('button', { name: 'Pay now' })
      - locator resolved to <button disabled class="btn-pay">Pay now</button>
      - element is not enabled

      42 |   await page.getByRole('button', { name: 'Pay now' }).click();`,
    },
];

/** Demo result for the "Playwright failure" sample. */
export const demoBugReport: BugReport = {
    title: "[Checkout] Pay now button stays disabled on Safari",
    summary:
        "On Safari (WebKit), the Pay now button on the checkout page never becomes enabled, so customers can't open the payment form. Chrome is not affected.",
    steps: ["Open the staging site in Safari 17", "Add any two items to the cart", "Go to Checkout", "Click Pay now"],
    expected: "The payment form opens.",
    actual: "The button stays disabled and a spinner keeps running. The automated test times out after 30 seconds.",
    environment: "staging, Safari 17 / WebKit",
    severity: "Critical",
    priority: "High",
    possibleCause: "Guess: the script that enables the button may rely on a browser API WebKit handles differently.",
    regressionTest: "Run the existing checkout spec on the WebKit project in CI and assert the Pay now button is enabled within 5 seconds.",
    customFields: { Component: "Checkout", Labels: "safari, payments" },
};

export const testSamples = [
    {
        id: "reset",
        label: "Password reset",
        input: `As a registered user, I want to reset my password from the login page so that I can get back into my account.

Acceptance criteria:
- "Forgot password" link on the login page
- User enters their email and receives a reset link
- Link expires after 30 minutes
- New password must be at least 12 characters`,
    },
    {
        id: "coupon",
        label: "Coupon code",
        input: `As a shopper, I can apply one coupon code at checkout. Valid codes reduce the total; invalid or expired codes show an error. Only one coupon per order.`,
    },
];

/** Demo result for the "Password reset" sample. Code is generated offline from these cases for any framework. */
export const demoTestResult: TestGenResult = {
    assumptions: [
        "The reset email is sent even if the address isn't registered, to avoid account enumeration.",
        "A test email inbox or API is available to read the reset link.",
    ],
    cases: [
        {
            id: "SHOP-TC-001",
            title: "Reset password with a registered email",
            type: "happy",
            priority: "high",
            preconditions: "A registered user exists",
            steps: ["Open the login page", "Click Forgot password", "Enter the registered email", "Submit the form"],
            expected: "A confirmation message is shown and a reset email is sent.",
        },
        {
            id: "SHOP-TC-002",
            title: "Set a new valid password from the reset link",
            type: "happy",
            priority: "high",
            preconditions: "A valid reset link was requested",
            steps: ["Open the reset link", "Enter a 12+ character password", "Confirm the password", "Submit"],
            expected: "Password is updated and the user can log in with it.",
        },
        {
            id: "SHOP-TC-003",
            title: "Reject a password shorter than 12 characters",
            type: "negative",
            priority: "high",
            steps: ["Open a valid reset link", "Enter an 11 character password", "Submit"],
            expected: "A validation error explains the 12 character minimum.",
        },
        {
            id: "SHOP-TC-004",
            title: "Expired reset link is rejected",
            type: "edge",
            priority: "high",
            preconditions: "A reset link older than 30 minutes",
            steps: ["Open the expired reset link"],
            expected: "An expired link message is shown with an option to request a new one.",
        },
        {
            id: "SHOP-TC-005",
            title: "Invalid email format shows an error",
            type: "negative",
            priority: "medium",
            steps: ["Open Forgot password", "Enter 'not-an-email'", "Submit"],
            expected: "An inline email format error is shown.",
        },
        {
            id: "SHOP-TC-006",
            title: "Reset link can only be used once",
            type: "edge",
            priority: "medium",
            preconditions: "A reset link already used to change the password",
            steps: ["Open the same reset link again"],
            expected: "The link is rejected as already used.",
        },
    ],
    files: [],
};

/** Demo result for the "Manual notes" sample. */
export const demoManualBugReport: BugReport = {
    title: "[Checkout] Payment spinner never finishes on Safari",
    summary:
        "On Safari, clicking Pay on the checkout page shows a spinner that never finishes, so the order can't be placed. Chrome works. Reproduced 3 times on staging.",
    steps: ["Open the staging site in Safari", "Add 2 items to the cart", "Go to Checkout", "Click Pay"],
    expected: "Payment is processed and the order confirmation page opens.",
    actual: "A loading spinner keeps running and nothing else happens.",
    environment: "staging, Safari (version not provided)",
    severity: "Critical",
    priority: "High",
    possibleCause: "Guess: a payment script or request may fail silently on Safari. Check the browser console and network tab.",
    regressionTest: "Run the checkout payment flow on WebKit in CI and assert the confirmation page loads within 10 seconds.",
    customFields: { Component: "Checkout", Labels: "safari, payments" },
};

/** Demo result for the "Coupon code" sample. */
export const demoCouponResult: TestGenResult = {
    assumptions: ["Coupon codes are case-insensitive.", "The discount is shown as its own line in the order summary."],
    cases: [
        {
            id: "SHOP-TC-101",
            title: "Apply a valid coupon code",
            type: "happy",
            priority: "high",
            preconditions: "The cart contains at least one item",
            steps: ["Open the checkout page", "Enter 'SAVE10' in the coupon code field", "Click Apply"],
            expected: 'A "Coupon applied" message is shown and the total is reduced.',
        },
        {
            id: "SHOP-TC-102",
            title: "Reject an invalid coupon code",
            type: "negative",
            priority: "high",
            steps: ["Open the checkout page", "Enter 'NOTACODE' in the coupon code field", "Click Apply"],
            expected: "An error says the coupon code is invalid and the total is unchanged.",
        },
        {
            id: "SHOP-TC-103",
            title: "Reject an expired coupon code",
            type: "negative",
            priority: "medium",
            steps: ["Open the checkout page", "Enter 'EXPIRED10' in the coupon code field", "Click Apply"],
            expected: "An error says the coupon has expired.",
        },
        {
            id: "SHOP-TC-104",
            title: "Only one coupon per order",
            type: "edge",
            priority: "medium",
            preconditions: "A valid coupon is already applied",
            steps: ["Enter 'WELCOME5' in the coupon code field", "Click Apply"],
            expected: "An error says only one coupon can be used per order.",
        },
        {
            id: "SHOP-TC-105",
            title: "Removing a coupon restores the total",
            type: "edge",
            priority: "low",
            preconditions: "A valid coupon is applied",
            steps: ["Click Remove coupon"],
            expected: "The discount line disappears and the original total is shown.",
        },
    ],
    files: [],
};

/**
 * Picks the demo result that matches the input, so each sample shows its own result in presentations.
 * Anything else falls back to the first sample (the mode notice explains this).
 */
export const pickDemo = <T>(input: string, samples: { input: string }[], results: T[]): T => {
    const i = samples.findIndex((s) => s.input.trim() === input.trim());
    return results[Math.max(0, i)];
};
