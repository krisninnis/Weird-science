import { Navigate, createBrowserRouter } from "react-router-dom";

function OnboardingRoute(): JSX.Element {
  return <h1>Onboarding</h1>;
}

function ChatRoute(): JSX.Element {
  return <h1>Chat</h1>;
}

function VaultRoute(): JSX.Element {
  return <h1>Vault</h1>;
}

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <OnboardingRoute />
  },
  {
    path: "/chat",
    element: <ChatRoute />
  },
  {
    path: "/vault",
    element: <VaultRoute />
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);
