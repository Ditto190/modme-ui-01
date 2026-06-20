import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import "./globals.css";

export const metadata = {
  title: "Generative UI Dashboard",
  description: "AI-powered generative UI dashboard with Next.js and CopilotKit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
          <CopilotPopup
            instructions="You are an AI assistant that helps users interact with the generative UI canvas. You can create, update, and manage UI components based on user requests."
            defaultOpen={false}
            labels={{
              title: "AI Assistant",
              initial: "Hi! How can I help you with the dashboard today?",
            }}
          />
        </CopilotKit>
      </body>
    </html>
  );
}
