import { Navigate, createBrowserRouter } from "react-router-dom";
import ChatScreen from "@/features/chat/screens/ChatScreen";
import OnboardingScreen from "@/features/onboarding/screens/OnboardingScreen";
import VaultScreen from "@/features/vault/screens/VaultScreen";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <OnboardingScreen />
  },
  {
    path: "/chat",
    element: <ChatScreen />
  },
  {
    path: "/vault",
    element: <VaultScreen />
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);
