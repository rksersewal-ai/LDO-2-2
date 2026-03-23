import { RouterProvider } from "react-router";
import { router } from "./src/routes";
import { AuthProvider } from "./src/lib/auth";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
