import { RouterProvider } from "react-router-dom";
import { appRouter } from "./router";
import { Providers } from "./providers";

export default function App(): JSX.Element {
  return (
    <Providers>
      <RouterProvider router={appRouter} />
    </Providers>
  );
}
