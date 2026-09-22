import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { Home } from "./routes/Home";
import { Services } from "./routes/Services";
import { Research } from "./routes/Research";
import { About } from "./routes/About";
import { Contact } from "./routes/Contact";
import { NotFound } from "./routes/NotFound";

/** App shell + routing. Each page composes reused, data-driven sections. */
function App() {
  return (
    <RootLayout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/research" element={<Research />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </RootLayout>
  );
}

export default App;
