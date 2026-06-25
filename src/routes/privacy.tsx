import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Clock, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme"

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <Clock className="size-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Timely</h1>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <h2 className="text-lg font-semibold">Privacy Policy</h2>
        <p className="text-sm text-muted-foreground">Last updated: June 25, 2026</p>

        <Section title="1. Information We Collect">
          <p>
            When you sign in with Google, we receive your <strong>name</strong>, <strong>email address</strong>, and{" "}
            <strong>profile picture</strong> from your Google account. We also request access to your{" "}
            <strong>Google Calendar</strong> to store and retrieve your time entries.
          </p>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul>
            <li>Authenticate you and maintain your session.</li>
            <li>Create and manage a dedicated Google Calendar to store your time-tracking entries.</li>
            <li>Display your profile information within the app.</li>
          </ul>
        </Section>

        <Section title="3. Data Storage">
          <p>
            Timely does <strong>not</strong> store your personal data on any server. Your authentication tokens are
            stored locally in your browser. Your time entries are stored directly in your Google Calendar account.
          </p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>Timely integrates with the following third-party services:</p>
          <ul>
            <li>
              <strong>Google OAuth 2.0</strong> — for authentication.
            </li>
            <li>
              <strong>Google Calendar API</strong> — for storing and retrieving time entries.
            </li>
          </ul>
          <p>
            Your use of these services is subject to{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google's Privacy Policy
            </a>
            .
          </p>
        </Section>

        <Section title="5. Data Sharing">
          <p>
            We do not sell, trade, or share your personal information with third parties. Your data is only accessed to
            provide the functionality described above.
          </p>
        </Section>

        <Section title="6. Data Deletion">
          <p>
            You can revoke Timely's access to your Google account at any time through your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google Account permissions
            </a>
            . Signing out of Timely clears all locally stored tokens. Your time entries remain in your Google Calendar
            until you delete them.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>Timely does not use cookies. Session data is stored in your browser's local storage.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this privacy policy from time to time. Changes will be reflected on this page with an updated
            revision date.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            If you have questions about this privacy policy, please contact us at{" "}
            <a href="mailto:marti.mayoral2@gmail.com" className="text-primary underline">
              marti.mayoral2@gmail.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="text-base font-medium">{title}</h3>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}
