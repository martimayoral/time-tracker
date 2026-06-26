import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Clock, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme"

export const Route = createFileRoute("/terms")({
  component: TermsOfUsePage,
})

function TermsOfUsePage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
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
        <h2 className="text-lg font-semibold">Terms of Use</h2>
        <p className="text-sm text-muted-foreground">Last updated: June 25, 2026</p>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using Timely, you agree to be bound by these Terms of Use. If you do not agree to these
            terms, please do not use the application.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            Timely is a time-tracking application that allows you to log and manage time entries using your Google
            Calendar. The service is provided "as is" and "as available."
          </p>
        </Section>

        <Section title="3. Google Account">
          <p>
            To use Timely, you must sign in with a Google account and grant access to your Google Calendar. You are
            responsible for maintaining the security of your Google account credentials. Timely will create a dedicated
            calendar in your Google account to store time entries.
          </p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose.</li>
            <li>Attempt to gain unauthorized access to the service or its related systems.</li>
            <li>Interfere with or disrupt the service or servers connected to it.</li>
            <li>Reverse engineer, decompile, or disassemble any part of the service.</li>
          </ul>
        </Section>

        <Section title="5. Intellectual Property">
          <p>
            All content, design, and code that make up Timely are the property of their respective owners. You may not
            copy, modify, or distribute any part of the application without prior written consent.
          </p>
        </Section>

        <Section title="6. Data and Privacy">
          <p>
            Your use of Timely is also governed by our{" "}
            <Link to="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
            . Timely stores authentication tokens locally in your browser and saves time entries directly to your Google
            Calendar. We do not maintain a separate database of your data.
          </p>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <p>
            Timely is provided on an "as is" and "as available" basis without warranties of any kind, whether express or
            implied, including but not limited to implied warranties of merchantability, fitness for a particular
            purpose, or non-infringement.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Timely and its developers shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of data, use, or profits, arising out
            of or related to your use of the service.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            You may stop using Timely at any time by signing out and revoking access through your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google Account permissions
            </a>
            . We reserve the right to suspend or terminate access to the service at any time without notice.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may update these Terms of Use from time to time. Changes will be reflected on this page with an updated
            revision date. Continued use of the service after changes constitutes acceptance of the revised terms.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            If you have questions about these terms, please contact us at{" "}
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
