import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { Home } from "./routes/Home";

/**
 * App shell + routing. Only the temporary Home route is wired for now;
 * additional routes and page content are added in subsequent phases.
 */
function App() {
  return (
    <RootLayout>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </RootLayout>
  );
}

export default App;
